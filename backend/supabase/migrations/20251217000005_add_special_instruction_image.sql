-- Add special instruction image column to recipes table
-- This allows storing visual guides for complex preparation steps

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS special_instruction_image TEXT;

COMMENT ON COLUMN recipes.special_instruction_image IS 'URL or path to special instruction image for visual preparation guides';
