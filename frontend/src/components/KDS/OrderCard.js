import React from 'react';

const OrderCard = ({ order, elapsedTime, onStartCooking, onMarkReady, onItemStatusChange }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'order-card-pending';
      case 'cooking': return 'order-card-cooking';
      case 'ready': return 'order-card-ready';
      default: return '';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'New Order';
      case 'cooking': return 'Cooking';
      case 'ready': return 'Ready';
      default: return status;
    }
  };

  const getItemStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⭕';
      case 'preparing': return '🔄';
      case 'ready': return '✅';
      case 'served': return '✔️';
      default: return '○';
    }
  };

  const getItemStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'order-item-kds-pending';
      case 'preparing': return 'order-item-kds-preparing';
      case 'ready': return 'order-item-kds-ready';
      case 'served': return 'order-item-kds-served';
      default: return '';
    }
  };

  // Calculate progress
  const totalItems = order.order_items.length;
  const readyItems = order.order_items.filter(item => item.item_status === 'ready').length;
  const preparingItems = order.order_items.filter(item => item.item_status === 'preparing').length;
  const servedItems = order.order_items.filter(item => item.item_status === 'served').length;
  const pendingItems = totalItems - readyItems - preparingItems - servedItems;
  const completedItems = readyItems + servedItems;
  const progressPercentage = (completedItems / totalItems) * 100;

  // Build cooking status text
  const getCookingStatusText = () => {
    const parts = [];
    if (pendingItems > 0) parts.push(`${pendingItems} pending`);
    if (preparingItems > 0) parts.push(`${preparingItems} preparing`);
    if (readyItems > 0) parts.push(`${readyItems} ready`);
    if (servedItems > 0) parts.push(`${servedItems} served`);
    return parts.join(', ') || `${totalItems} pending`;
  };

  return (
    <div className={`order-card ${getStatusClass(order.status)}`}>
      <div className="order-card-header">
        <div>
          <h2 className="order-number">{order.order_number}</h2>
          <span className="order-status-label">
            {getStatusLabel(order.status)}
          </span>
        </div>
        <div className="order-timer">
          <span className="timer-icon">⏱</span>
          <span className="timer-value">{elapsedTime}</span>
        </div>
      </div>

      <div className="order-card-meta">
        {order.table_number && (
          <div className="order-meta-item">
            <span className="meta-label">Table:</span>
            <span className="meta-value table-number">{order.table_number}</span>
          </div>
        )}
        <div className="order-meta-item">
          <span className="meta-label">Type:</span>
          <span className="meta-value">{order.order_type}</span>
        </div>
        {order.customer_name && (
          <div className="order-meta-item">
            <span className="meta-label">Customer:</span>
            <span className="meta-value">{order.customer_name}</span>
          </div>
        )}
      </div>

      {order.notes && (
        <div className="order-notes">
          <strong>Notes:</strong> {order.notes}
        </div>
      )}

      <div className="order-items-section">
        <div className="items-header-row">
          <h4 className="items-header">Items:</h4>
          <div className="items-progress">
            {servedItems > 0 && (
              <span className="served-count">{servedItems} served</span>
            )}
            {readyItems > 0 && (
              <span className="progress-text">{readyItems} ready</span>
            )}
            {preparingItems > 0 && (
              <span className="preparing-count">{preparingItems} preparing</span>
            )}
            {completedItems === 0 && (
              <span className="pending-count">{totalItems} pending</span>
            )}
          </div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }}></div>
        </div>

        <div className="order-items-list-kds">
          {order.order_items.map(item => (
            <div
              key={item.id}
              className={`order-item-kds ${getItemStatusClass(item.item_status)}`}
              onClick={() => onItemStatusChange(item.id, item.item_status)}
              title={`Click to change status (currently: ${item.item_status})`}
            >
              <div className="item-main">
                <span className="item-status-icon">{getItemStatusIcon(item.item_status)}</span>
                <span className="item-qty-badge">{item.quantity}×</span>
                <span className="item-name-kds">{item.recipe.name}</span>
              </div>
              {item.notes && (
                <div className="item-notes-kds">
                  <span className="notes-icon">📝</span> {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="order-card-actions">
        {order.status === 'pending' && (
          <button
            className="btn-action btn-start-cooking"
            onClick={() => onStartCooking(order.id)}
          >
            Start Cooking
          </button>
        )}
        {order.status === 'cooking' && servedItems === totalItems && (
          <div className="all-items-served-message">
            ✅ All items served! Order complete.
          </div>
        )}
        {order.status === 'cooking' && servedItems < totalItems && (
          <div className="cooking-status">
            🔥 {getCookingStatusText()}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
