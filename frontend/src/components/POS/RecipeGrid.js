import React from 'react';

const RecipeGrid = ({ recipes, onAddToCart, cart = [], onUpdateQuantity }) => {
  if (!recipes || recipes.length === 0) {
    return (
      <div className="recipe-grid-empty">
        <p>No recipes found</p>
      </div>
    );
  }

  // Get quantity for a recipe from cart
  const getCartQuantity = (recipeId) => {
    const cartItem = cart.find(item => item.recipe.id === recipeId);
    return cartItem ? cartItem.quantity : 0;
  };

  // Handle inline increment
  const handleIncrement = (e, recipe) => {
    e.stopPropagation();
    const currentQty = getCartQuantity(recipe.id);
    if (currentQty === 0) {
      onAddToCart(recipe);
    } else if (onUpdateQuantity) {
      onUpdateQuantity(recipe.id, currentQty + 1);
    }
  };

  // Handle inline decrement
  const handleDecrement = (e, recipeId) => {
    e.stopPropagation();
    const currentQty = getCartQuantity(recipeId);
    if (currentQty > 0 && onUpdateQuantity) {
      onUpdateQuantity(recipeId, currentQty - 1);
    }
  };

  return (
    <div className="recipe-grid">
      {recipes.map(recipe => {
        const quantity = getCartQuantity(recipe.id);

        return (
          <div
            key={recipe.id}
            className="recipe-card-pos"
            onClick={() => onAddToCart(recipe)}
          >
            {/* Quantity Badge */}
            {quantity > 0 && (
              <div className="recipe-quantity-badge">
                {quantity}
              </div>
            )}

            {recipe.image_url && (
              <div className="recipe-image">
                <img src={recipe.image_url} alt={recipe.name} />
              </div>
            )}

            <div className="recipe-info">
              <h4 className="recipe-name-pos">{recipe.name}</h4>
              <div className="recipe-details-pos">
                <span className="recipe-category-pos">{recipe.category}</span>
                <span className="recipe-price-pos">₹{recipe.selling_price}</span>
              </div>
            </div>

            {/* Add Overlay (shown on hover when quantity = 0) */}
            {quantity === 0 && (
              <div className="add-overlay">
                <span className="add-icon">+</span>
              </div>
            )}

            {/* Inline Quantity Controls (shown on hover when onUpdateQuantity is provided) */}
            {onUpdateQuantity && (
              <div className="recipe-inline-controls">
                <button
                  className="recipe-inline-btn"
                  onClick={(e) => handleDecrement(e, recipe.id)}
                  disabled={quantity === 0}
                  style={{ opacity: quantity === 0 ? 0.5 : 1 }}
                >
                  -
                </button>
                <span className="recipe-inline-qty">
                  {quantity}
                </span>
                <button
                  className="recipe-inline-btn"
                  onClick={(e) => handleIncrement(e, recipe)}
                >
                  +
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RecipeGrid;
