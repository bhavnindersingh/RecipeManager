-- Table Layout & Payment System Migration
-- Adds visual table management and split payment functionality

-- ========================================
-- 1. TABLES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    table_number VARCHAR(10) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 4,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'occupied', 'billing', 'billed', 'reserved')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster status queries
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_is_active ON tables(is_active);

-- ========================================
-- 2. UPDATE ORDERS TABLE
-- ========================================
-- Add table and payment related fields
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bill_generated_at TIMESTAMP;

-- Index for table queries
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- ========================================
-- 3. PAYMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_reference VARCHAR(255),
    cash_received DECIMAL(10,2),
    change_amount DECIMAL(10,2),
    paid_by_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indexes for payment queries
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ========================================
-- 4. PAYMENT SPLITS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS payment_splits (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
    split_amount DECIMAL(10,2) NOT NULL CHECK (split_amount > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi')),
    paid_by_name VARCHAR(255),
    transaction_reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for split queries
CREATE INDEX IF NOT EXISTS idx_payment_splits_payment_id ON payment_splits(payment_id);

-- ========================================
-- 5. UPDATE TIMESTAMP TRIGGERS
-- ========================================
DROP TRIGGER IF EXISTS update_tables_updated_at ON tables;
CREATE TRIGGER update_tables_updated_at
    BEFORE UPDATE ON tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 7. RLS POLICIES
-- ========================================

-- Tables policies
DROP POLICY IF EXISTS "Enable read access for all users" ON tables;
CREATE POLICY "Enable read access for all users" ON tables
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON tables;
CREATE POLICY "Enable insert for all users" ON tables
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON tables;
CREATE POLICY "Enable update for all users" ON tables
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON tables;
CREATE POLICY "Enable delete for all users" ON tables
    FOR DELETE USING (true);

-- Payments policies
DROP POLICY IF EXISTS "Enable read access for all users" ON payments;
CREATE POLICY "Enable read access for all users" ON payments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON payments;
CREATE POLICY "Enable insert for all users" ON payments
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON payments;
CREATE POLICY "Enable update for all users" ON payments
    FOR UPDATE USING (true);

-- Payment splits policies
DROP POLICY IF EXISTS "Enable read access for all users" ON payment_splits;
CREATE POLICY "Enable read access for all users" ON payment_splits
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON payment_splits;
CREATE POLICY "Enable insert for all users" ON payment_splits
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON payment_splits;
CREATE POLICY "Enable update for all users" ON payment_splits
    FOR UPDATE USING (true);

-- ========================================
-- 8. SEED DEFAULT TABLES
-- ========================================
-- Create 20 tables (configurable layout)
INSERT INTO tables (table_number, capacity, position_x, position_y, status) VALUES
    ('1', 4, 0, 0, 'available'),
    ('2', 4, 1, 0, 'available'),
    ('3', 4, 2, 0, 'available'),
    ('4', 4, 3, 0, 'available'),
    ('5', 2, 0, 1, 'available'),
    ('6', 2, 1, 1, 'available'),
    ('7', 2, 2, 1, 'available'),
    ('8', 2, 3, 1, 'available'),
    ('9', 6, 0, 2, 'available'),
    ('10', 6, 1, 2, 'available'),
    ('11', 6, 2, 2, 'available'),
    ('12', 6, 3, 2, 'available'),
    ('13', 4, 0, 3, 'available'),
    ('14', 4, 1, 3, 'available'),
    ('15', 4, 2, 3, 'available'),
    ('16', 4, 3, 3, 'available'),
    ('17', 8, 0, 4, 'available'),
    ('18', 8, 1, 4, 'available'),
    ('19', 8, 2, 4, 'available'),
    ('20', 8, 3, 4, 'available')
ON CONFLICT (table_number) DO NOTHING;

-- ========================================
-- 9. HELPER FUNCTIONS
-- ========================================

-- Function to get table with current order
CREATE OR REPLACE FUNCTION get_table_with_order(table_id_param INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'table', row_to_json(t),
        'current_order', (
            SELECT row_to_json(o)
            FROM orders o
            WHERE o.table_id = t.id
            AND o.status NOT IN ('served', 'cancelled')
            ORDER BY o.created_at DESC
            LIMIT 1
        )
    ) INTO result
    FROM tables t
    WHERE t.id = table_id_param;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate order payment summary
CREATE OR REPLACE FUNCTION get_order_payment_summary(order_id_param INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_amount', o.total_amount,
        'paid_amount', COALESCE(o.paid_amount, 0),
        'remaining_amount', o.total_amount - COALESCE(o.paid_amount, 0),
        'payment_status', o.payment_status,
        'payments', (
            SELECT json_agg(row_to_json(p))
            FROM payments p
            WHERE p.order_id = o.id
            ORDER BY p.created_at DESC
        )
    ) INTO result
    FROM orders o
    WHERE o.id = order_id_param;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update table status based on orders
CREATE OR REPLACE FUNCTION update_table_status_from_order()
RETURNS TRIGGER AS $$
BEGIN
    -- When order is created or updated, update table status
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.table_id IS NOT NULL THEN
        IF NEW.status IN ('pending', 'cooking', 'ready') THEN
            -- Active order - mark table as occupied
            UPDATE tables SET status = 'occupied' WHERE id = NEW.table_id;
        ELSIF NEW.status = 'served' AND NEW.payment_status = 'paid' THEN
            -- Paid and served - mark as billed
            UPDATE tables SET status = 'billed' WHERE id = NEW.table_id;
        END IF;
    END IF;

    -- When order is deleted, check if table should be freed
    IF TG_OP = 'DELETE' AND OLD.table_id IS NOT NULL THEN
        -- Check if there are any other active orders on this table
        IF NOT EXISTS (
            SELECT 1 FROM orders
            WHERE table_id = OLD.table_id
            AND status NOT IN ('served', 'cancelled')
        ) THEN
            UPDATE tables SET status = 'available' WHERE id = OLD.table_id;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update table status
DROP TRIGGER IF EXISTS trigger_update_table_status ON orders;
CREATE TRIGGER trigger_update_table_status
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_table_status_from_order();

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Run: SELECT * FROM tables; to see all tables
-- Run: SELECT get_table_with_order(1); to test table query
-- Run: SELECT get_order_payment_summary(1); to test payment summary
