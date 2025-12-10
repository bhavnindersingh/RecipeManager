-- Recipe Manager Database Schema for Supabase
-- Initial migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Uncategorized',
    preparation_steps TEXT,
    cooking_method TEXT,
    plating_instructions TEXT,
    chefs_notes TEXT,
    print_menu_ready BOOLEAN DEFAULT false,
    qr_menu_ready BOOLEAN DEFAULT false,
    website_menu_ready BOOLEAN DEFAULT false,
    available_for_delivery BOOLEAN DEFAULT false,
    delivery_image_url TEXT,
    image_url TEXT,
    selling_price DECIMAL(10,2) DEFAULT 0,
    sales INTEGER DEFAULT 0,
    overhead DECIMAL(5,2) DEFAULT 10,
    total_cost DECIMAL(10,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    profit DECIMAL(10,2) DEFAULT 0,
    markup_factor DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Recipe_ingredients junction table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (recipe_id, ingredient_id)
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- 5. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create trigger for recipes table
DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable Row Level Security (RLS)
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- 8. Create policies for public access
-- Note: For production, you should implement proper authentication and restrict these policies

-- Ingredients policies
DROP POLICY IF EXISTS "Enable read access for all users" ON ingredients;
CREATE POLICY "Enable read access for all users" ON ingredients
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON ingredients;
CREATE POLICY "Enable insert access for all users" ON ingredients
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON ingredients;
CREATE POLICY "Enable update access for all users" ON ingredients
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON ingredients;
CREATE POLICY "Enable delete access for all users" ON ingredients
    FOR DELETE USING (true);

-- Recipes policies
DROP POLICY IF EXISTS "Enable read access for all users" ON recipes;
CREATE POLICY "Enable read access for all users" ON recipes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON recipes;
CREATE POLICY "Enable insert access for all users" ON recipes
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON recipes;
CREATE POLICY "Enable update access for all users" ON recipes
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON recipes;
CREATE POLICY "Enable delete access for all users" ON recipes
    FOR DELETE USING (true);

-- Recipe ingredients policies
DROP POLICY IF EXISTS "Enable read access for all users" ON recipe_ingredients;
CREATE POLICY "Enable read access for all users" ON recipe_ingredients
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON recipe_ingredients;
CREATE POLICY "Enable insert access for all users" ON recipe_ingredients
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON recipe_ingredients;
CREATE POLICY "Enable update access for all users" ON recipe_ingredients
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON recipe_ingredients;
CREATE POLICY "Enable delete access for all users" ON recipe_ingredients
    FOR DELETE USING (true);
