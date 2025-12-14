import React from 'react';

const CartPanel = ({
  cart,
  onUpdateQuantity,
  onUpdateNotes,
  onRemoveFromCart,
  onClearCart
}) => {
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) =>
      sum + (item.recipe.selling_price * item.quantity), 0
    );
  };

  if (cart.length === 0) {
    return (
      <div className="cart-panel">
        <div className="cart-header">
          <h3>Cart</h3>
          <span className="cart-count">0 items</span>
        </div>
        <div className="cart-empty">
          <p>Cart is empty</p>
          <p className="cart-empty-hint">Click on recipes to add them</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-panel">
      <div className="cart-header">
        <h3>Cart</h3>
        <div className="cart-header-actions">
          <span className="cart-count">{cart.length} items</span>
          <button
            className="btn-clear-cart"
            onClick={onClearCart}
            title="Clear Cart"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="cart-items">
        {cart.map(item => (
          <div key={item.recipe.id} className="cart-item">
            <div className="cart-item-header">
              <span className="cart-item-name">{item.recipe.name}</span>
              <button
                className="btn-remove-item"
                onClick={() => onRemoveFromCart(item.recipe.id)}
                title="Remove"
              >
                ×
              </button>
            </div>

            <div className="cart-item-controls">
              <div className="quantity-controls">
                <button
                  className="qty-btn"
                  onClick={() => onUpdateQuantity(item.recipe.id, item.quantity - 1)}
                >
                  −
                </button>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => onUpdateQuantity(item.recipe.id, parseInt(e.target.value) || 0)}
                  className="qty-input"
                  min="1"
                />
                <button
                  className="qty-btn"
                  onClick={() => onUpdateQuantity(item.recipe.id, item.quantity + 1)}
                >
                  +
                </button>
              </div>

              <div className="cart-item-price">
                ₹{(item.recipe.selling_price * item.quantity).toFixed(2)}
              </div>
            </div>

            {/* Item Notes */}
            <input
              type="text"
              placeholder="Add notes..."
              value={item.notes}
              onChange={(e) => onUpdateNotes(item.recipe.id, e.target.value)}
              className="cart-item-notes"
            />
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-subtotal">
          <span>Subtotal:</span>
          <span>₹{calculateSubtotal().toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default CartPanel;
