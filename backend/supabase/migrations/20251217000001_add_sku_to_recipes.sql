-- Add SKU (Stock Keeping Unit) System to Recipes
-- Auto-generates category-based SKU codes:
-- Food: FHB 001, FHB 002 (Food Home Branch)
-- Drinks: DHB 001, DHB 002 (Drinks Home Branch)
-- Patisserie: PHB 001, Condiments: CHB 001, Cakes: KHB 001
-- Components: OHB 001, Research: RHB 001

-- ========================================
-- 1. ADD SKU COLUMN TO RECIPES TABLE
-- ========================================
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS sku VARCHAR(20) UNIQUE;

-- Add index for faster SKU lookups
CREATE INDEX IF NOT EXISTS idx_recipes_sku ON recipes(sku);

-- Add comment to document the field
COMMENT ON COLUMN recipes.sku IS 'Auto-generated Stock Keeping Unit code based on category (FHB for Food, DHB for Drinks, etc.)';

-- ========================================
-- 2. SKU GENERATION FUNCTION
-- ========================================
-- Generates SKU based on recipe category
-- Uses first letter of category + HB (Home Branch) + sequential number

-- Function to generate SKU based on category
CREATE OR REPLACE FUNCTION generate_recipe_sku(recipe_category TEXT)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  prefix TEXT;
  new_sku TEXT;
BEGIN
  -- Determine prefix based on category (First Letter + HB for Home Branch)
  CASE recipe_category
    WHEN 'Food' THEN prefix := 'FHB';
    WHEN 'Drinks' THEN prefix := 'DHB';
    WHEN 'Patisserie' THEN prefix := 'PHB';
    WHEN 'Condiments' THEN prefix := 'CHB';
    WHEN 'Cakes' THEN prefix := 'KHB'; -- Using K to avoid conflict with Condiments
    WHEN 'Components' THEN prefix := 'OHB'; -- Using O for cOmponents
    WHEN 'Research' THEN prefix := 'RHB';
    ELSE prefix := 'XHB'; -- Unknown category
  END CASE;

  -- Get the next number for this prefix
  SELECT COALESCE(MAX(
    CASE 
      WHEN sku ~ ('^' || prefix || ' [0-9]+$') 
      THEN CAST(SUBSTRING(sku FROM LENGTH(prefix) + 2) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM recipes
  WHERE sku LIKE prefix || '%';

  -- Format: PREFIX NNN (e.g., FHB 001)
  new_sku := prefix || ' ' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN new_sku;
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
        NEW.sku := generate_recipe_sku(COALESCE(NEW.category, 'Food'));
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
-- 6. HELPER FUNCTION - GET NEXT SKU PREVIEW
-- ========================================
-- Returns what the next SKU will be for a given category (without incrementing)
CREATE OR REPLACE FUNCTION preview_next_sku(recipe_category TEXT)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  prefix TEXT;
  new_sku TEXT;
BEGIN
  -- Determine prefix based on category (First Letter + HB for Home Branch)
  CASE recipe_category
    WHEN 'Food' THEN prefix := 'FHB';
    WHEN 'Drinks' THEN prefix := 'DHB';
    WHEN 'Patisserie' THEN prefix := 'PHB';
    WHEN 'Condiments' THEN prefix := 'CHB';
    WHEN 'Cakes' THEN prefix := 'KHB';
    WHEN 'Components' THEN prefix := 'OHB';
    WHEN 'Research' THEN prefix := 'RHB';
    ELSE prefix := 'XHB'; -- Unknown category
  END CASE;

  -- Get the next number for this prefix
  SELECT COALESCE(MAX(
    CASE 
      WHEN sku ~ ('^' || prefix || ' [0-9]+$') 
      THEN CAST(SUBSTRING(sku FROM LENGTH(prefix) + 2) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM recipes
  WHERE sku LIKE prefix || '%';

  -- Format: PREFIX NNN (e.g., FHB 001)
  new_sku := prefix || ' ' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN new_sku;
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
