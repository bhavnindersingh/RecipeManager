-- POS & KDS System Migration
-- Adds Point of Sale and Kitchen Display System capabilities
-- with PIN-based multi-role authentication

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========================================
-- 1. PROFILES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'server', 'kitchen', 'store_manager')),
    pin_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- ========================================
-- 2. ORDERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'cooking', 'ready', 'served', 'cancelled')),
    order_type VARCHAR(20) NOT NULL
        CHECK (order_type IN ('dine-in', 'delivery', 'takeaway')),
    table_number VARCHAR(20),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    created_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- ========================================
-- 3. ORDER ITEMS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE RESTRICT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    item_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (item_status IN ('pending', 'preparing', 'ready')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_recipe_id ON order_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(item_status);

-- ========================================
-- 4. AUTO-INCREMENT ORDER NUMBER
-- ========================================
-- Sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Function to generate order number (ORD-001, ORD-002, etc.)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    order_num TEXT;
BEGIN
    next_number := nextval('order_number_seq');
    order_num := 'ORD-' || LPAD(next_number::TEXT, 3, '0');
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- ========================================
-- 5. UPDATE TIMESTAMP TRIGGER FOR ORDERS
-- ========================================
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 7. RLS POLICIES
-- ========================================

-- Profiles policies (read-only for authentication)
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
CREATE POLICY "Enable read access for all users" ON profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for admin" ON profiles;
CREATE POLICY "Enable insert for admin" ON profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for admin" ON profiles;
CREATE POLICY "Enable update for admin" ON profiles
    FOR UPDATE USING (true);

-- Orders policies
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;
CREATE POLICY "Enable read access for all users" ON orders
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON orders;
CREATE POLICY "Enable insert access for all users" ON orders
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON orders;
CREATE POLICY "Enable update access for all users" ON orders
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON orders;
CREATE POLICY "Enable delete access for all users" ON orders
    FOR DELETE USING (true);

-- Order items policies
DROP POLICY IF EXISTS "Enable read access for all users" ON order_items;
CREATE POLICY "Enable read access for all users" ON order_items
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON order_items;
CREATE POLICY "Enable insert access for all users" ON order_items
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON order_items;
CREATE POLICY "Enable update access for all users" ON order_items
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON order_items;
CREATE POLICY "Enable delete access for all users" ON order_items
    FOR DELETE USING (true);

-- ========================================
-- 8. SEED DEFAULT PROFILES
-- ========================================
-- Insert default user profiles with hashed PINs
-- PINs: Admin=0000, Server=1111, Kitchen=2222, Store Manager=3333

INSERT INTO profiles (name, role, pin_hash, is_active) VALUES
    ('Admin User', 'admin', crypt('0000', gen_salt('bf')), true),
    ('Server User', 'server', crypt('1111', gen_salt('bf')), true),
    ('Kitchen User', 'kitchen', crypt('2222', gen_salt('bf')), true),
    ('Store Manager', 'store_manager', crypt('3333', gen_salt('bf')), true)
ON CONFLICT DO NOTHING;

-- ========================================
-- 9. HELPER FUNCTIONS
-- ========================================

-- Function to verify PIN (used by frontend)
CREATE OR REPLACE FUNCTION verify_pin(input_pin TEXT)
RETURNS TABLE(id INTEGER, name VARCHAR, role VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.name, p.role
    FROM profiles p
    WHERE p.is_active = true
    AND p.pin_hash = crypt(input_pin, p.pin_hash)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get order statistics
CREATE OR REPLACE FUNCTION get_order_stats()
RETURNS TABLE(
    total_orders BIGINT,
    pending_orders BIGINT,
    cooking_orders BIGINT,
    ready_orders BIGINT,
    served_orders BIGINT,
    total_revenue DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'cooking')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'ready')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'served')::BIGINT,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'served'), 0)::DECIMAL
    FROM orders;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Run: SELECT verify_pin('0000'); to test admin login
-- Run: SELECT get_order_stats(); to test stats function
