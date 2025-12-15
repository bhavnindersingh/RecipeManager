-- Add recipe type field to distinguish between production and general recipes
-- Production recipes appear in POS, general recipes are for internal use only

-- Add is_production_recipe column to recipes table
ALTER TABLE recipes
ADD COLUMN is_production_recipe BOOLEAN DEFAULT true;

-- Update existing recipes to be production recipes by default
-- This maintains backward compatibility - all current recipes remain in POS
UPDATE recipes SET is_production_recipe = true WHERE is_production_recipe IS NULL;

-- Create index for better performance when filtering in POS
CREATE INDEX IF NOT EXISTS idx_recipes_is_production ON recipes(is_production_recipe);

-- Add comment to document the field
COMMENT ON COLUMN recipes.is_production_recipe IS 'Indicates if recipe is available in POS for customer orders. False for internal/prep recipes.';
