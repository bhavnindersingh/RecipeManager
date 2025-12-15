import React from 'react';
import '../../styles/StockListItem.css';

const StockListItem = ({ stock, onAction }) => {
  const { ingredient, current_quantity, minimum_quantity, unit_cost_avg } = stock;

  // Get stock status
  const getStockStatus = () => {
    if (current_quantity === 0) return { status: 'out', label: 'Out', color: '#dc2626', icon: '❌' };
    if (current_quantity < minimum_quantity) return { status: 'low', label: 'Low', color: '#f59e0b', icon: '⚠️' };
    if (current_quantity < minimum_quantity * 1.5) return { status: 'medium', label: 'Medium', color: '#3b82f6', icon: '⚡' };
    return { status: 'good', label: 'Good', color: '#059669', icon: '✅' };
  };

  const statusInfo = getStockStatus();

  // Calculate price variance (actual vs expected)
  const expectedCost = ingredient?.cost || 0;
  const actualCost = unit_cost_avg || 0;
  const hasVariance = actualCost > 0 && expectedCost > 0;
  const variancePercent = hasVariance
    ? (((actualCost - expectedCost) / expectedCost) * 100).toFixed(1)
    : 0;
  const isOverExpected = parseFloat(variancePercent) > 5;

  // Category emoji mapping
  const categoryEmojis = {
    'Vegetables': '🥕',
    'Fruits': '🍎',
    'Dairy': '🥛',
    'Grains': '🌾',
    'Spices': '🌶️',
    'Meat': '🥩',
    'Seafood': '🐟',
    'Beverages': '☕',
    'Bakery': '🍞',
    'Oil': '🫗',
    'Default': '📦'
  };

  const categoryEmoji = categoryEmojis[ingredient?.category] || categoryEmojis['Default'];

  return (
    <div className={`stock-list-item status-${statusInfo.status}`}>
      {/* Left: Ingredient Info */}
      <div className="stock-item-left">
        <span className="ingredient-emoji">{categoryEmoji}</span>
        <div className="ingredient-details">
          <h3 className="ingredient-name">{ingredient?.name || 'Unknown'}</h3>
          <span className="ingredient-category">{ingredient?.category || 'Uncategorized'}</span>
        </div>
      </div>

      {/* Center: Stock Info */}
      <div className="stock-item-center">
        <div className="stock-quantity-display">
          <span className="quantity-value">{current_quantity?.toFixed(2) || '0.00'}</span>
          <span className="quantity-unit">{ingredient?.unit || 'unit'}</span>
        </div>
        <div className="stock-status-badge" style={{ background: statusInfo.color }}>
          <span>{statusInfo.icon} {statusInfo.label}</span>
        </div>
      </div>

      {/* Right: Cost Info & Actions */}
      <div className="stock-item-right">
        {/* Cost Info */}
        <div className="cost-info">
          <div className="cost-row">
            <span className="cost-label">Expected:</span>
            <span className="cost-value">₹{expectedCost.toFixed(2)}</span>
          </div>
          {actualCost > 0 && (
            <div className="cost-row">
              <span className="cost-label">Actual:</span>
              <span className={`cost-value ${isOverExpected ? 'cost-over' : ''}`}>
                ₹{actualCost.toFixed(2)}
                {isOverExpected && (
                  <span className="cost-variance"> (+{variancePercent}%)</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="stock-item-actions">
          <button
            className="action-btn action-add"
            onClick={() => onAction('add', stock)}
            title="Add Stock (Purchase)"
          >
            <span className="action-icon">➕</span>
            <span className="action-label">Add</span>
          </button>
          <button
            className="action-btn action-remove"
            onClick={() => onAction('remove', stock)}
            title="Remove Stock (Wastage)"
          >
            <span className="action-icon">➖</span>
            <span className="action-label">Remove</span>
          </button>
          <button
            className="action-btn action-adjust"
            onClick={() => onAction('adjust', stock)}
            title="Adjust Stock"
          >
            <span className="action-icon">✏️</span>
            <span className="action-label">Adjust</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockListItem;
