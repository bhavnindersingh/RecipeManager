-- Add Store Manager Role Migration
-- Updates existing profiles table to include 'store_manager' role

-- ========================================
-- 1. DROP OLD CHECK CONSTRAINT
-- ========================================
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ========================================
-- 2. ADD NEW CHECK CONSTRAINT WITH STORE_MANAGER
-- ========================================
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'server', 'kitchen', 'store_manager'));

-- ========================================
-- 3. INSERT STORE MANAGER USER
-- ========================================
-- Insert Store Manager profile with PIN 3333
INSERT INTO profiles (name, role, pin_hash, is_active) VALUES
    ('Store Manager', 'store_manager', crypt('3333', gen_salt('bf')), true)
ON CONFLICT DO NOTHING;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Run: SELECT * FROM profiles; to verify all 4 users exist
-- Run: SELECT verify_pin('3333'); to test store manager login
