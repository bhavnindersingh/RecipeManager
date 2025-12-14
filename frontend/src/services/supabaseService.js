import { supabase } from '../config/supabase';

export const recipeService = {
  // Get all recipes with ingredients
  async getAllRecipes() {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          quantity,
          ingredient:ingredients (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to match old API structure
    return data.map(recipe => ({
      ...recipe,
      ingredients: recipe.recipe_ingredients.map(ri => ({
        ...ri.ingredient,
        quantity: ri.quantity
      }))
    }));
  },

  // Create a new recipe
  async createRecipe(recipeData) {
    const { ingredients, recipe_ingredients, image, image_preview, delivery_image, delivery_image_preview, id, created_at, updated_at, ...recipeFields } = recipeData;

    // Insert recipe (only DB fields)
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert([recipeFields])
      .select()
      .single();

    if (recipeError) {
      console.error('Supabase error creating recipe:', recipeError);
      throw recipeError;
    }

    // Insert recipe ingredients
    if (ingredients && ingredients.length > 0) {
      const recipeIngredients = ingredients.map(ing => ({
        recipe_id: recipe.id,
        ingredient_id: ing.id,
        quantity: ing.quantity
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(recipeIngredients);

      if (ingredientsError) throw ingredientsError;
    }

    return this.getRecipeById(recipe.id);
  },

  // Get recipe by ID
  async getRecipeById(id) {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          quantity,
          ingredient:ingredients (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      ...data,
      ingredients: data.recipe_ingredients.map(ri => ({
        ...ri.ingredient,
        quantity: ri.quantity
      }))
    };
  },

  // Update recipe
  async updateRecipe(id, recipeData) {
    const { ingredients, recipe_ingredients, image, image_preview, delivery_image, delivery_image_preview, id: recipeId, created_at, updated_at, ...recipeFields } = recipeData;

    // Update recipe (only DB fields)
    const { error: updateError } = await supabase
      .from('recipes')
      .update(recipeFields)
      .eq('id', id);

    if (updateError) throw updateError;

    // Delete old recipe ingredients
    const { error: deleteError } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', id);

    if (deleteError) throw deleteError;

    // Insert new recipe ingredients
    if (ingredients && ingredients.length > 0) {
      const recipeIngredients = ingredients.map(ing => ({
        recipe_id: id,
        ingredient_id: ing.id,
        quantity: ing.quantity
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(recipeIngredients);

      if (ingredientsError) throw ingredientsError;
    }

    return this.getRecipeById(id);
  },

  // Delete recipe
  async deleteRecipe(id) {
    // Get recipe to check for images
    const { data: recipe } = await supabase
      .from('recipes')
      .select('image_url, delivery_image_url')
      .eq('id', id)
      .single();

    // Delete images from storage if they exist
    if (recipe) {
      const filesToDelete = [];
      if (recipe.image_url) filesToDelete.push(recipe.image_url);
      if (recipe.delivery_image_url) filesToDelete.push(recipe.delivery_image_url);

      if (filesToDelete.length > 0) {
        await this.deleteImages(filesToDelete);
      }
    }

    // Delete recipe (cascade will delete recipe_ingredients)
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // Upload image to Supabase Storage
  async uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `recipe-images/${fileName}`;

    const { error } = await supabase.storage
      .from('recipe-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  // Delete images from storage
  async deleteImages(urls) {
    const paths = urls.map(url => {
      const parts = url.split('/recipe-images/');
      return parts.length > 1 ? `recipe-images/${parts[1]}` : null;
    }).filter(Boolean);

    if (paths.length > 0) {
      const { error } = await supabase.storage
        .from('recipe-images')
        .remove(paths);

      if (error) console.error('Error deleting images:', error);
    }
  }
};

export const ingredientService = {
  // Get all ingredients
  async getAllIngredients() {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  },

  // Create ingredient
  async createIngredient(ingredient) {
    const { data, error } = await supabase
      .from('ingredients')
      .insert([ingredient])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update ingredient
  async updateIngredient(id, ingredient) {
    const { data, error } = await supabase
      .from('ingredients')
      .update(ingredient)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete ingredient
  async deleteIngredient(id) {
    // Check if ingredient is used in any recipe
    const { data: usage } = await supabase
      .from('recipe_ingredients')
      .select('recipe_id')
      .eq('ingredient_id', id)
      .limit(1);

    if (usage && usage.length > 0) {
      throw new Error('Ingredient in use. This ingredient cannot be deleted as it is being used in one or more recipes.');
    }

    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};

const services = {
  recipes: recipeService,
  ingredients: ingredientService
};

export default services;
