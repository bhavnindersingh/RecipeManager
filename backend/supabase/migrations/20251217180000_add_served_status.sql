-- Add 'served' status to order_items item_status
-- This allows tracking when items have been delivered to customers
-- Migration: 20251217180000_add_served_status.sql

-- Drop existing constraint
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_item_status_check;

-- Add new constraint with 'served' status
ALTER TABLE order_items
ADD CONSTRAINT order_items_item_status_check
CHECK (item_status IN ('pending', 'preparing', 'ready', 'served'));

-- Create index for served items for efficient queries
CREATE INDEX IF NOT EXISTS idx_order_items_served_status
ON order_items(item_status, order_id, created_at DESC) 
WHERE item_status IN ('ready', 'served');

-- Comment
COMMENT ON COLUMN order_items.item_status IS 'Status: pending (not started), preparing (being cooked), ready (ready to serve), served (delivered to customer)';
