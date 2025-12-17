-- Delete All Recipe Data
-- This migration clears all recipe data due to ingredient data reset
-- WARNING: This will DELETE ALL EXISTING RECIPE AND ORDER DATA

-- ========================================
-- DELETE ALL EXISTING DATA
-- ========================================

-- Step 1: Delete all order_items first (they reference recipes)
DELETE FROM order_items;

-- Step 2: Delete all orders (no longer have items)
DELETE FROM orders;

-- Step 3: Delete all recipe_ingredients (junction table)
DELETE FROM recipe_ingredients;

-- Step 4: Now safe to delete recipes
DELETE FROM recipes;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- All recipe and order data has been deleted
-- This is necessary after ingredient data was cleared
-- to prevent referential integrity issues
--
-- Deleted:
-- - All order_items
-- - All orders
-- - All recipe_ingredients
-- - All recipes
