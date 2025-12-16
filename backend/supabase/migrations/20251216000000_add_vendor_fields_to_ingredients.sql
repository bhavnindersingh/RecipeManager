-- Add vendor fields to ingredients table
-- Allows tracking vendor/supplier information for each ingredient

-- 1. Add vendor_name column to ingredients
ALTER TABLE ingredients
ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);

-- 2. Add vendor_phone column to ingredients
ALTER TABLE ingredients
ADD COLUMN IF NOT EXISTS vendor_phone VARCHAR(20);

-- 3. Add indexes for searching by vendor
CREATE INDEX IF NOT EXISTS idx_ingredients_vendor_name ON ingredients(vendor_name);
CREATE INDEX IF NOT EXISTS idx_ingredients_vendor_phone ON ingredients(vendor_phone);

-- 4. Add helpful comments
COMMENT ON COLUMN ingredients.vendor_name IS 'Current vendor or supplier name for this ingredient (optional)';
COMMENT ON COLUMN ingredients.vendor_phone IS 'Vendor contact phone number (optional)';
