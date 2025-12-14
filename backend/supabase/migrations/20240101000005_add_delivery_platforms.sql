-- Delivery Platforms Migration
-- Adds support for Swiggy, Zomato, and Takeaway order types

-- ========================================
-- 1. UPDATE ORDER_TYPE CONSTRAINT
-- ========================================
-- Drop existing constraint and add new order types
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check
  CHECK (order_type IN ('dine-in', 'swiggy', 'zomato', 'takeaway'));

-- ========================================
-- 2. ADD DELIVERY PLATFORM FIELDS
-- ========================================
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_platform_order_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Index for platform order ID lookup
CREATE INDEX IF NOT EXISTS idx_orders_platform_order_id ON orders(delivery_platform_order_id);

-- ========================================
-- 3. HELPER FUNCTION - GET ORDERS BY TYPE
-- ========================================
CREATE OR REPLACE FUNCTION get_orders_by_type(type_param VARCHAR)
RETURNS TABLE(
    id INTEGER,
    order_number VARCHAR,
    order_type VARCHAR,
    status VARCHAR,
    total_amount DECIMAL,
    customer_name VARCHAR,
    customer_phone VARCHAR,
    delivery_platform_order_id VARCHAR,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.order_number,
        o.order_type,
        o.status,
        o.total_amount,
        o.customer_name,
        o.customer_phone,
        o.delivery_platform_order_id,
        o.created_at
    FROM orders o
    WHERE o.order_type = type_param
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. HELPER FUNCTION - GET ORDER STATS BY TYPE
-- ========================================
CREATE OR REPLACE FUNCTION get_order_stats_by_type()
RETURNS TABLE(
    order_type VARCHAR,
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
        o.order_type,
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE o.status = 'pending')::BIGINT,
        COUNT(*) FILTER (WHERE o.status = 'cooking')::BIGINT,
        COUNT(*) FILTER (WHERE o.status = 'ready')::BIGINT,
        COUNT(*) FILTER (WHERE o.status = 'served')::BIGINT,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'served'), 0)::DECIMAL
    FROM orders o
    GROUP BY o.order_type;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Test queries:
-- SELECT * FROM get_orders_by_type('swiggy');
-- SELECT * FROM get_orders_by_type('zomato');
-- SELECT * FROM get_orders_by_type('takeaway');
-- SELECT * FROM get_order_stats_by_type();
