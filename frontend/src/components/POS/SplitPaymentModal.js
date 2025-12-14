import React, { useState } from 'react';
import { paymentService } from '../../services/paymentService';
import { orderService } from '../../services/orderService';

const SplitPaymentModal = ({ order, onClose, onPaymentComplete }) => {
  const [splitType, setSplitType] = useState('equal'); // 'equal', 'custom', 'items'
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  const [splits, setSplits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const totalAmount = parseFloat(order.total_amount);
  const paidAmount = parseFloat(order.paid_amount || 0);
  const remainingAmount = totalAmount - paidAmount;

  // Generate equal splits
  const handleGenerateEqualSplit = () => {
    const equalSplits = paymentService.calculateEqualSplit(remainingAmount, numberOfPeople);
    setSplits(equalSplits);
  };

  // Generate custom splits
  const handleGenerateCustomSplit = () => {
    const customSplits = [];
    for (let i = 0; i < numberOfPeople; i++) {
      customSplits.push({
        amount: 0,
        payment_method: 'cash',
        paid_by_name: `Person ${i + 1}`
      });
    }
    setSplits(customSplits);
  };

  // Update split amount
  const handleUpdateSplitAmount = (index, amount) => {
    const newSplits = [...splits];
    newSplits[index].amount = parseFloat(amount) || 0;
    setSplits(newSplits);
  };

  // Update split payment method
  const handleUpdateSplitMethod = (index, method) => {
    const newSplits = [...splits];
    newSplits[index].payment_method = method;
    setSplits(newSplits);
  };

  // Update split name
  const handleUpdateSplitName = (index, name) => {
    const newSplits = [...splits];
    newSplits[index].paid_by_name = name;
    setSplits(newSplits);
  };

  // Calculate total of all splits
  const calculateSplitTotal = () => {
    return splits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
  };

  // Validate and process split payment
  const handleProcessSplitPayment = async () => {
    const splitTotal = calculateSplitTotal();

    // Validation
    if (splits.length === 0) {
      showMessage('Please generate splits first', 'error');
      return;
    }

    if (Math.abs(splitTotal - remainingAmount) > 0.01) {
      showMessage(`Split total (₹${splitTotal.toFixed(2)}) must equal remaining amount (₹${remainingAmount.toFixed(2)})`, 'error');
      return;
    }

    if (splits.some(s => !s.payment_method)) {
      showMessage('Please select payment method for all splits', 'error');
      return;
    }

    setLoading(true);

    try {
      await paymentService.createSplitPayment(order.id, splits);

      // Update order status to served if fully paid
      if (paidAmount === 0 || (paidAmount + splitTotal) >= totalAmount) {
        await orderService.updateOrderStatus(order.id, 'served');
      }

      showMessage('Split payment successful!', 'success');

      setTimeout(() => {
        if (onPaymentComplete) onPaymentComplete();
      }, 1500);

    } catch (error) {
      console.error('Error processing split payment:', error);
      showMessage('Split payment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const splitTotal = calculateSplitTotal();
  const difference = remainingAmount - splitTotal;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="split-payment-modal" onClick={(e) => e.stopPropagation()}>
        {message.text && (
          <div className={`modal-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="modal-header">
          <h2>Split Payment - Order #{order.order_number}</h2>
          <button className="btn-close-modal" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Amount Summary */}
          <div className="split-summary">
            <div className="summary-row">
              <span>Total Amount:</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="summary-row">
                <span>Already Paid:</span>
                <span>₹{paidAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>To Split:</span>
              <span>₹{remainingAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Split Type Selection */}
          <div className="split-type-selector">
            <h3>Split Type</h3>
            <div className="split-type-buttons">
              <button
                className={`split-type-btn ${splitType === 'equal' ? 'active' : ''}`}
                onClick={() => setSplitType('equal')}
              >
                Equal Split
              </button>
              <button
                className={`split-type-btn ${splitType === 'custom' ? 'active' : ''}`}
                onClick={() => setSplitType('custom')}
              >
                Custom Amount
              </button>
            </div>
          </div>

          {/* Number of People */}
          <div className="form-group">
            <label>Number of People</label>
            <input
              type="number"
              value={numberOfPeople}
              onChange={(e) => setNumberOfPeople(parseInt(e.target.value) || 2)}
              min="2"
              max="10"
              className="form-input"
            />
          </div>

          {/* Generate Splits Button */}
          <button
            className="btn-generate-splits"
            onClick={splitType === 'equal' ? handleGenerateEqualSplit : handleGenerateCustomSplit}
          >
            Generate {splitType === 'equal' ? 'Equal' : 'Custom'} Splits
          </button>

          {/* Splits List */}
          {splits.length > 0 && (
            <div className="splits-list">
              <h3>Payment Splits</h3>
              {splits.map((split, index) => (
                <div key={index} className="split-item">
                  <div className="split-header">
                    <input
                      type="text"
                      value={split.paid_by_name}
                      onChange={(e) => handleUpdateSplitName(index, e.target.value)}
                      className="split-name-input"
                      placeholder={`Person ${index + 1}`}
                    />
                  </div>

                  <div className="split-details">
                    <div className="split-amount-input">
                      <label>Amount</label>
                      <input
                        type="number"
                        value={split.amount}
                        onChange={(e) => handleUpdateSplitAmount(index, e.target.value)}
                        className="form-input"
                        step="0.01"
                        min="0"
                        disabled={splitType === 'equal'}
                      />
                    </div>

                    <div className="split-method-select">
                      <label>Method</label>
                      <div className="payment-method-buttons">
                        <button
                          className={`method-btn ${split.payment_method === 'cash' ? 'active' : ''}`}
                          onClick={() => handleUpdateSplitMethod(index, 'cash')}
                        >
                          💵 Cash
                        </button>
                        <button
                          className={`method-btn ${split.payment_method === 'card' ? 'active' : ''}`}
                          onClick={() => handleUpdateSplitMethod(index, 'card')}
                        >
                          💳 Card
                        </button>
                        <button
                          className={`method-btn ${split.payment_method === 'upi' ? 'active' : ''}`}
                          onClick={() => handleUpdateSplitMethod(index, 'upi')}
                        >
                          📱 UPI
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Split Total */}
              <div className="split-total-row">
                <span>Split Total:</span>
                <span className={difference !== 0 ? 'error' : 'success'}>
                  ₹{splitTotal.toFixed(2)}
                </span>
              </div>
              {Math.abs(difference) > 0.01 && (
                <div className="split-difference">
                  {difference > 0 ? (
                    <span className="error">Remaining: ₹{difference.toFixed(2)}</span>
                  ) : (
                    <span className="error">Overpaid by: ₹{Math.abs(difference).toFixed(2)}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {splits.length > 0 && (
            <div className="split-actions">
              <button
                className="btn-process-split"
                onClick={handleProcessSplitPayment}
                disabled={loading || Math.abs(difference) > 0.01}
              >
                {loading ? 'Processing...' : `Process Split Payment`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SplitPaymentModal;
