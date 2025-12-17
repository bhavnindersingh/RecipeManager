import React, { useState, useEffect } from 'react';
import { RECIPE_CATEGORIES } from '../constants/categories';
import '../styles/NewRecipeForm.css';
import { useNavigate } from 'react-router-dom';
import { recipeService } from '../services/supabaseService';
import { createPortal } from 'react-dom';

// Empty recipe template
const emptyRecipe = {
  id: null,
  name: '',
  category: 'Food',
  preparation_steps: '',
  cooking_method: '',
  plating_instructions: '',
  chefs_notes: '',
  selling_price: '',
  sales: '',
  overhead: '10',
  total_cost: '0',
  profit_margin: '0',
  revenue: '0',
  profit: '0',
  markup_factor: '0',
  print_menu_ready: false,
  qr_menu_ready: false,
  website_menu_ready: false,
  available_for_delivery: false,
  is_production_recipe: true,
  delivery_image_url: '',
  special_instruction_image: null,
  ingredients: [],
  created_at: null,
  updated_at: null,
  image: null,
  image_preview: null,
  image_url: null,
  delivery_image: null,
  delivery_image_preview: null
};

// Image preview component
const ImagePreview = ({ url, onRemove, alt, isViewMode }) => {
  const [showEnlarged, setShowEnlarged] = useState(false);

  if (!url) return null;

  // Handle blob URLs, full URLs, data URLs, and relative paths correctly
  const imageUrl = url.startsWith('blob:') || url.startsWith('http') || url.startsWith('data:') ? url :
    `https://storage.googleapis.com/conscious-cafe-recipe-2024-uploads/${url}`;

  const handleImageClick = (e) => {
    e.stopPropagation();
    setShowEnlarged(true);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowEnlarged(false);
    }
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    setShowEnlarged(false);
  };

  const EnlargedView = () => (
    <div className="enlarged-image-overlay" onClick={handleOverlayClick}>
      <div className="enlarged-image-container">
        <img src={imageUrl} alt={alt} loading="eager" />
      </div>
      <button
        className="close-enlarged-btn"
        onClick={handleCloseClick}
        aria-label="Close enlarged view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  );

  return (
    <div className="image-preview-container">
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        style={{ cursor: 'pointer' }}
        onClick={handleImageClick}
        onError={(e) => {
          // Only try alternative URL if it's not a blob URL
          if (!url.startsWith('blob:') && imageUrl.includes('conscious-cafe-recipe-2024-uploads')) {
            const assetUrl = `https://storage.googleapis.com/recipe.consciouscafe.in/${url.split('/').pop()}`;
            e.target.src = assetUrl;
          } else {
            e.target.src = '/placeholder-recipe.png';
          }
        }}
      />
      <div className="image-actions">
        <button
          type="button"
          className="image-action-btn fullscreen"
          onClick={handleImageClick}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
          </svg>
        </button>
        {!isViewMode && (
          <button
            type="button"
            className="image-action-btn remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>
      {showEnlarged && createPortal(<EnlargedView />, document.body)}
    </div>
  );
};

const RecipeForm = ({ ingredients, onSubmit, editingRecipe, onCancel, mode = 'create', initialRecipe, viewingRecipe, recipes }) => {
  const [error, setError] = useState({ message: '', type: '' });
  const [isDuplicateName, setIsDuplicateName] = useState(false);
  const navigate = useNavigate();
  const isViewMode = mode === 'view';

  // Update the initial recipe state
  const [recipe, setRecipe] = useState(() => {
    if (mode === 'view' && viewingRecipe) {
      return {
        ...viewingRecipe,
        image_preview: viewingRecipe.image_url,
        delivery_image_preview: viewingRecipe.delivery_image_url,
        ingredients: viewingRecipe.ingredients || []
      };
    }
    if (editingRecipe) {
      return {
        ...editingRecipe,
        image_preview: editingRecipe.image_url,
        delivery_image_preview: editingRecipe.delivery_image_url,
        ingredients: editingRecipe.ingredients || []
      };
    }
    return { ...emptyRecipe, ingredients: [] };
  });

  // Update recipe when viewingRecipe changes
  useEffect(() => {
    if (mode === 'view' && viewingRecipe) {
      setRecipe({
        ...viewingRecipe,
        image_preview: viewingRecipe.image_url,
        delivery_image_preview: viewingRecipe.delivery_image_url,
        ingredients: viewingRecipe.ingredients || [],
        // Ensure all required fields have default values
        total_cost: viewingRecipe.total_cost || '0',
        revenue: viewingRecipe.revenue || '0',
        profit_margin: viewingRecipe.profit_margin || '0',
        markup_factor: viewingRecipe.markup_factor || '0',
        overhead: viewingRecipe.overhead || '0',
        selling_price: viewingRecipe.selling_price || '0',
        sales: viewingRecipe.sales || '0'
      });
    }
  }, [mode, viewingRecipe]);

  // Recipe state monitoring for view mode
  useEffect(() => {
    // Recipe data is ready in view mode
  }, [recipe, mode]);

  // SKU preview state
  const [skuPreview, setSkuPreview] = useState('');

  // Sales data from POS
  const [salesData, setSalesData] = useState({
    total_units_sold: 0,
    total_revenue: 0,
    average_sale_price: 0,
    order_count: 0,
    last_sold_at: null
  });
  const [loadingSalesData, setLoadingSalesData] = useState(false);

  const [showImageModal, setShowImageModal] = useState(false);
  const [showDeliveryImageModal, setShowDeliveryImageModal] = useState(false);
  const [prevMode, setPrevMode] = useState(mode);

  // Track mode changes and clear data when switching from edit to create
  useEffect(() => {
    if (prevMode === 'edit' && mode === 'create') {
      // Clear form data from session storage
      sessionStorage.removeItem('recipeFormData');
      // Reset the recipe state to empty
      setRecipe(emptyRecipe);
      // Reset selected ingredient
      setSelectedIngredient({
        id: '',
        name: '',
        unit: '',
        cost_per_unit: '0',
        quantity: '0'
      });
      // Clear any error messages
      setError({ message: '', type: '' });
    }
    setPrevMode(mode);
  }, [mode, prevMode]);

  // Save form data to sessionStorage when it changes in create mode
  useEffect(() => {
    if (mode === 'create' && !recipe.id) {
      sessionStorage.setItem('recipeFormData', JSON.stringify(recipe));
    }
  }, [recipe, mode]);

  const [selectedIngredient, setSelectedIngredient] = useState({
    id: '',
    name: '',
    unit: '',
    cost_per_unit: '0',
    quantity: '0'
  });
  const [editingIngredientIndex, setEditingIngredientIndex] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState('');

  // Track ingredients length changes
  const ingredientsLength = (recipe.ingredients || []).length;

  useEffect(() => {
    if (ingredientsLength) {
      setSelectedIngredient({
        id: '',
        name: '',
        unit: '',
        cost_per_unit: '0',
        quantity: '0'
      });
    }
  }, [ingredientsLength]);

  // Fetch SKU preview when category changes (for new recipes)
  useEffect(() => {
    const fetchSkuPreview = async () => {
      if (mode === 'create' && recipe.category) {
        try {
          const nextSku = await recipeService.previewNextSku(recipe.category);
          setSkuPreview(nextSku);
        } catch (error) {
          console.error('Error fetching SKU preview:', error);
          setSkuPreview('FHB 001'); // Fallback
        }
      } else if (mode !== 'create' && recipe.sku) {
        // For edit/view mode, show existing SKU
        setSkuPreview(recipe.sku);
      }
    };

    fetchSkuPreview();
  }, [recipe.category, mode, recipe.sku]);

  // Fetch sales data from POS when viewing/editing existing recipe
  useEffect(() => {
    const fetchSalesData = async () => {
      if (recipe.id && mode !== 'create') {
        setLoadingSalesData(true);
        try {
          const data = await recipeService.getRecipeSalesData(recipe.id);
          setSalesData(data);
          // Update recipe sales field with actual POS data
          setRecipe(prev => ({
            ...prev,
            sales: data.total_units_sold || 0
          }));
        } catch (error) {
          console.error('Error fetching sales data:', error);
        } finally {
          setLoadingSalesData(false);
        }
      }
    };

    fetchSalesData();
  }, [recipe.id, mode]);

  // Update preview when editing existing recipe
  useEffect(() => {
    if (editingRecipe) {
      setRecipe(prev => ({
        ...editingRecipe,
        image_preview: editingRecipe.image_url,
        delivery_image_preview: editingRecipe.delivery_image_url,
        ingredients: editingRecipe.ingredients || []
      }));
    }
  }, [editingRecipe]);

  const [imageFile, setImageFile] = useState(null);
  const [deliveryImageFile, setDeliveryImageFile] = useState(null);
  const [specialInstructionImageFile, setSpecialInstructionImageFile] = useState(null);

  const handleImageChange = async (e, type = 'image') => {
    const file = e.target.files[0];
    if (file) {
      try {
        // Create a temporary preview URL for the selected file
        const previewUrl = URL.createObjectURL(file);
        setRecipe(prev => ({
          ...prev,
          [type]: file,
          [`${type}_preview`]: previewUrl,
          // Keep the URL field empty until upload completes
          [`${type}_url`]: null
        }));

        if (type === 'image') {
          setImageFile(file);
        } else {
          setDeliveryImageFile(file);
        }
      } catch (error) {
        console.error('Error handling image change:', error);
      }
    }
  };

  const handleImageUpload = async (file, fieldName) => {
    if (!file) {
      return null;
    }

    try {
      const url = await recipeService.uploadImage(file);
      return url;
    } catch (error) {
      console.error('Error uploading image:', error);
      setError({ message: error.message, type: 'error' });
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Validate required fields
      if (mode === 'create') {
        if (!recipe.name?.trim()) {
          setError({ message: 'Recipe name is required', type: 'error' });
          return;
        }
        // Check for duplicate names only in create mode
        if (recipes) {
          const isDuplicate = recipes.some(
            existingRecipe =>
              existingRecipe.name.toLowerCase().trim() === recipe.name.toLowerCase().trim() &&
              existingRecipe.id !== recipe.id
          );
          if (isDuplicate) {
            setError({ message: 'A recipe with this name already exists', type: 'error' });
            return;
          }
        }
      }

      if (!recipe.category?.trim()) {
        setError({ message: 'Category is required', type: 'error' });
        return;
      }

      // Ensure ingredients array exists and has items
      const currentIngredients = recipe.ingredients || [];
      if (currentIngredients.length === 0) {
        setError({ message: 'At least one ingredient is required', type: 'error' });
        return;
      }

      // Handle image uploads only if there are new files
      let imageUrl = recipe.image_url;
      let deliveryImageUrl = recipe.delivery_image_url;
      let specialInstructionImage = recipe.special_instruction_image;

      if (imageFile) {
        imageUrl = await handleImageUpload(imageFile, 'image');
        if (!imageUrl) return;
      }

      if (deliveryImageFile) {
        deliveryImageUrl = await handleImageUpload(deliveryImageFile, 'deliveryImage');
        if (!deliveryImageUrl) return;
      }

      if (specialInstructionImageFile) {
        specialInstructionImage = await handleImageUpload(specialInstructionImageFile, 'specialInstructionImage');
        if (!specialInstructionImage) return;
      }

      // Prepare recipe data - build explicitly to avoid sending non-DB fields
      const recipeData = {
        name: recipe.name,
        category: recipe.category.trim(),
        preparation_steps: recipe.preparation_steps || '',
        cooking_method: recipe.cooking_method || '',
        plating_instructions: recipe.plating_instructions || '',
        chefs_notes: recipe.chefs_notes || '',
        selling_price: Number(recipe.selling_price) || 0,
        sales: Number(recipe.sales) || 0,
        overhead: Math.min(Number(recipe.overhead) || 0, 999.99),
        total_cost: Number(recipe.total_cost) || 0,
        profit_margin: Math.min(Number(recipe.profit_margin) || 0, 999.99),
        revenue: Number(recipe.revenue) || 0,
        profit: Number(recipe.profit) || 0,
        markup_factor: Math.min(Number(recipe.markup_factor) || 0, 999.99),
        print_menu_ready: Boolean(recipe.print_menu_ready),
        qr_menu_ready: Boolean(recipe.qr_menu_ready),
        website_menu_ready: Boolean(recipe.website_menu_ready),
        available_for_delivery: Boolean(recipe.available_for_delivery),
        is_production_recipe: recipe.is_production_recipe !== false,
        image_url: imageUrl,
        delivery_image_url: deliveryImageUrl,
        special_instruction_image: specialInstructionImage,
        ingredients: currentIngredients.map(ing => ({
          id: Number(ing.id),
          quantity: Number(ing.quantity)
        }))
      };

      // Call onSubmit with the prepared data
      if (onSubmit) {
        await onSubmit(recipeData, recipe.id);
      }

      // Show success message
      setError({ message: `Recipe ${mode === 'edit' ? 'updated' : 'created'} successfully`, type: 'success' });

      // Navigate back to manager after success
      navigate('/manager');
    } catch (err) {
      console.error('Error saving recipe:', err);
      setError({ message: err.message, type: 'error' });
    }
  };

  const handleRemoveImage = () => {
    if (isViewMode) return;
    setImageFile(null);
    setRecipe(prev => ({
      ...prev,
      image: null,
      image_preview: null,
      image_url: null
    }));
  };

  // Handle delivery image change
  const handleDeliveryImageChange = (e) => {
    handleImageChange(e, 'delivery_image');
  };

  // Handle delivery image removal
  const handleRemoveDeliveryImage = () => {
    if (isViewMode) return;
    setDeliveryImageFile(null);
    setRecipe(prev => ({
      ...prev,
      delivery_image: null,
      delivery_image_preview: null,
      delivery_image_url: null
    }));
  };

  // Handle special instruction image change
  const handleSpecialInstructionImageChange = (e) => {
    if (isViewMode) return;
    const file = e.target.files[0];
    if (file) {
      try {
        // Create a temporary preview URL for the selected file
        const previewUrl = URL.createObjectURL(file);
        setSpecialInstructionImageFile(file);
        setRecipe(prev => ({
          ...prev,
          special_instruction_image: previewUrl
        }));
      } catch (error) {
        console.error('Error handling special instruction image:', error);
      }
    }
  };

  // Handle special instruction image removal
  const handleRemoveSpecialInstructionImage = () => {
    if (isViewMode) return;
    setSpecialInstructionImageFile(null);
    setRecipe(prev => ({
      ...prev,
      special_instruction_image: null
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitWithLoading = async (e) => {
    setIsSubmitting(true);
    await handleSubmit(e);
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    navigate('/manager');
  };

  const handleAddIngredient = () => {
    if (isViewMode) return;

    if (!selectedIngredient.id || !selectedIngredient.quantity || parseFloat(selectedIngredient.quantity) <= 0) {
      setError({ message: 'Please select an ingredient and enter a valid quantity', type: 'error' });
      setTimeout(() => setError({ message: '', type: '' }), 3000);
      return;
    }

    const ingredient = ingredients.find(ing => ing.id === parseInt(selectedIngredient.id));
    if (!ingredient) {
      setError({ message: 'Ingredient not found', type: 'error' });
      setTimeout(() => setError({ message: '', type: '' }), 3000);
      return;
    }

    // Check if ingredient already exists in the list
    const isDuplicate = (recipe.ingredients || []).some(
      ing => ing.id === parseInt(selectedIngredient.id)
    );

    if (isDuplicate) {
      setError({ message: 'This ingredient is already in the recipe. Please edit the existing entry instead.', type: 'error' });
      setTimeout(() => setError({ message: '', type: '' }), 3000);
      return;
    }

    const quantity = parseFloat(selectedIngredient.quantity);
    // Normalize cost field - database might have 'cost' or 'cost_per_unit'
    const costPerUnit = parseFloat(ingredient.cost_per_unit || ingredient.cost || 0);
    const totalCost = (costPerUnit * quantity).toFixed(2);

    const newIngredient = {
      id: ingredient.id,
      name: ingredient.name,
      quantity: quantity,
      unit: ingredient.unit,
      cost_per_unit: costPerUnit,
      totalCost: totalCost,
      uniqueId: `${ingredient.id}-${Date.now()}`
    };

    // Add new ingredient
    setRecipe(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), newIngredient]
    }));
    setError({ message: `Added ${ingredient.name} to recipe`, type: 'success' });

    // Reset form
    setSelectedIngredient({ id: '', name: '', unit: '', cost_per_unit: '0', quantity: '' });
    setTimeout(() => setError({ message: '', type: '' }), 3000);
  };

  useEffect(() => {
    // First, ensure recipe exists and has ingredients array
    if (!recipe || !recipe.ingredients) return;

    // Then, ensure all ingredients have proper totalCost
    const updatedIngredients = recipe.ingredients.map(ing => {
      const quantity = parseFloat(ing.quantity) || 0;
      // Handle both cost_per_unit (new) and cost (old) for backward compatibility
      const costPerUnit = parseFloat(ing.cost_per_unit || ing.cost) || 0;
      const totalCost = quantity * costPerUnit;
      return {
        ...ing,
        cost_per_unit: costPerUnit, // Normalize to cost_per_unit
        totalCost: totalCost.toFixed(2)
      };
    });

    // Update recipe with fixed ingredients if there were any NaN values
    if (updatedIngredients.some(ing => ing.totalCost !== recipe.ingredients.find(i => i.id === ing.id)?.totalCost)) {
      setRecipe(prev => ({
        ...prev,
        ingredients: updatedIngredients
      }));
    }

    const totalIngredientsCost = updatedIngredients.reduce((sum, ing) => {
      return sum + parseFloat(ing.totalCost || 0);
    }, 0);

    const overhead = parseFloat(recipe.overhead) || 0;
    const totalCost = totalIngredientsCost * (1 + overhead / 100);
    const sellingPrice = parseFloat(recipe.selling_price) || 0;
    const sales = parseFloat(recipe.sales) || 0;
    const markupFactor = Math.min(totalCost > 0 ? sellingPrice / totalCost : 0, 999.99);

    // NEW: Calculate actionable metrics from POS data
    const avgSalePrice = parseFloat(salesData.average_sale_price) || sellingPrice;
    const profitPerUnit = avgSalePrice - totalCost;
    const totalProfitEarned = profitPerUnit * sales;
    const actualProfitMargin = Math.min(avgSalePrice > 0 ? (profitPerUnit / avgSalePrice) * 100 : 0, 999.99);

    // Calculate sales velocity (units per day)
    let salesVelocity = 0;
    if (salesData.last_sold_at && sales > 0) {
      const daysSinceFirstSale = Math.max(1, Math.ceil((new Date() - new Date(salesData.last_sold_at)) / (1000 * 60 * 60 * 24)));
      salesVelocity = (sales / daysSinceFirstSale).toFixed(1);
    }

    // Price variance check
    const priceVariance = avgSalePrice - sellingPrice;

    setRecipe(prev => ({
      ...prev,
      total_cost: totalCost.toFixed(2),
      profit_per_unit: profitPerUnit.toFixed(2),
      total_profit_earned: totalProfitEarned.toFixed(2),
      profit_margin: actualProfitMargin.toFixed(2),
      markup_factor: markupFactor.toFixed(2),
      sales_velocity: salesVelocity,
      price_variance: priceVariance.toFixed(2),
      avg_sale_price: avgSalePrice.toFixed(2)
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.ingredients, recipe.overhead, recipe.selling_price, recipe.sales, salesData]);

  const handleNameChange = (e) => {
    if (isViewMode || mode === 'edit') return;
    const newName = e.target.value;
    setRecipe(prev => ({ ...prev, name: newName }));

    // Check for duplicate name only in create mode
    if (mode === 'create') {
      const duplicate = recipes.some(existingRecipe =>
        existingRecipe.name.toLowerCase() === newName.toLowerCase()
      );
      setIsDuplicateName(duplicate);
      if (duplicate) {
        setError({ message: 'A recipe with this name already exists. Please use a different name.', type: 'error' });
      }
    }
  };

  return (
    <div className="recipe-form-container">
      {/* Show toast message if error exists */}
      {error.message && (
        <div className={`toast-message ${error.type}`}>
          {error.message}
        </div>
      )}

      <div className="page-title-card">
        <h1 className="page-title">
          {mode === 'edit' ? 'Edit Recipe' : mode === 'view' ? 'View Recipe' : 'Create Recipe'}
        </h1>
      </div>

      <form onSubmit={handleSubmitWithLoading} className={`recipe-form ${mode === 'view' ? 'view-mode' : ''}`}>
        {/* Recipe Details Section */}
        <div className="form-section recipe-details-section">
          <h2>Recipe Details</h2>
          <div className="form-group">
            <label htmlFor="name">Recipe Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={recipe.name}
              onChange={handleNameChange}
              className={`form-control ${isDuplicateName ? 'error-input' : ''}`}
              placeholder="Enter recipe name"
              required
              disabled={isViewMode || mode === 'edit'}
              title={mode === 'edit' ? "Recipe name cannot be changed in edit mode" : ""}
            />
            {isDuplicateName && mode === 'create' && (
              <div className="error-message">This recipe name already exists</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={recipe.category}
              onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.value }))}
              className="form-control"
              required
              disabled={isViewMode}
            >
              {RECIPE_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* SKU Display Field */}
          <div className="form-group sku-group">
            <label htmlFor="sku">SKU (Stock Keeping Unit)</label>
            <div className="sku-display">
              <input
                type="text"
                id="sku"
                name="sku"
                value={skuPreview}
                className="form-control sku-input"
                readOnly
                disabled
              />
              <span className="sku-badge">
                {mode === 'create' ? '🆕 Auto-generated' : '✅ Assigned'}
              </span>
            </div>
            <div className="field-hint">
              {mode === 'create'
                ? 'This SKU will be automatically assigned when you create the recipe'
                : 'This SKU was assigned when the recipe was created'}
            </div>
          </div>

          <div className="form-group production-recipe-group">
            <label className="switch-group">
              <div className="switch-label-content">
                <span className="switch-title">Production Recipe</span>
                <span className="switch-description">Include in POS for customer orders</span>
              </div>
              <div className="switch">
                <input
                  type="checkbox"
                  id="is_production_recipe"
                  name="is_production_recipe"
                  checked={recipe.is_production_recipe !== false}
                  onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.checked }))}
                  disabled={isViewMode}
                />
                <span className="slider"></span>
              </div>
            </label>
          </div>

          <div className="form-group">
            <label>Recipe Image</label>
            <div className="image-upload-section">
              {!recipe.image && !recipe.image_preview && !recipe.image_url ? (
                <div className="image-upload-container">
                  <input
                    type="file"
                    onChange={handleImageChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="recipe-image"
                    disabled={isViewMode}
                  />
                  <label htmlFor="recipe-image" className="image-upload-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7m4 0v4m0 0l-4-4m4 4l4-4" />
                    </svg>
                    <p>Click to upload recipe image</p>
                  </label>
                </div>
              ) : (
                <ImagePreview url={recipe.image_preview || recipe.image_url} onRemove={handleRemoveImage} alt="Recipe preview" isViewMode={isViewMode} />
              )}
            </div>
          </div>
        </div>

        {/* Recipe Ingredients Section */}
        <div className="form-section ingredients-section">
          <h2>Recipe Ingredients</h2>
          <div className="add-ingredient-form">
            <div className="input-row">
              <div className="form-group">
                <label>Select Ingredient</label>
                <select
                  className="form-control"
                  value={selectedIngredient.id}
                  onChange={(e) => {
                    const ingredientId = e.target.value;
                    const ingredient = ingredients.find(ing => ing.id === parseInt(ingredientId));
                    if (ingredient) {
                      setSelectedIngredient({
                        id: ingredientId,
                        name: ingredient.name,
                        unit: ingredient.unit,
                        cost_per_unit: ingredient.cost_per_unit || ingredient.cost || '0',
                        quantity: selectedIngredient.quantity || ''
                      });
                    }
                  }}
                  disabled={isViewMode}
                >
                  <option value="">Choose an ingredient...</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (₹{parseFloat(ing.cost_per_unit || ing.cost || 0).toFixed(2)}/{ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  className="form-control"
                  value={selectedIngredient.quantity}
                  onChange={(e) => !isViewMode && setSelectedIngredient(prev => ({ ...prev, quantity: e.target.value }))}
                  min="0"
                  step="any"
                  disabled={isViewMode}
                  placeholder="0"
                />
              </div>

              <button
                type="button"
                className="add-ingredient-btn"
                onClick={handleAddIngredient}
                disabled={isViewMode || !selectedIngredient.id || parseFloat(selectedIngredient.quantity) <= 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add
              </button>
            </div>
          </div>
          {/* Removed separate button, now it's inline */}

          {error.message && <div className="error-message">{error.message}</div>}

          <div className="ingredients-table-container">
            <table className="ingredients-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Quantity</th>
                  <th>Cost</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(recipe.ingredients || []).map((ing, index) => {
                  return (
                    <tr key={ing.uniqueId || `${ing.id}-${Date.now()}-${index}`}>
                      <td className="ingredient-name">{ing.name}</td>
                      <td className="ingredient-quantity">
                        {editingIngredientIndex === index ? (
                          <input
                            type="number"
                            className="form-control inline-edit-input"
                            value={editingQuantity}
                            onChange={(e) => setEditingQuantity(e.target.value)}
                            min="0"
                            step="any"
                            autoFocus
                          />
                        ) : (
                          `${ing.quantity} ${ing.unit}`
                        )}
                      </td>
                      <td className="ingredient-cost">
                        ₹{editingIngredientIndex === index
                          ? (parseFloat(ing.cost_per_unit || ing.cost || 0) * parseFloat(editingQuantity || 0)).toFixed(2)
                          : parseFloat(ing.totalCost || 0).toFixed(2)
                        }
                      </td>
                      <td>
                        <div className="ingredient-actions">
                          {editingIngredientIndex === index ? (
                            <>
                              <button
                                type="button"
                                className="save-ingredient-btn"
                                onClick={() => {
                                  const newQuantity = parseFloat(editingQuantity);
                                  if (newQuantity > 0) {
                                    const costPerUnit = parseFloat(ing.cost_per_unit || ing.cost || 0);
                                    const newTotalCost = (costPerUnit * newQuantity).toFixed(2);
                                    setRecipe(prev => ({
                                      ...prev,
                                      ingredients: prev.ingredients.map((ingredient, idx) =>
                                        idx === index
                                          ? { ...ingredient, quantity: newQuantity, totalCost: newTotalCost }
                                          : ingredient
                                      )
                                    }));
                                    setEditingIngredientIndex(null);
                                    setEditingQuantity('');
                                    setError({ message: `Updated ${ing.name}`, type: 'success' });
                                    setTimeout(() => setError({ message: '', type: '' }), 3000);
                                  } else {
                                    setError({ message: 'Quantity must be greater than 0', type: 'error' });
                                    setTimeout(() => setError({ message: '', type: '' }), 3000);
                                  }
                                }}
                                title="Save changes"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="cancel-ingredient-btn"
                                onClick={() => {
                                  setEditingIngredientIndex(null);
                                  setEditingQuantity('');
                                }}
                                title="Cancel editing"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="edit-ingredient-btn"
                                onClick={() => {
                                  if (isViewMode) return;
                                  console.log('Edit clicked! Index:', index, 'Quantity:', ing.quantity);
                                  setEditingIngredientIndex(index);
                                  setEditingQuantity(ing.quantity.toString());
                                  console.log('Set editingIngredientIndex to:', index);
                                }}
                                title="Edit ingredient"
                                disabled={isViewMode}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="remove-ingredient-btn"
                                onClick={() => {
                                  if (isViewMode) return;
                                  const removedIngredient = recipe.ingredients[index];
                                  setRecipe(prev => ({
                                    ...prev,
                                    ingredients: prev.ingredients.filter((_, i) => i !== index)
                                  }));
                                  setError({ message: `Removed ${removedIngredient.name || 'ingredient'} from recipe`, type: 'success' });
                                }}
                                title="Remove ingredient"
                                disabled={isViewMode}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(recipe.ingredients || []).length > 0 && (
            <div className="ingredients-total">
              <span className="total-label">Total Ingredients Cost:</span>
              <span className="total-amount">
                ₹{(recipe.ingredients || []).reduce((sum, ing) => sum + parseFloat(ing.totalCost || 0), 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* MRP Decider Section */}
        <div className="form-section mrp-section">
          <h2>MRP Decider</h2>
          <div className="form-group">
            <label htmlFor="selling_price">Selling Price</label>
            <input
              type="number"
              id="selling_price"
              name="selling_price"
              value={recipe.selling_price || ''}
              placeholder="0"
              onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.value }))}
              className="form-control"
              min="0"
              max="999999"
              step="1"
              required
              disabled={isViewMode}
            />
          </div>

          {/* Sales Data from POS or Default Placeholder */}
          <div className="form-group">
            <label htmlFor="overhead">Overhead % *</label>
            <input
              type="number"
              id="overhead"
              name="overhead"
              value={recipe.overhead}
              onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.value }))}
              className="form-control"
              min="0"
              max="100"
              step="0.01"
              required
              disabled={isViewMode}
            />
          </div>

          {/* Sales Data from POS or Default Placeholder */}
          {mode !== 'create' && recipe.id ? (
            <div className="sales-analytics-section">
              <div className="sales-header">
                <div className="sales-title-row">
                  <h3>📊 Sales Analytics (from POS)</h3>
                  <button
                    type="button"
                    className="refresh-sales-btn"
                    onClick={async () => {
                      setLoadingSalesData(true);
                      try {
                        const data = await recipeService.getRecipeSalesData(recipe.id);
                        setSalesData(data);
                        setRecipe(prev => ({ ...prev, sales: data.total_units_sold || 0 }));
                        setError({ message: 'Sales data refreshed successfully', type: 'success' });
                      } catch (error) {
                        setError({ message: 'Failed to refresh sales data', type: 'error' });
                      } finally {
                        setLoadingSalesData(false);
                      }
                    }}
                    disabled={loadingSalesData}
                  >
                    {loadingSalesData ? '⏳' : '🔄'} Refresh
                  </button>
                </div>
                {salesData.last_sold_at && (
                  <div className="last-sold-badge">
                    Last sold: {new Date(salesData.last_sold_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>

              <div className="sales-metrics-grid">
                <div className="sales-metric-card primary">
                  <div className="metric-icon">📦</div>
                  <div className="metric-content">
                    <div className="metric-label">Total Units Sold</div>
                    <div className="metric-value">{salesData.total_units_sold || 0}</div>
                  </div>
                </div>

                <div className="sales-metric-card success">
                  <div className="metric-icon">💰</div>
                  <div className="metric-content">
                    <div className="metric-label">Total Revenue</div>
                    <div className="metric-value">₹{Number(salesData.total_revenue || 0).toFixed(2)}</div>
                  </div>
                </div>

                <div className="sales-metric-card info">
                  <div className="metric-icon">💵</div>
                  <div className="metric-content">
                    <div className="metric-label">Avg Sale Price</div>
                    <div className="metric-value">₹{Number(salesData.average_sale_price || 0).toFixed(2)}</div>
                  </div>
                </div>

                <div className="sales-metric-card accent">
                  <div className="metric-icon">🛒</div>
                  <div className="metric-content">
                    <div className="metric-label">Orders Count</div>
                    <div className="metric-value">{salesData.order_count || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="sales-info-card">
              <div className="info-icon">💡</div>
              <div className="info-content">
                <strong>Sales & Profit Projections</strong>
                <p>Profit metrics will calculate automatically once this item starts selling on the POS.</p>
              </div>
            </div>
          )}

          {/* Smart Alerts */}
          {mode !== 'create' && recipe.id && (
            <div className="pricing-alerts">
              {parseFloat(recipe.markup_factor) < 4 && (
                <div className="alert alert-warning">
                  ⚠️ <strong>Markup Below Target:</strong> Current markup is {recipe.markup_factor}x. Target is 4x or higher for healthy margins.
                </div>
              )}
              {parseFloat(recipe.price_variance) !== 0 && Math.abs(parseFloat(recipe.price_variance)) > 1 && (
                <div className={`alert ${parseFloat(recipe.price_variance) > 0 ? 'alert-info' : 'alert-warning'}`}>
                  {parseFloat(recipe.price_variance) > 0 ? '💡' : '⚠️'} <strong>Price Variance Detected:</strong> Actual sale price (₹{recipe.avg_sale_price}) differs from listed price (₹{recipe.selling_price}) by ₹{Math.abs(parseFloat(recipe.price_variance)).toFixed(2)}
                  {parseFloat(recipe.price_variance) > 0 ? ' - You could increase your listed price!' : ' - Consider investigating discounts.'}
                </div>
              )}
            </div>
          )
          }

          <div className="financial-metrics">
            {/* Core Costing Metrics */}
            <div className="metric-card">
              <div className="metric-label">Total Cost (per unit)</div>
              <div className="metric-value">₹{recipe.total_cost}</div>
            </div>
            <div className={`metric-card ${parseFloat(recipe.markup_factor) >= 4 ? 'metric-success' : 'metric-warning'}`}>
              <div className="metric-label">Markup Factor</div>
              <div className="metric-value">{recipe.markup_factor}x</div>
              <div className="metric-hint">{parseFloat(recipe.markup_factor) >= 4 ? '✅ Target met' : '⚠️ Below 4x target'}</div>
            </div>
            <div className={`metric-card ${parseFloat(recipe.profit_margin) >= 60 ? 'metric-success' : 'metric-warning'}`}>
              <div className="metric-label">Profit Margin</div>
              <div className="metric-value">{recipe.profit_margin}%</div>
            </div>

            {/* Actionable POS Metrics - Only show when sales data exists */}
            {mode !== 'create' && recipe.id && parseFloat(recipe.sales) > 0 && (
              <>
                <div className="metric-card metric-primary">
                  <div className="metric-label">💰 Profit Per Unit</div>
                  <div className="metric-value">₹{recipe.profit_per_unit}</div>
                  <div className="metric-hint">You earn this per sale</div>
                </div>
                <div className="metric-card metric-success">
                  <div className="metric-label">💵 Total Profit Earned</div>
                  <div className="metric-value">₹{recipe.total_profit_earned}</div>
                  <div className="metric-hint">Lifetime earnings</div>
                </div>
                <div className={`metric-card ${parseFloat(recipe.sales_velocity) > 20 ? 'metric-hot' : parseFloat(recipe.sales_velocity) > 5 ? 'metric-warm' : 'metric-cool'}`}>
                  <div className="metric-label">
                    {parseFloat(recipe.sales_velocity) > 20 ? '🔥' : parseFloat(recipe.sales_velocity) > 5 ? '🟡' : '❄️'} Sales Velocity
                  </div>
                  <div className="metric-value">{recipe.sales_velocity || '0'}/day</div>
                  <div className="metric-hint">
                    {parseFloat(recipe.sales_velocity) > 20 ? 'Hot seller!' : parseFloat(recipe.sales_velocity) > 5 ? 'Moderate' : 'Slow mover'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div >

        {/* SKU Availability Channels Section */}
        < div className="form-section menu-availability-section" >
          <h2>SKU Availability Channels</h2>
          <div className="form-group">
            <div className="checkbox-group">
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="print_menu_ready"
                  name="print_menu_ready"
                  checked={recipe.print_menu_ready}
                  onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.checked }))}
                  className="styled-checkbox"
                  disabled={isViewMode}
                />
                <label htmlFor="print_menu_ready" className="checkbox-label">Dine in Menu</label>
              </div>

              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="available_for_delivery"
                  name="available_for_delivery"
                  checked={recipe.available_for_delivery}
                  onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, [e.target.name]: e.target.checked }))}
                  className="styled-checkbox"
                  disabled={isViewMode}
                />
                <label htmlFor="available_for_delivery" className="checkbox-label">
                  Delivery Ready
                </label>
              </div>
            </div>
          </div>

          {/* Delivery Image Section - Inside Menu Availability */}
          {
            recipe.available_for_delivery && (
              <div className="delivery-image-section">
                <label>Delivery Image</label>
                <div className="image-upload-section">
                  {!recipe.delivery_image && !recipe.delivery_image_preview && !recipe.delivery_image_url ? (
                    <div className="image-upload-container">
                      <input
                        type="file"
                        onChange={handleDeliveryImageChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="delivery-image"
                        disabled={isViewMode}
                      />
                      <label htmlFor="delivery-image" className="image-upload-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7m4 0v4m0 0l-4-4m4 4l4-4" />
                        </svg>
                        <p>Upload delivery presentation image</p>
                        <span className="upload-hint">This image will be shown to customers during delivery</span>
                      </label>
                    </div>
                  ) : (
                    <ImagePreview url={recipe.delivery_image_preview || recipe.delivery_image_url} onRemove={handleRemoveDeliveryImage} alt="Delivery preview" isViewMode={isViewMode} />
                  )}
                </div>
              </div>
            )
          }
        </div >

        {/* Preparation Procedure Section - Moved to end */}
        < div className="form-section preparation-section" >
          <h2>Preparation Procedure</h2>
          <div className="preparation-grid">
            <div className="form-group">
              <label>📝 Preparation Steps</label>
              <textarea
                className="form-control"
                value={recipe.preparation_steps}
                onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, preparation_steps: e.target.value }))}
                placeholder="List the steps to prepare this recipe..."
                disabled={isViewMode}
              />
              <span className="field-hint">Step-by-step instructions</span>
            </div>

            <div className="form-group">
              <label>🍳 Cooking Method</label>
              <textarea
                className="form-control"
                value={recipe.cooking_method}
                onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, cooking_method: e.target.value }))}
                placeholder="Describe the cooking method and techniques..."
                disabled={isViewMode}
              />
              <span className="field-hint">Cooking techniques used</span>
            </div>

            <div className="form-group">
              <label>🍽️ Plating Instructions</label>
              <textarea
                className="form-control"
                value={recipe.plating_instructions}
                onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, plating_instructions: e.target.value }))}
                placeholder="Describe how to plate and present..."
                disabled={isViewMode}
              />
              <span className="field-hint">Presentation guidelines</span>
            </div>

            <div className="form-group">
              <label>📌 Chef's Notes</label>
              <textarea
                className="form-control"
                value={recipe.chefs_notes}
                onChange={(e) => !isViewMode && setRecipe(prev => ({ ...prev, chefs_notes: e.target.value }))}
                placeholder="Add any special tips, variations, or notes..."
                disabled={isViewMode}
              />
              <span className="field-hint">Special tips and variations</span>
            </div>

            {/* Special Instruction Image Upload */}
            <div className="form-group">
              <label>📸 Special Instructions Image</label>
              <div className="image-upload-section">
                {!recipe.special_instruction_image ? (
                  <div className="image-upload-container">
                    <input
                      type="file"
                      id="special-instruction-image"
                      accept="image/*"
                      onChange={handleSpecialInstructionImageChange}
                      style={{ display: 'none' }}
                      disabled={isViewMode}
                    />
                    <label htmlFor="special-instruction-image" className="image-upload-placeholder">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <p>Upload Special Instructions</p>
                      <span className="upload-hint">Visual guide for preparation</span>
                    </label>
                  </div>
                ) : (
                  <ImagePreview
                    url={recipe.special_instruction_image}
                    onRemove={handleRemoveSpecialInstructionImage}
                    alt="Special instructions"
                    isViewMode={isViewMode}
                  />
                )}
              </div>
              <span className="field-hint">Optional visual guide for complex steps</span>
            </div>
          </div>
        </div >

        {/* Action Buttons Section */}
        < div className="action-buttons-card" >
          {mode === 'view' ? (
            <button
              type="button"
              className="btn return-btn"
              onClick={handleCancel}
            >
              <span>←</span> Return to Recipe Manager
            </button>
          ) : (
            <>
              <button
                type="submit"
                className="btn create-btn"
                disabled={isSubmitting || (mode === 'create' && isDuplicateName)}
              >
                <span>+</span> {mode === 'edit' ? 'Update Recipe' : 'Create Recipe'}
              </button>
              <button
                type="button"
                className="btn cancel-btn"
                onClick={handleCancel}
              >
                <span>-</span> Cancel
              </button>
            </>
          )}
        </div >
      </form >
      {showImageModal && (
        <div className="image-modal" onClick={() => setShowImageModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <img src={recipe.image_preview || recipe.image} alt="Recipe full view" loading="eager" />
            <button className="close-modal" onClick={() => setShowImageModal(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {
        showDeliveryImageModal && (
          <div className="image-modal" onClick={() => setShowDeliveryImageModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">Delivery Presentation Image</div>
              <img src={recipe.delivery_image_preview || recipe.delivery_image_url} alt="Delivery full view" loading="eager" />
              <button className="close-modal" onClick={() => setShowDeliveryImageModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default RecipeForm;
