import React, { useState } from 'react';
import { orderService } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';
import RecipeGrid from './RecipeGrid';
import CartPanel from './CartPanel';
import SplitPaymentModal from './SplitPaymentModal';

const TakeawayOrderForm = ({ recipes, onOrderComplete }) => {
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [paidByName, setPaidByName] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Get unique categories
  const categories = ['all', ...new Set(recipes.map(r => r.category))];

  // Filter recipes
  const filteredRecipes = recipes.filter(recipe => {
    const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory;
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
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

  // Calculate change
  const calculateChange = () => {
    if (paymentMethod === 'cash' && cashReceived) {
      return paymentService.calculateChange(calculateTotal(), parseFloat(cashReceived));
    }
    return 0;
  };

  // Create order and process payment
  const handlePlaceOrder = async () => {
    // Validation
    if (cart.length === 0) {
      showMessage('Cart is empty', 'error');
      return;
    }

    // Payment validation for cash
    if (paymentMethod === 'cash') {
      if (!cashReceived || parseFloat(cashReceived) < calculateTotal()) {
        showMessage('Cash received must be at least the total amount', 'error');
        return;
      }
    }

    // Payment validation for UPI
    if (paymentMethod === 'upi' && !transactionRef) {
      showMessage('Please enter transaction reference', 'error');
      return;
    }

    setLoading(true);

    try {
      // Create order
      const items = cart.map(item => ({
        recipe_id: item.recipe.id,
        quantity: item.quantity,
        unit_price: item.recipe.selling_price,
        notes: item.notes
      }));

      const orderData = {
        order_type: 'takeaway',
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        notes: orderNotes,
        items
      };

      const order = await orderService.createOrder(orderData);

      // Process payment
      const paymentData = {
        order_id: order.id,
        amount: calculateTotal(),
        payment_method: paymentMethod,
        transaction_reference: transactionRef || null,
        cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
        change_amount: paymentMethod === 'cash' ? calculateChange() : null,
        paid_by_name: paidByName || null
      };

      await paymentService.createPayment(paymentData);

      // Update order status to served (takeaway is immediate)
      await orderService.updateOrderStatus(order.id, 'served');

      showMessage(`Order ${order.order_number} completed successfully!`, 'success');

      // Clear form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setOrderNotes('');
      setCashReceived('');
      setTransactionRef('');
      setPaidByName('');
      setPaymentMethod('cash');

      // Refresh and callback
      setTimeout(() => {
        if (onOrderComplete) onOrderComplete();
      }, 1500);

    } catch (error) {
      console.error('Error creating takeaway order:', error);
      showMessage('Failed to create order', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle split payment
  const handleSplitPayment = async () => {
    if (cart.length === 0) {
      showMessage('Cart is empty', 'error');
      return;
    }

    setLoading(true);

    try {
      // Create order first
      const items = cart.map(item => ({
        recipe_id: item.recipe.id,
        quantity: item.quantity,
        unit_price: item.recipe.selling_price,
        notes: item.notes
      }));

      const orderData = {
        order_type: 'takeaway',
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        notes: orderNotes,
        items
      };

      const order = await orderService.createOrder(orderData);
      setCreatedOrder(order);
      setShowSplitPayment(true);

    } catch (error) {
      console.error('Error creating order for split payment:', error);
      showMessage('Failed to create order', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle split payment complete
  const handleSplitPaymentComplete = async () => {
    showMessage('Payment completed successfully!', 'success');

    // Clear form
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setOrderNotes('');
    setCreatedOrder(null);
    setShowSplitPayment(false);

    // Refresh and callback
    setTimeout(() => {
      if (onOrderComplete) onOrderComplete();
    }, 1500);
  };

  // Show message
  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // If showing split payment modal
  if (showSplitPayment && createdOrder) {
    return (
      <SplitPaymentModal
        order={createdOrder}
        onClose={() => {
          setShowSplitPayment(false);
          setCreatedOrder(null);
        }}
        onPaymentComplete={handleSplitPaymentComplete}
      />
    );
  }

  return (
    <div className="takeaway-order-form">
      {message.text && (
        <div className={`form-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="takeaway-order-layout">
        {/* Left - Menu */}
        <div className="takeaway-left">
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
        <div className="takeaway-right">
          <CartPanel
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateNotes={handleUpdateNotes}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={handleClearCart}
          />

          <div className="takeaway-order-details">
            <h3>Takeaway Order Details</h3>

            <div className="form-group">
              <label>Customer Name (Optional)</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Customer Phone (Optional)</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
                className="form-input"
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

            {/* Payment Section */}
            <div className="payment-section">
              <h3>Payment Method</h3>

              <div className="payment-methods">
                <button
                  className={`payment-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <span className="method-icon">💵</span>
                  Cash
                </button>
                <button
                  className={`payment-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <span className="method-icon">💳</span>
                  Card
                </button>
                <button
                  className={`payment-method-btn ${paymentMethod === 'upi' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('upi')}
                >
                  <span className="method-icon">📱</span>
                  UPI
                </button>
              </div>

              {/* Cash Payment Fields */}
              {paymentMethod === 'cash' && (
                <div className="payment-fields">
                  <div className="form-group">
                    <label>Cash Received *</label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="Enter amount"
                      className="form-input"
                      step="0.01"
                      min={calculateTotal()}
                    />
                  </div>
                  {cashReceived && parseFloat(cashReceived) >= calculateTotal() && (
                    <div className="change-display">
                      <span>Change to return:</span>
                      <span className="change-amount">₹{calculateChange().toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* UPI Payment Fields */}
              {paymentMethod === 'upi' && (
                <div className="payment-fields">
                  <div className="form-group">
                    <label>Transaction Reference *</label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="Enter transaction ID"
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              {/* Card Payment */}
              {paymentMethod === 'card' && (
                <div className="payment-fields">
                  <div className="form-group">
                    <label>Transaction Reference (Optional)</label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="Last 4 digits / approval code"
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              {/* Optional - Paid By Name */}
              <div className="form-group">
                <label>Paid By (Optional)</label>
                <input
                  type="text"
                  value={paidByName}
                  onChange={(e) => setPaidByName(e.target.value)}
                  placeholder="Customer name"
                  className="form-input"
                />
              </div>
            </div>

            <div className="order-total-takeaway">
              <span className="total-label">Order Total:</span>
              <span className="total-amount">₹{calculateTotal().toFixed(2)}</span>
            </div>

            <div className="takeaway-actions">
              <button
                className="btn-split-payment-takeaway"
                onClick={handleSplitPayment}
                disabled={loading || cart.length === 0}
              >
                Split Payment
              </button>
              <button
                className="btn-place-takeaway-order"
                onClick={handlePlaceOrder}
                disabled={loading || cart.length === 0}
              >
                {loading ? 'Processing...' : `Place Order & Pay ₹${calculateTotal().toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeawayOrderForm;
