import React, { useState } from 'react';
import { orderService } from '../../services/orderService';
import RecipeGrid from './RecipeGrid';
import CartPanel from './CartPanel';

const TableOrderModal = ({ table, recipes, onClose, onOrderComplete, onGenerateBill }) => {
  const [cart, setCart] = useState([]);
  const [guestCount, setGuestCount] = useState(table.current_order?.guest_count || 2);
  const [orderNotes, setOrderNotes] = useState('');
  const [currentOrder, setCurrentOrder] = useState(table.current_order);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Get unique categories
  const categories = ['all', ...new Set(recipes.map(r => r.category))];

  // Filter recipes - only show production recipes in POS
  const filteredRecipes = recipes.filter(recipe => {
    const isProduction = recipe.is_production_recipe !== false; // Default true for backward compatibility
    const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory;
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
    return isProduction && matchesCategory && matchesSearch;
  });

  // Add item to cart
  const handleAddToCart = (recipe) => {
    const existingItem = cart.find(item => item.recipe.id === recipe.id);

    if (existingItem) {
      setCart(cart.map(item =>
        item.recipe.id === recipe.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        recipe,
        quantity: 1,
        notes: ''
      }]);
    }

    showMessage('Added to cart', 'success');
  };

  // Update cart item quantity
  const handleUpdateQuantity = (recipeId, quantity) => {
    if (quantity <= 0) {
      handleRemoveFromCart(recipeId);
      return;
    }

    setCart(cart.map(item =>
      item.recipe.id === recipeId
        ? { ...item, quantity }
        : item
    ));
  };

  // Update cart item notes
  const handleUpdateNotes = (recipeId, notes) => {
    setCart(cart.map(item =>
      item.recipe.id === recipeId
        ? { ...item, notes }
        : item
    ));
  };

  // Remove item from cart
  const handleRemoveFromCart = (recipeId) => {
    setCart(cart.filter(item => item.recipe.id !== recipeId));
  };

  // Clear cart
  const handleClearCart = () => {
    setCart([]);
    setOrderNotes('');
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.recipe.selling_price * item.quantity), 0);
  };

  // Submit new order or add to existing
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      showMessage('Cart is empty', 'error');
      return;
    }

    setLoading(true);

    try {
      const items = cart.map(item => ({
        recipe_id: item.recipe.id,
        quantity: item.quantity,
        unit_price: item.recipe.selling_price,
        notes: item.notes
      }));

      if (currentOrder) {
        // Add items to existing order
        await orderService.addItemsToOrder(currentOrder.id, items);
        showMessage('Items added to order!', 'success');
      } else {
        // Create new order for this table
        const orderData = {
          order_type: 'dine-in',
          table_id: table.id,
          guest_count: guestCount,
          notes: orderNotes,
          items
        };

        const order = await orderService.createOrder(orderData);
        setCurrentOrder(order);
        showMessage(`Order ${order.order_number} created!`, 'success');
      }

      // Clear cart
      handleClearCart();

      // Refresh and close after brief delay
      setTimeout(() => {
        if (onOrderComplete) onOrderComplete();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error submitting order:', error);
      showMessage('Failed to submit order', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Show message
  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="table-order-modal" onClick={(e) => e.stopPropagation()}>
        {message.text && (
          <div className={`modal-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="modal-header">
          <div className="modal-title">
            <h2>Table {table.table_number}</h2>
            {currentOrder && (
              <span className="order-badge">Order #{currentOrder.order_number}</span>
            )}
          </div>
          <button className="btn-close-modal" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="modal-content-split">
            {/* Left - Menu */}
            <div className="modal-left">
              <div className="recipe-filters">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-select"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              <RecipeGrid
                recipes={filteredRecipes}
                onAddToCart={handleAddToCart}
                cart={cart}
                onUpdateQuantity={handleUpdateQuantity}
              />
            </div>

            {/* Right - Cart & Actions */}
            <div className="modal-right">
              <CartPanel
                cart={cart}
                onUpdateQuantity={handleUpdateQuantity}
                onUpdateNotes={handleUpdateNotes}
                onRemoveFromCart={handleRemoveFromCart}
                onClearCart={handleClearCart}
              />

              <div className="order-details-modal">
                {!currentOrder && (
                  <div className="form-group">
                    <label>Number of Guests</label>
                    <input
                      type="number"
                      value={guestCount}
                      onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                      min="1"
                      max={table.capacity}
                      className="form-input"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Order Notes</label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Special instructions..."
                    className="form-textarea"
                    rows="2"
                  />
                </div>

                <div className="order-total-modal">
                  <span className="total-label">Cart Total:</span>
                  <span className="total-amount">₹{calculateTotal().toFixed(2)}</span>
                </div>

                {currentOrder && (
                  <div className="current-order-total">
                    <span className="total-label">Order Total:</span>
                    <span className="total-amount">₹{parseFloat(currentOrder.total_amount).toFixed(2)}</span>
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    className="btn-submit-order-modal"
                    onClick={handleSubmitOrder}
                    disabled={loading || cart.length === 0}
                  >
                    {loading ? 'Processing...' : currentOrder ? 'Add Items' : 'Place Order'}
                  </button>

                  {currentOrder && (
                    <button
                      className="btn-generate-bill"
                      onClick={() => onGenerateBill(currentOrder)}
                    >
                      Generate Bill
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableOrderModal;
