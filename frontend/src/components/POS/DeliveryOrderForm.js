import React, { useState, useEffect } from 'react';
import { orderService } from '../../services/orderService';
import { supabase } from '../../config/supabase';
import RecipeGrid from './RecipeGrid';
import CartPanel from './CartPanel';

const DeliveryOrderForm = ({ platform, recipes, onOrderComplete }) => {
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [platformOrderId, setPlatformOrderId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [recentOrderId, setRecentOrderId] = useState(null);
  const [recentOrderStatus, setRecentOrderStatus] = useState(null);

  // Subscribe to realtime updates for recently created order
  useEffect(() => {
    if (!recentOrderId) return;

    const orderChannel = supabase
      .channel(`delivery-order-${recentOrderId}-realtime`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${recentOrderId}`
      }, (payload) => {
        console.log('Delivery order status updated:', payload);

        if (payload.new.status !== payload.old.status) {
          setRecentOrderStatus(payload.new.status);
          showMessage(`Order ${payload.new.order_number}: ${payload.new.status}`, 'info');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [recentOrderId]);

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
  };

  // Calculate total
  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.recipe.selling_price * item.quantity), 0);
  };

  // Submit order
  const handleSubmitOrder = async () => {
    // Validation
    if (cart.length === 0) {
      showMessage('Cart is empty', 'error');
      return;
    }

    if (!customerName.trim()) {
      showMessage('Customer name is required', 'error');
      return;
    }

    if (!customerPhone.trim()) {
      showMessage('Customer phone is required', 'error');
      return;
    }

    if (!platformOrderId.trim()) {
      showMessage(`${platform === 'swiggy' ? 'Swiggy' : 'Zomato'} Order ID is required`, 'error');
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

      const orderData = {
        order_type: platform,
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_platform_order_id: platformOrderId,
        delivery_address: deliveryAddress || null,
        notes: orderNotes,
        payment_status: 'paid', // Delivery platforms are pre-paid
        paid_amount: calculateTotal(),
        items
      };

      const order = await orderService.createOrder(orderData);
      showMessage(`Order ${order.order_number} created successfully!`, 'success');

      // Track this order for realtime status updates
      setRecentOrderId(order.id);
      setRecentOrderStatus(order.status);

      // Clear form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPlatformOrderId('');
      setDeliveryAddress('');
      setOrderNotes('');

      // Refresh and callback
      setTimeout(() => {
        if (onOrderComplete) onOrderComplete();
      }, 1500);

    } catch (error) {
      console.error('Error creating delivery order:', error);
      showMessage('Failed to create order', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Show message
  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const platformName = platform === 'swiggy' ? 'Swiggy' : 'Zomato';

  return (
    <div className="delivery-order-form" data-platform={platform}>
      {message.text && (
        <div className={`form-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="delivery-order-layout">
        {/* Left - Menu */}
        <div className="delivery-left">
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

        {/* Right - Cart & Order Form */}
        <div className="delivery-right">
          <CartPanel
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateNotes={handleUpdateNotes}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={handleClearCart}
          />

          <div className="delivery-order-details">
            <h3>{platformName} Order Details</h3>

            <div className="form-group">
              <label>Customer Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Customer Phone *</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>{platformName} Order ID *</label>
              <input
                type="text"
                value={platformOrderId}
                onChange={(e) => setPlatformOrderId(e.target.value)}
                placeholder={`Enter ${platformName} order ID`}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Delivery Address (Optional)</label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter delivery address"
                className="form-textarea"
                rows="2"
              />
            </div>

            <div className="form-group">
              <label>Order Notes (Optional)</label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Special instructions..."
                className="form-textarea"
                rows="2"
              />
            </div>

            <div className="order-total-delivery">
              <span className="total-label">Order Total:</span>
              <span className="total-amount">₹{calculateTotal().toFixed(2)}</span>
            </div>

            <div className="payment-status-badge">
              <span className="badge-paid">✓ Pre-Paid ({platformName})</span>
            </div>

            <button
              className="btn-submit-delivery-order"
              onClick={handleSubmitOrder}
              disabled={loading || cart.length === 0}
            >
              {loading ? 'Creating Order...' : `Create ${platformName} Order`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryOrderForm;
