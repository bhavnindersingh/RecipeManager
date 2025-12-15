-- Add minimum_stock column to ingredients table
-- This simplifies stock management by keeping min stock with ingredient definition

-- 1. Add minimum_stock column to ingredients
ALTER TABLE ingredients
ADD COLUMN IF NOT EXISTS minimum_stock DECIMAL(10,2) DEFAULT 10 NOT NULL;

-- 2. Migrate existing minimum stock data from stock_settings to ingredients
-- (If stock_settings has min_stock_level data, copy it over)
UPDATE ingredients i
SET minimum_stock = COALESCE(
  (SELECT min_stock_level
   FROM stock_settings
   WHERE ingredient_id = i.id
   LIMIT 1),
  10  -- Default to 10 if no setting exists
)
WHERE EXISTS (SELECT 1 FROM stock_settings WHERE ingredient_id = i.id);

-- 3. Update ingredient_stock initialization trigger to use ingredients.minimum_stock
-- Replace the old trigger function
CREATE OR REPLACE FUNCTION initialize_stock_for_new_ingredient()
RETURNS TRIGGER AS $$
BEGIN
    -- Create stock record with minimum from ingredients table
    INSERT INTO ingredient_stock (ingredient_id, current_quantity, minimum_quantity)
    VALUES (NEW.id, 0, NEW.minimum_stock)
    ON CONFLICT (ingredient_id) DO NOTHING;

    -- Create stock settings (keep for reorder_quantity and storage_location)
    INSERT INTO stock_settings (ingredient_id, min_stock_level, reorder_quantity)
    VALUES (NEW.id, NEW.minimum_stock, 50)
    ON CONFLICT (ingredient_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Add trigger to sync minimum_stock when ingredient is updated
CREATE OR REPLACE FUNCTION sync_minimum_stock_on_ingredient_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update ingredient_stock.minimum_quantity when ingredients.minimum_stock changes
    IF OLD.minimum_stock IS DISTINCT FROM NEW.minimum_stock THEN
        UPDATE ingredient_stock
        SET minimum_quantity = NEW.minimum_stock
        WHERE ingredient_id = NEW.id;

        -- Also update stock_settings.min_stock_level for consistency
        UPDATE stock_settings
        SET min_stock_level = NEW.minimum_stock
        WHERE ingredient_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger on ingredients table
DROP TRIGGER IF EXISTS trigger_sync_minimum_stock ON ingredients;
CREATE TRIGGER trigger_sync_minimum_stock
    AFTER UPDATE ON ingredients
    FOR EACH ROW
    WHEN (OLD.minimum_stock IS DISTINCT FROM NEW.minimum_stock)
    EXECUTE FUNCTION sync_minimum_stock_on_ingredient_update();

-- 6. Sync existing ingredient_stock records with ingredients.minimum_stock
UPDATE ingredient_stock ist
SET minimum_quantity = i.minimum_stock
FROM ingredients i
WHERE ist.ingredient_id = i.id;

-- 7. Add helpful comment
COMMENT ON COLUMN ingredients.minimum_stock IS 'Minimum stock level threshold - alerts when current stock falls below this value';

-- 8. Add index for quick filtering by minimum stock
CREATE INDEX IF NOT EXISTS idx_ingredients_minimum_stock ON ingredients(minimum_stock);
