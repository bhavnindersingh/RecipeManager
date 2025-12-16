-- Update PIN Length to 6 Digits
-- Security improvement: Increase PIN length from 4 to 6 digits

-- ========================================
-- 1. UPDATE EXISTING USER PINS TO 6 DIGITS
-- ========================================
-- Update default user profiles with new 6-digit PINs
-- Admin: 000000, Server: 111111, Kitchen: 222222, Store Manager: 333333

UPDATE profiles
SET pin_hash = crypt('000000', gen_salt('bf'))
WHERE role = 'admin' AND name = 'Admin User';

UPDATE profiles
SET pin_hash = crypt('111111', gen_salt('bf'))
WHERE role = 'server' AND name = 'Server User';

UPDATE profiles
SET pin_hash = crypt('222222', gen_salt('bf'))
WHERE role = 'kitchen' AND name = 'Kitchen User';

UPDATE profiles
SET pin_hash = crypt('333333', gen_salt('bf'))
WHERE role = 'store_manager' AND name = 'Store Manager';

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Security improvements:
-- - PIN length increased from 4 to 6 digits
-- - Increased combinations from 10,000 to 1,000,000
-- - Better protection against brute force attacks
--
-- New default PINs:
-- Admin: 000000
-- Server: 111111
-- Kitchen: 222222
-- Store Manager: 333333
--
-- IMPORTANT: Change these default PINs in production!
-- Run: SELECT verify_pin('000000'); to test admin login
