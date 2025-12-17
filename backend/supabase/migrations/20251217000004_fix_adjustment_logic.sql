-- Fix Stock Adjustment Logic
-- Allow adjustments to support both positive and negative values

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_stock_after_transaction ON stock_transactions;
DROP FUNCTION IF EXISTS update_stock_after_transaction();

-- Create improved function to handle signed adjustments
CREATE OR REPLACE FUNCTION update_stock_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current quantity based on transaction type
    IF NEW.transaction_type = 'purchase' THEN
        -- Increase stock for purchases (always positive)
        UPDATE ingredient_stock
        SET current_quantity = current_quantity + ABS(NEW.quantity),
            last_updated = CURRENT_TIMESTAMP
        WHERE ingredient_id = NEW.ingredient_id;

    ELSIF NEW.transaction_type = 'adjustment' THEN
        -- Adjustment can be positive or negative (signed value)
        -- Positive adjustment: adds stock
        -- Negative adjustment: removes stock
        UPDATE ingredient_stock
        SET current_quantity = GREATEST(current_quantity + NEW.quantity, 0),
            last_updated = CURRENT_TIMESTAMP
        WHERE ingredient_id = NEW.ingredient_id;

    ELSIF NEW.transaction_type IN ('wastage', 'usage') THEN
        -- Decrease stock for wastage and usage (always subtract)
        UPDATE ingredient_stock
        SET current_quantity = GREATEST(current_quantity - ABS(NEW.quantity), 0),
            last_updated = CURRENT_TIMESTAMP
        WHERE ingredient_id = NEW.ingredient_id;
    END IF;

    -- Update average unit cost for purchases only
    IF NEW.transaction_type = 'purchase' AND NEW.unit_cost IS NOT NULL THEN
        UPDATE ingredient_stock
        SET unit_cost_avg = (
            SELECT AVG(unit_cost)
            FROM stock_transactions
            WHERE ingredient_id = NEW.ingredient_id
              AND transaction_type = 'purchase'
              AND unit_cost IS NOT NULL
        )
        WHERE ingredient_id = NEW.ingredient_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_stock_after_transaction
    AFTER INSERT ON stock_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_after_transaction();

-- Update comments
COMMENT ON FUNCTION update_stock_after_transaction() IS 'Updates stock levels after transaction. Adjustments support signed values (positive to add, negative to subtract).';

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Changes:
-- - Purchase: Always ADDS stock (uses ABS to ensure positive)
-- - Wastage/Usage: Always SUBTRACTS stock (uses ABS to ensure positive)
-- - Adjustment: Supports SIGNED values (positive adds, negative subtracts)
-- - All operations prevent negative stock with GREATEST(..., 0)
--
-- Examples:
-- - Purchase +10kg: adds 10kg
-- - Wastage 5kg: removes 5kg
-- - Adjustment +3kg: adds 3kg (stock count was higher than recorded)
-- - Adjustment -3kg: removes 3kg (stock count was lower than recorded)
