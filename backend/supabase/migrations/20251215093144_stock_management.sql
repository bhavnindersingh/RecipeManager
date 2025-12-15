-- Stock Management System
-- Migration for stock tracking, transactions, and inventory management

-- 1. Create stock_transactions table to track all stock movements
CREATE TABLE IF NOT EXISTS stock_transactions (
    id SERIAL PRIMARY KEY,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'adjustment', 'wastage', 'usage')),
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2),
    reference_no VARCHAR(100),
    notes TEXT,
    created_by INTEGER REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create ingredient_stock table to maintain current stock levels
CREATE TABLE IF NOT EXISTS ingredient_stock (
    ingredient_id INTEGER PRIMARY KEY REFERENCES ingredients(id) ON DELETE CASCADE,
    current_quantity DECIMAL(10,2) DEFAULT 0 NOT NULL,
    minimum_quantity DECIMAL(10,2) DEFAULT 0,
    unit_cost_avg DECIMAL(10,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create stock_settings table for ingredient-specific settings
CREATE TABLE IF NOT EXISTS stock_settings (
    ingredient_id INTEGER PRIMARY KEY REFERENCES ingredients(id) ON DELETE CASCADE,
    min_stock_level DECIMAL(10,2) DEFAULT 10,
    reorder_quantity DECIMAL(10,2) DEFAULT 50,
    storage_location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_transactions_ingredient ON stock_transactions(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_type ON stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_at ON stock_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingredient_stock_quantity ON ingredient_stock(current_quantity);

-- 5. Initialize ingredient_stock for all existing ingredients
INSERT INTO ingredient_stock (ingredient_id, current_quantity, minimum_quantity)
SELECT id, 0, 10
FROM ingredients
ON CONFLICT (ingredient_id) DO NOTHING;

-- 6. Initialize stock_settings for all existing ingredients
INSERT INTO stock_settings (ingredient_id, min_stock_level, reorder_quantity)
SELECT id, 10, 50
FROM ingredients
ON CONFLICT (ingredient_id) DO NOTHING;

-- 7. Create function to update stock levels after transaction
CREATE OR REPLACE FUNCTION update_stock_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current quantity based on transaction type
    IF NEW.transaction_type IN ('purchase', 'adjustment') THEN
        -- Increase stock for purchases and positive adjustments
        UPDATE ingredient_stock
        SET current_quantity = current_quantity + NEW.quantity,
            last_updated = CURRENT_TIMESTAMP
        WHERE ingredient_id = NEW.ingredient_id;
    ELSIF NEW.transaction_type IN ('wastage', 'usage') THEN
        -- Decrease stock for wastage and usage
        UPDATE ingredient_stock
        SET current_quantity = GREATEST(current_quantity - NEW.quantity, 0),
            last_updated = CURRENT_TIMESTAMP
        WHERE ingredient_id = NEW.ingredient_id;
    END IF;

    -- Update average unit cost for purchases
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

-- 8. Create trigger for stock updates
DROP TRIGGER IF EXISTS trigger_update_stock_after_transaction ON stock_transactions;
CREATE TRIGGER trigger_update_stock_after_transaction
    AFTER INSERT ON stock_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_after_transaction();

-- 9. Create function to initialize stock for new ingredients
CREATE OR REPLACE FUNCTION initialize_stock_for_new_ingredient()
RETURNS TRIGGER AS $$
BEGIN
    -- Create stock record
    INSERT INTO ingredient_stock (ingredient_id, current_quantity, minimum_quantity)
    VALUES (NEW.id, 0, 10)
    ON CONFLICT (ingredient_id) DO NOTHING;

    -- Create stock settings
    INSERT INTO stock_settings (ingredient_id, min_stock_level, reorder_quantity)
    VALUES (NEW.id, 10, 50)
    ON CONFLICT (ingredient_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger for new ingredient initialization
DROP TRIGGER IF EXISTS trigger_initialize_stock_for_new_ingredient ON ingredients;
CREATE TRIGGER trigger_initialize_stock_for_new_ingredient
    AFTER INSERT ON ingredients
    FOR EACH ROW
    EXECUTE FUNCTION initialize_stock_for_new_ingredient();

-- 11. Create function to update stock_settings updated_at
CREATE OR REPLACE FUNCTION update_stock_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger for stock_settings updates
DROP TRIGGER IF EXISTS trigger_update_stock_settings_updated_at ON stock_settings;
CREATE TRIGGER trigger_update_stock_settings_updated_at
    BEFORE UPDATE ON stock_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_settings_updated_at();

-- 13. Enable Row Level Security
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_settings ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies for stock_transactions
DROP POLICY IF EXISTS "Enable read access for all users" ON stock_transactions;
CREATE POLICY "Enable read access for all users" ON stock_transactions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON stock_transactions;
CREATE POLICY "Enable insert access for all users" ON stock_transactions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON stock_transactions;
CREATE POLICY "Enable update access for all users" ON stock_transactions
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON stock_transactions;
CREATE POLICY "Enable delete access for all users" ON stock_transactions
    FOR DELETE USING (true);

-- 15. Create RLS policies for ingredient_stock
DROP POLICY IF EXISTS "Enable read access for all users" ON ingredient_stock;
CREATE POLICY "Enable read access for all users" ON ingredient_stock
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON ingredient_stock;
CREATE POLICY "Enable insert access for all users" ON ingredient_stock
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON ingredient_stock;
CREATE POLICY "Enable update access for all users" ON ingredient_stock
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON ingredient_stock;
CREATE POLICY "Enable delete access for all users" ON ingredient_stock
    FOR DELETE USING (true);

-- 16. Create RLS policies for stock_settings
DROP POLICY IF EXISTS "Enable read access for all users" ON stock_settings;
CREATE POLICY "Enable read access for all users" ON stock_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON stock_settings;
CREATE POLICY "Enable insert access for all users" ON stock_settings
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON stock_settings;
CREATE POLICY "Enable update access for all users" ON stock_settings
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON stock_settings;
CREATE POLICY "Enable delete access for all users" ON stock_settings
    FOR DELETE USING (true);

-- 17. Add helpful comments
COMMENT ON TABLE stock_transactions IS 'Tracks all stock movements including purchases, adjustments, wastage, and usage';
COMMENT ON TABLE ingredient_stock IS 'Maintains current stock levels for each ingredient';
COMMENT ON TABLE stock_settings IS 'Stores ingredient-specific settings like minimum levels and reorder quantities';
COMMENT ON COLUMN stock_transactions.transaction_type IS 'Type of stock movement: purchase, adjustment, wastage, or usage';
COMMENT ON COLUMN ingredient_stock.current_quantity IS 'Current available quantity in stock';
COMMENT ON COLUMN ingredient_stock.unit_cost_avg IS 'Average purchase cost per unit (auto-calculated from purchases)';
