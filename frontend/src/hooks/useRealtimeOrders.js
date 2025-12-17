import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { orderService } from '../services/orderService';

/**
 * Hook to subscribe to realtime updates for multiple orders (e.g., KDS)
 * @param {Object} options - Configuration options
 * @param {Object} options.filters - Filters for fetching orders
 * @param {boolean} options.enabled - Whether to enable the subscription (default: true)
 * @param {Function} options.onNewOrder - Callback when new order is created
 * @param {Function} options.onOrderUpdate - Callback when order is updated
 * @param {Function} options.onItemUpdate - Callback when order item is updated
 * @returns {Object} { orders, loading, error, refetch }
 */
export const useRealtimeOrders = (options = {}) => {
  const { filters = {}, enabled = true, onNewOrder, onOrderUpdate, onItemUpdate } = options;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await orderService.getAllOrders(filters);
      if (isMountedRef.current) {
        setOrders(data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      if (isMountedRef.current) {
        setError(err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchOrders();

    // Subscribe to orders changes
    const ordersChannel = supabase
      .channel('orders-realtime-all')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        console.log('Orders change:', payload);

        if (payload.eventType === 'INSERT' && onNewOrder) {
          onNewOrder(payload.new);
        }

        if (payload.eventType === 'UPDATE' && onOrderUpdate) {
          onOrderUpdate(payload.new, payload.old);
        }

        // Refetch to ensure consistency
        fetchOrders();
      })
      .subscribe();

    // Subscribe to order_items changes
    const orderItemsChannel = supabase
      .channel('order-items-realtime-all')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items'
      }, (payload) => {
        console.log('Order items change:', payload);

        if (onItemUpdate) {
          onItemUpdate(payload);
        }

        // Refetch to ensure consistency
        fetchOrders();
      })
      .subscribe();

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(orderItemsChannel);
    };
  }, [enabled, fetchOrders, onNewOrder, onOrderUpdate, onItemUpdate]);

  return { orders, loading, error, refetch: fetchOrders };
};

export default useRealtimeOrders;
