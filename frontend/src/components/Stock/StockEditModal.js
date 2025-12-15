import React, { useState, useEffect, useRef } from 'react';
import '../../styles/StockEditModal.css';

const StockEditModal = ({
  isOpen,
  onClose,
  ingredient,
  actionType, // 'add', 'remove', 'adjust'
  onSave
}) => {
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const quantityInputRef = useRef(null);

  // Reset and pre-fill form when modal opens
  useEffect(() => {
    if (isOpen && ingredient) {
      setQuantity('');
      setReferenceNo('');

      // Pre-fill unit cost with ingredient cost for purchases
      if (actionType === 'add') {
        setUnitCost(ingredient.cost?.toString() || '');
      } else {
        setUnitCost('');
      }

      // Auto-focus quantity input
      setTimeout(() => {
        quantityInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, ingredient, actionType]);

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!quantity || parseFloat(quantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (actionType === 'add' && (!unitCost || parseFloat(unitCost) <= 0)) {
      alert('Please enter a valid unit cost for purchases');
      return;
    }

    setIsSubmitting(true);

    try {
      // Map action type to transaction type
      const transactionTypeMap = {
        add: 'purchase',
        remove: 'wastage',
        adjust: 'adjustment'
      };

      await onSave({
        ingredient_id: ingredient.id,
        transaction_type: transactionTypeMap[actionType],
        quantity: parseFloat(quantity),
        unit_cost: actionType === 'add' ? parseFloat(unitCost) : null,
        reference_no: referenceNo || null,
        notes: null
      });

      onClose();
    } catch (error) {
      console.error('Error saving stock transaction:', error);
      alert('Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !ingredient) return null;

  // Action labels and icons
  const actionConfig = {
    add: {
      title: 'Add Stock (Purchase)',
      icon: '➕',
      color: '#059669',
      description: 'Adding stock from purchase'
    },
    remove: {
      title: 'Remove Stock (Wastage)',
      icon: '➖',
      color: '#dc2626',
      description: 'Removing stock due to wastage'
    },
    adjust: {
      title: 'Adjust Stock',
      icon: '✏️',
      color: '#2563eb',
      description: 'Manual stock correction'
    }
  };

  const config = actionConfig[actionType] || actionConfig.add;

  return (
    <div className="stock-edit-overlay" onClick={onClose}>
      <div className="stock-edit-modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className="modal-header" style={{ borderLeftColor: config.color }}>
          <div className="modal-title-row">
            <span className="modal-icon" style={{ color: config.color }}>{config.icon}</span>
            <h2 className="modal-title">{config.title}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Ingredient Info */}
          <div className="ingredient-info-card">
            <div className="ingredient-info-row">
              <span className="info-label">Ingredient:</span>
              <span className="info-value">{ingredient.name}</span>
            </div>
            <div className="ingredient-info-row">
              <span className="info-label">Current Stock:</span>
              <span className="info-value">
                {ingredient.current_quantity?.toFixed(2) || '0.00'} {ingredient.unit}
              </span>
            </div>
            {ingredient.cost && (
              <div className="ingredient-info-row">
                <span className="info-label">Expected Cost:</span>
                <span className="info-value">₹{ingredient.cost.toFixed(2)}/{ingredient.unit}</span>
              </div>
            )}
          </div>

          {/* Action Description */}
          <p className="action-description">{config.description}</p>

          {/* Quantity Input */}
          <div className="form-group-modal">
            <label className="modal-label">
              Quantity <span className="required">*</span>
            </label>
            <div className="input-with-unit">
              <input
                ref={quantityInputRef}
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="modal-input-large"
                placeholder="0.00"
                step="0.01"
                min="0"
                inputMode="decimal"
              />
              <span className="input-unit">{ingredient.unit}</span>
            </div>
          </div>

          {/* Unit Cost (only for purchases) */}
          {actionType === 'add' && (
            <div className="form-group-modal">
              <label className="modal-label">
                Unit Cost <span className="required">*</span>
              </label>
              <div className="input-with-unit">
                <span className="input-prefix">₹</span>
                <input
                  type="number"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="modal-input-large"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                />
                <span className="input-unit">/{ingredient.unit}</span>
              </div>
              <span className="field-hint-modal">
                Expected: ₹{ingredient.cost?.toFixed(2) || '0.00'}
              </span>
            </div>
          )}

          {/* Reference Number */}
          <div className="form-group-modal">
            <label className="modal-label">Reference / Bill No.</label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="modal-input"
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal-btn modal-btn-save"
            onClick={handleSave}
            disabled={isSubmitting}
            style={{ background: config.color }}
          >
            {isSubmitting ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockEditModal;
