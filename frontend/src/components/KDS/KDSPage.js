import React, { useState, useEffect, useCallback } from 'react';
import { orderService } from '../../services/orderService';
import OrderCard from './OrderCard';
import '../../styles/KDS.css';

const KDSPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Fetch kitchen orders
  const fetchKitchenOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await orderService.getKitchenOrders();

      // Apply filter
      let filtered = data;
      if (filter !== 'all') {
        filtered = data.filter(order => order.status === filter);
      }

      setOrders(filtered);
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Initial fetch
  useEffect(() => {
    fetchKitchenOrders();
  }, [fetchKitchenOrders]);

  // Setup realtime subscription
  useEffect(() => {
    // Subscribe to order changes
    const ordersChannel = orderService.subscribeToOrders((payload) => {
      console.log('Order update:', payload);

      // Play sound for new orders
      if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
        playNotificationSound();
      }

      // Refresh orders list
      fetchKitchenOrders();
    });

    // Subscribe to order_items changes (individual item status updates)
    const orderItemsChannel = orderService.subscribeToOrderItems((payload) => {
      console.log('Order item update:', payload);

      // Refresh orders list when items are added or status changes
      fetchKitchenOrders();
    });

    // Cleanup on unmount
    return () => {
      if (ordersChannel) {
        orderService.unsubscribe(ordersChannel);
      }
      if (orderItemsChannel) {
        orderService.unsubscribe(orderItemsChannel);
      }
    };
  }, [fetchKitchenOrders]);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (error) {
      console.log('Notification sound not available');
    }
  };

  // Handle start cooking
  const handleStartCooking = async (orderId) => {
    try {
      await orderService.updateOrderStatus(orderId, 'cooking');
      // Realtime will trigger refresh
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  // Handle mark as ready
  const handleMarkReady = async (orderId) => {
    try {
      await orderService.updateOrderStatus(orderId, 'ready');
      // Realtime will trigger refresh
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  // Handle individual item status change
  const handleItemStatusChange = async (itemId, currentStatus) => {
    try {
      // Cycle through statuses: pending → preparing → ready (stop at ready)
      let newStatus;
      if (currentStatus === 'pending') {
        newStatus = 'preparing';
      } else if (currentStatus === 'preparing') {
        newStatus = 'ready';
      } else {
        // If already ready or served, don't change from KDS
        console.log('Item is ready/served - must be marked as served from Server Dashboard');
        return;
      }

      await orderService.updateItemStatus(itemId, newStatus);
      // Realtime will trigger refresh
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  // Calculate elapsed time
  const calculateElapsedTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute';
    return `${diffMins} minutes`;
  };

  return (
    <div className="kds-page">
      <div className="kds-header">
        <h1 className="kds-title">Kitchen Display System</h1>
        <div className="kds-stats">
          <span className="stat-badge pending">
            {orders.filter(o => o.status === 'pending').length} Pending
          </span>
          <span className="stat-badge cooking">
            {orders.filter(o => o.status === 'cooking').length} Cooking
          </span>
        </div>
      </div>

      <div className="kds-filters">
        <button
          className={`kds-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Orders
        </button>
        <button
          className={`kds-filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button
          className={`kds-filter-btn ${filter === 'cooking' ? 'active' : ''}`}
          onClick={() => setFilter('cooking')}
        >
          Cooking
        </button>
      </div>

      {loading ? (
        <div className="kds-loading">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="kds-empty">
          <p>No orders in kitchen</p>
        </div>
      ) : (
        <div className="kds-grid">
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              elapsedTime={calculateElapsedTime(order.created_at)}
              onStartCooking={handleStartCooking}
              onMarkReady={handleMarkReady}
              onItemStatusChange={handleItemStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default KDSPage;
