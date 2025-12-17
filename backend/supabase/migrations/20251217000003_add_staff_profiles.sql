-- Add Staff Profiles
-- Creates profiles for Conscious Cafe staff members with secure 6-digit PINs

-- ========================================
-- ADD STAFF PROFILES
-- ========================================

-- 1. Kirtana - Admin (PIN: 287453)
INSERT INTO profiles (name, role, pin_hash, is_active)
VALUES ('Kirtana', 'admin', crypt('287453', gen_salt('bf')), true);

-- 2. Zulfi - Admin (PIN: 914628)
INSERT INTO profiles (name, role, pin_hash, is_active)
VALUES ('Zulfi', 'admin', crypt('914628', gen_salt('bf')), true);

-- 3. Bhuvi - Admin (PIN: 635742)
INSERT INTO profiles (name, role, pin_hash, is_active)
VALUES ('Bhuvi', 'admin', crypt('635742', gen_salt('bf')), true);

-- 4. Inderjit - Store Manager (PIN: 482519)
INSERT INTO profiles (name, role, pin_hash, is_active)
VALUES ('Inderjit', 'store_manager', crypt('482519', gen_salt('bf')), true);

-- 5. Deepankar - Kitchen (PIN: 756183)
INSERT INTO profiles (name, role, pin_hash, is_active)
VALUES ('Deepankar', 'kitchen', crypt('756183', gen_salt('bf')), true);

-- 6. Jalan - Server (PIN: 329854)
INSERT INTO profiles (name, role, pin_hash, is_active)
VALUES ('Jalan', 'server', crypt('329854', gen_salt('bf')), true);

-- 7. Sajani - Kitchen (PIN: 871265)
INSERT INTO profiles (name, role, pin_hash, is_active)
VALUES ('Sajani', 'kitchen', crypt('871265', gen_salt('bf')), true);

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Added 7 staff profiles:
-- Kirtana (Admin) - PIN: 287453
-- Zulfi (Admin) - PIN: 914628
-- Bhuvi (Admin) - PIN: 635742
-- Inderjit (Store Manager) - PIN: 482519
-- Deepankar (Kitchen) - PIN: 756183
-- Jalan (Server) - PIN: 329854
-- Sajani (Kitchen) - PIN: 871265
--
-- Test login with: SELECT verify_pin('287453');
