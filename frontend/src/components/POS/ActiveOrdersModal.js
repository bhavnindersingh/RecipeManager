import React, { useState, useEffect } from 'react';
import { orderService } from '../../services/orderService';

const ActiveOrdersModal = ({ currentUser, onClose }) => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Fetch orders
  useEffect(() => {
    fetchOrders();
  }, [currentUser, filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const filters = {
        created_by: currentUser.id
      };

      if (filter !== 'all') {
        filters.status = filter;
      }

      const data = await orderService.getAllOrders(filters);
      // Filter out served and cancelled orders
      const activeOrders = data.filter(order =>
        !['served', 'cancelled'].includes(order.status)
      );
      setOrders(activeOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsServed = async (orderId) => {
    try {
      await orderService.updateOrderStatus(orderId, 'served');
      fetchOrders(); // Refresh list
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      await orderService.cancelOrder(orderId);
      fetchOrders(); // Refresh list
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'cooking': return 'status-cooking';
      case 'ready': return 'status-ready';
      default: return '';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Active Orders</h2>
          <button className="btn-close-modal" onClick={onClose}>×</button>
        </div>

        <div className="modal-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            className={`filter-btn ${filter === 'cooking' ? 'active' : ''}`}
            onClick={() => setFilter('cooking')}
          >
            Cooking
          </button>
          <button
            className={`filter-btn ${filter === 'ready' ? 'active' : ''}`}
            onClick={() => setFilter('ready')}
          >
            Ready
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-orders">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="no-orders">No active orders</div>
          ) : (
            <div className="orders-list">
              {orders.map(order => (
                <div key={order.id} className="order-item">
                  <div className="order-item-header">
                    <div>
                      <h4>{order.order_number}</h4>
                      <span className={`order-status ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="order-meta">
                      <span className="order-type">{order.order_type}</span>
                      {order.table_number && (
                        <span className="table-badge">Table {order.table_number}</span>
                      )}
                    </div>
                  </div>

                  <div className="order-items-list">
                    {order.order_items.map(item => (
                      <div key={item.id} className="order-item-row">
                        <span className="item-qty">{item.quantity}x</span>
                        <span className="item-name">{item.recipe.name}</span>
                        {item.notes && (
                          <span className="item-notes">({item.notes})</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="order-item-footer">
                    <span className="order-total">₹{order.total_amount}</span>
                    <div className="order-actions">
                      {order.status === 'ready' && (
                        <button
                          className="btn-mark-served"
                          onClick={() => handleMarkAsServed(order.id)}
                        >
                          Mark as Served
                        </button>
                      )}
                      <button
                        className="btn-cancel-order"
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveOrdersModal;
