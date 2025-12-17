-- Update Ingredient Categories
-- This migration standardizes ingredient categories to 14 predefined values
-- WARNING: This will DELETE ALL EXISTING INGREDIENT DATA

-- ========================================
-- 1. DELETE ALL EXISTING INGREDIENT DATA
-- ========================================
-- Cascading deletes will automatically remove:
-- - recipe_ingredients
-- - stock_transactions
-- - ingredient_stock
-- - stock_settings

DELETE FROM ingredients;

-- ========================================
-- 2. ADD CATEGORY CONSTRAINT
-- ========================================
-- Drop existing constraint if it exists
ALTER TABLE ingredients
DROP CONSTRAINT IF EXISTS ingredients_category_check;

-- Add new constraint with 14 predefined categories
ALTER TABLE ingredients
ADD CONSTRAINT ingredients_category_check
CHECK (category IN (
    'Fresh Vegetables',
    'Fresh Fruits',
    'Specialty & Gourmet Pantry',
    'Nuts, Seeds & Superfoods',
    'Dry Groceries & Staples',
    'Vegan Dairy & Alternatives',
    'Standard Dairy',
    'Spices & Seasonings',
    'Sauces, Oils & Vinegars',
    'Cafe Beverages',
    'Frozen Foods',
    'Packaging & Disposables',
    'Housekeeping & Cleaning',
    'Miscellaneous'
));

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- All ingredient data has been deleted
-- Category field now restricted to 14 predefined values
-- 
-- Categories:
-- 1. Fresh Vegetables
-- 2. Fresh Fruits
-- 3. Specialty & Gourmet Pantry
-- 4. Nuts, Seeds & Superfoods
-- 5. Dry Groceries & Staples
-- 6. Vegan Dairy & Alternatives
-- 7. Standard Dairy
-- 8. Spices & Seasonings
-- 9. Sauces, Oils & Vinegars
-- 10. Cafe Beverages
-- 11. Frozen Foods
-- 12. Packaging & Disposables
-- 13. Housekeeping & Cleaning
-- 14. Miscellaneous
