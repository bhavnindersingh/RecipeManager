-- Enable Realtime for POS/KDS System
-- This migration enables Supabase Realtime on critical tables
-- to ensure live updates across POS and KDS terminals

-- ========================================
-- 1. ENABLE REPLICA IDENTITY FULL
-- ========================================
-- This is required for Supabase Realtime to send old values
-- on UPDATE and DELETE operations

ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE tables REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;
ALTER TABLE payment_splits REPLICA IDENTITY FULL;

-- ========================================
-- 2. ENABLE REALTIME ON TABLES
-- ========================================
-- Enable realtime publication for these tables
-- This allows clients to subscribe to changes

-- Note: In Supabase, tables are automatically added to the
-- 'supabase_realtime' publication when realtime is enabled
-- via the dashboard or API. This migration ensures the tables
-- are properly configured.

-- For self-hosted or manual setup:
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
-- ALTER PUBLICATION supabase_realtime ADD TABLE tables;
-- ALTER PUBLICATION supabase_realtime ADD TABLE payments;
-- ALTER PUBLICATION supabase_realtime ADD TABLE payment_splits;

-- ========================================
-- 3. CREATE INDEXES FOR REALTIME PERFORMANCE
-- ========================================
-- These indexes help Realtime queries perform better

-- Order-related realtime queries
CREATE INDEX IF NOT EXISTS idx_orders_realtime_status
    ON orders(status, created_at DESC)
    WHERE status IN ('pending', 'cooking', 'ready');

CREATE INDEX IF NOT EXISTS idx_order_items_realtime
    ON order_items(order_id, item_status, created_at DESC);

-- Table-related realtime queries
CREATE INDEX IF NOT EXISTS idx_tables_realtime_active
    ON tables(status, is_active)
    WHERE is_active = true;

-- Payment-related realtime queries
CREATE INDEX IF NOT EXISTS idx_payments_realtime
    ON payments(order_id, payment_status, created_at DESC);

-- ========================================
-- 4. GRANT NECESSARY PERMISSIONS
-- ========================================
-- Ensure authenticated users can read these tables for realtime

GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON order_items TO authenticated;
GRANT SELECT ON tables TO authenticated;
GRANT SELECT ON payments TO authenticated;
GRANT SELECT ON payment_splits TO authenticated;

-- ========================================
-- 5. CREATE HELPER FUNCTION FOR REALTIME STATUS
-- ========================================
-- Function to check realtime status and configuration

CREATE OR REPLACE FUNCTION check_realtime_status()
RETURNS TABLE(
    table_name TEXT,
    replica_identity TEXT,
    has_primary_key BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.relname::TEXT as table_name,
        CASE c.relreplident
            WHEN 'd' THEN 'DEFAULT'
            WHEN 'n' THEN 'NOTHING'
            WHEN 'f' THEN 'FULL'
            WHEN 'i' THEN 'INDEX'
        END as replica_identity,
        EXISTS(
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = c.oid
            AND contype = 'p'
        ) as has_primary_key
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relname IN ('orders', 'order_items', 'tables', 'payments', 'payment_splits')
    ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Run: SELECT * FROM check_realtime_status(); to verify configuration
-- Expected: All tables should show 'FULL' replica identity and have primary keys

-- IMPORTANT: After running this migration, you must also enable
-- Realtime for these tables in the Supabase Dashboard:
-- 1. Go to Database > Replication
-- 2. Enable replication for: orders, order_items, tables, payments, payment_splits
-- 3. Or use the Supabase API/CLI to enable realtime programmatically
