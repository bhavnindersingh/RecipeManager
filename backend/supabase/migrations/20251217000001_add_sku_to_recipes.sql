-- Add SKU (Stock Keeping Unit) System to Recipes
-- Auto-generates category-based SKU codes:
-- Food items: FMB 001, FMB 002, etc. (Food Main Branch)
-- Drink items: DMB 001, DMB 002, etc. (Drink Main Branch)

-- ========================================
-- 1. ADD SKU COLUMN TO RECIPES TABLE
-- ========================================
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS sku VARCHAR(20) UNIQUE;

-- Add index for faster SKU lookups
CREATE INDEX IF NOT EXISTS idx_recipes_sku ON recipes(sku);

-- Add comment to document the field
COMMENT ON COLUMN recipes.sku IS 'Auto-generated Stock Keeping Unit code based on category (FMB for food, DMB for drinks)';

-- ========================================
-- 2. CREATE SEQUENCES FOR SKU GENERATION
-- ========================================
-- Sequence for Food items (FMB)
CREATE SEQUENCE IF NOT EXISTS recipe_sku_food_seq START 1;

-- Sequence for Drink items (DMB)
CREATE SEQUENCE IF NOT EXISTS recipe_sku_drink_seq START 1;

-- ========================================
-- 3. SKU GENERATION FUNCTION
-- ========================================
-- Generates SKU based on recipe category
-- Food categories: Main Course, Appetizers, Soups, Salads, Sides, Desserts → FMB
-- Drink categories: Beverages, Juices, Smoothies, Cocktails, Hot Drinks → DMB
-- Other categories: GEN (General)

CREATE OR REPLACE FUNCTION generate_recipe_sku(recipe_category TEXT)
RETURNS TEXT AS $$
DECLARE
    sku_prefix TEXT;
    sku_number INTEGER;
    generated_sku TEXT;
    food_categories TEXT[] := ARRAY['Main Course', 'Appetizers', 'Soups', 'Salads', 'Sides', 'Desserts', 'Bakery', 'Snacks'];
    drink_categories TEXT[] := ARRAY['Beverages', 'Juices', 'Smoothies', 'Cocktails', 'Mocktails', 'Hot Drinks', 'Cold Drinks', 'Shakes'];
BEGIN
    -- Determine SKU prefix based on category
    IF recipe_category = ANY(food_categories) THEN
        sku_prefix := 'FMB';
        sku_number := nextval('recipe_sku_food_seq');
    ELSIF recipe_category = ANY(drink_categories) THEN
        sku_prefix := 'DMB';
        sku_number := nextval('recipe_sku_drink_seq');
    ELSE
        sku_prefix := 'GEN';
        sku_number := nextval('recipe_sku_food_seq'); -- Use food sequence for general items
    END IF;

    -- Format SKU: PREFIX 001, PREFIX 002, etc.
    generated_sku := sku_prefix || ' ' || LPAD(sku_number::TEXT, 3, '0');

    RETURN generated_sku;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. AUTO-GENERATE SKU ON INSERT
-- ========================================
-- Trigger function to auto-generate SKU if not provided
CREATE OR REPLACE FUNCTION auto_generate_recipe_sku()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate SKU if it's not already provided
    IF NEW.sku IS NULL OR NEW.sku = '' THEN
        NEW.sku := generate_recipe_sku(COALESCE(NEW.category, 'Uncategorized'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating SKU
DROP TRIGGER IF EXISTS trigger_auto_generate_recipe_sku ON recipes;
CREATE TRIGGER trigger_auto_generate_recipe_sku
    BEFORE INSERT ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_recipe_sku();

-- ========================================
-- 5. BACKFILL SKUs FOR EXISTING RECIPES
-- ========================================
-- Generate SKUs for existing recipes that don't have one
DO $$
DECLARE
    recipe_record RECORD;
BEGIN
    FOR recipe_record IN
        SELECT id, category FROM recipes WHERE sku IS NULL OR sku = ''
    LOOP
        UPDATE recipes
        SET sku = generate_recipe_sku(COALESCE(recipe_record.category, 'Uncategorized'))
        WHERE id = recipe_record.id;
    END LOOP;
END $$;

-- ========================================
-- 6. POS SALES DATA AGGREGATION FUNCTION
-- ========================================
-- Returns actual sales data from POS orders for MRP calculations
CREATE OR REPLACE FUNCTION get_recipe_sales_data(target_recipe_id INTEGER)
RETURNS TABLE(
    total_units_sold BIGINT,
    total_revenue DECIMAL,
    average_sale_price DECIMAL,
    order_count BIGINT,
    last_sold_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(oi.quantity), 0)::BIGINT as total_units_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0)::DECIMAL as total_revenue,
        CASE
            WHEN SUM(oi.quantity) > 0 THEN
                (SUM(oi.quantity * oi.unit_price) / SUM(oi.quantity))::DECIMAL
            ELSE
                0::DECIMAL
        END as average_sale_price,
        COUNT(DISTINCT o.id)::BIGINT as order_count,
        MAX(o.created_at) as last_sold_at
    FROM order_items oi
    INNER JOIN orders o ON oi.order_id = o.id
    WHERE oi.recipe_id = target_recipe_id
    AND o.status IN ('served', 'ready'); -- Only count completed/ready orders
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. HELPER FUNCTION - GET NEXT SKU PREVIEW
-- ========================================
-- Returns what the next SKU will be for a given category (without incrementing)
CREATE OR REPLACE FUNCTION preview_next_sku(recipe_category TEXT)
RETURNS TEXT AS $$
DECLARE
    sku_prefix TEXT;
    sku_number INTEGER;
    food_categories TEXT[] := ARRAY['Main Course', 'Appetizers', 'Soups', 'Salads', 'Sides', 'Desserts', 'Bakery', 'Snacks'];
    drink_categories TEXT[] := ARRAY['Beverages', 'Juices', 'Smoothies', 'Cocktails', 'Mocktails', 'Hot Drinks', 'Cold Drinks', 'Shakes'];
BEGIN
    -- Determine SKU prefix based on category
    IF recipe_category = ANY(food_categories) THEN
        sku_prefix := 'FMB';
        sku_number := (SELECT last_value FROM recipe_sku_food_seq);
    ELSIF recipe_category = ANY(drink_categories) THEN
        sku_prefix := 'DMB';
        sku_number := (SELECT last_value FROM recipe_sku_drink_seq);
    ELSE
        sku_prefix := 'GEN';
        sku_number := (SELECT last_value FROM recipe_sku_food_seq);
    END IF;

    -- Format next SKU (current value + 1)
    RETURN sku_prefix || ' ' || LPAD((sku_number + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Test SKU generation:
--   SELECT generate_recipe_sku('Main Course'); -- Should return FMB 001, FMB 002, etc.
--   SELECT generate_recipe_sku('Beverages');   -- Should return DMB 001, DMB 002, etc.
--   SELECT preview_next_sku('Main Course');    -- Preview next SKU without incrementing
--
-- Test sales data:
--   SELECT * FROM get_recipe_sales_data(1);    -- Get sales data for recipe ID 1
