import React from 'react';

const OrderCard = ({ order, elapsedTime, onStartCooking, onMarkReady }) => {
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
        <h4 className="items-header">Items:</h4>
        <div className="order-items-list-kds">
          {order.order_items.map(item => (
            <div key={item.id} className="order-item-kds">
              <div className="item-main">
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
        {order.status === 'cooking' && (
          <button
            className="btn-action btn-mark-ready"
            onClick={() => onMarkReady(order.id)}
          >
            Mark as Ready
          </button>
        )}
        {order.status === 'ready' && (
          <div className="ready-message">
            Waiting for server to serve
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
