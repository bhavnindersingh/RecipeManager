import React, { useState, useEffect } from 'react';
import { paymentService } from '../../services/paymentService';
import { orderService } from '../../services/orderService';
import { supabase } from '../../config/supabase';
import SplitPaymentModal from './SplitPaymentModal';

const BillModal = ({ order, onClose, onPaymentComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [paidByName, setPaidByName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [currentOrder, setCurrentOrder] = useState(order);

  const totalAmount = parseFloat(currentOrder.total_amount);
  const paidAmount = parseFloat(currentOrder.paid_amount || 0);
  const remainingAmount = totalAmount - paidAmount;

  // Subscribe to realtime payment updates
  useEffect(() => {
    const orderId = order.id;

    // Subscribe to order changes (payment_status, paid_amount updates)
    const orderChannel = supabase
      .channel(`bill-order-${orderId}-realtime`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, async (payload) => {
        console.log('Order payment updated:', payload);

        // Refresh order with payment details
        try {
          const updatedOrder = await orderService.getOrderWithPayments(orderId);
          setCurrentOrder(updatedOrder);

          // Show notification if payment status changed
          if (payload.new.payment_status !== payload.old.payment_status) {
            showMessage(`Payment status: ${payload.new.payment_status}`, 'info');
          }

          // Auto-close if fully paid from another terminal
          if (payload.new.payment_status === 'paid' && payload.old.payment_status !== 'paid') {
            showMessage('Order fully paid!', 'success');
            setTimeout(() => {
              if (onPaymentComplete) onPaymentComplete();
              onClose();
            }, 2000);
          }
        } catch (error) {
          console.error('Error fetching updated order:', error);
        }
      })
      .subscribe();

    // Subscribe to payments table (new payments added)
    const paymentsChannel = supabase
      .channel(`bill-payments-${orderId}-realtime`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'payments',
        filter: `order_id=eq.${orderId}`
      }, async (payload) => {
        console.log('New payment added:', payload);

        // Refresh order with updated payments
        try {
          const updatedOrder = await orderService.getOrderWithPayments(orderId);
          setCurrentOrder(updatedOrder);
          showMessage('Payment received', 'success');
        } catch (error) {
          console.error('Error fetching updated order:', error);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, [order.id, onPaymentComplete, onClose]);

  const calculateChange = () => {
    if (paymentMethod === 'cash' && cashReceived) {
      return paymentService.calculateChange(remainingAmount, parseFloat(cashReceived));
    }
    return 0;
  };

  const handlePayment = async () => {
    // Validation
    if (paymentMethod === 'cash') {
      if (!cashReceived || parseFloat(cashReceived) < remainingAmount) {
        showMessage('Cash received must be at least the remaining amount', 'error');
        return;
      }
    }

    if (paymentMethod === 'upi' && !transactionRef) {
      showMessage('Please enter transaction reference', 'error');
      return;
    }

    setLoading(true);

    try {
      const paymentData = {
        order_id: order.id,
        amount: remainingAmount,
        payment_method: paymentMethod,
        transaction_reference: transactionRef || null,
        cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
        change_amount: paymentMethod === 'cash' ? calculateChange() : null,
        paid_by_name: paidByName || null
      };

      await paymentService.createPayment(paymentData);

      // Update order status to served if fully paid
      if (remainingAmount === totalAmount) {
        await orderService.updateOrderStatus(order.id, 'served');
      }

      showMessage('Payment successful!', 'success');

      setTimeout(() => {
        if (onPaymentComplete) onPaymentComplete();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error processing payment:', error);
      showMessage('Payment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  if (showSplitPayment) {
    return (
      <SplitPaymentModal
        order={order}
        onClose={() => setShowSplitPayment(false)}
        onPaymentComplete={() => {
          setShowSplitPayment(false);
          if (onPaymentComplete) onPaymentComplete();
          onClose();
        }}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bill-modal" onClick={(e) => e.stopPropagation()}>
        {message.text && (
          <div className={`modal-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="modal-header">
          <h2>Bill - Order #{currentOrder.order_number}</h2>
          <button className="btn-close-modal" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Bill Items */}
          <div className="bill-items">
            <h3>Order Items</h3>
            <div className="bill-items-list">
              {currentOrder.order_items.map(item => (
                <div key={item.id} className="bill-item-row">
                  <div className="item-details">
                    <span className="item-name">{item.recipe.name}</span>
                    <span className="item-qty">× {item.quantity}</span>
                  </div>
                  <span className="item-amount">
                    ₹{(item.quantity * item.unit_price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="bill-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              {paidAmount > 0 && (
                <div className="summary-row paid">
                  <span>Paid:</span>
                  <span>-₹{paidAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Remaining:</span>
                <span>₹{remainingAmount.toFixed(2)}</span>
              </div>
            </div>
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
                    min={remainingAmount}
                  />
                </div>
                {cashReceived && parseFloat(cashReceived) >= remainingAmount && (
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

          {/* Actions */}
          <div className="bill-actions">
            <button
              className="btn-split-payment"
              onClick={() => setShowSplitPayment(true)}
            >
              Split Payment
            </button>
            <button
              className="btn-process-payment"
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? 'Processing...' : `Pay ₹${remainingAmount.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillModal;
