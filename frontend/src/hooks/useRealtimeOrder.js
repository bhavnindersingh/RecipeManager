import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { orderService } from '../services/orderService';

/**
 * Hook to subscribe to realtime updates for a specific order
 * @param {number} orderId - The order ID to track
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether to enable the subscription (default: true)
 * @param {Function} options.onUpdate - Callback when order is updated
 * @param {Function} options.onItemsChange - Callback when order items change
 * @returns {Object} { order, loading, error }
 */
export const useRealtimeOrder = (orderId, options = {}) => {
  const { enabled = true, onUpdate, onItemsChange } = options;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId || !enabled) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Initial fetch
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const data = await orderService.getOrderById(orderId);
        if (isMounted) {
          setOrder(data);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrder();

    // Subscribe to order updates
    const orderChannel = supabase
      .channel(`order-${orderId}-updates`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, async (payload) => {
        console.log('Order updated:', payload);

        // Refetch full order data
        try {
          const updatedOrder = await orderService.getOrderById(orderId);
          if (isMounted) {
            setOrder(updatedOrder);
            if (onUpdate) {
              onUpdate(updatedOrder, payload);
            }
          }
        } catch (err) {
          console.error('Error refetching order:', err);
        }
      })
      .subscribe();

    // Subscribe to order items changes
    const orderItemsChannel = supabase
      .channel(`order-items-${orderId}-updates`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items',
        filter: `order_id=eq.${orderId}`
      }, async (payload) => {
        console.log('Order items updated:', payload);

        // Refetch full order data
        try {
          const updatedOrder = await orderService.getOrderById(orderId);
          if (isMounted) {
            setOrder(updatedOrder);
            if (onItemsChange) {
              onItemsChange(updatedOrder, payload);
            }
          }
        } catch (err) {
          console.error('Error refetching order:', err);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(orderItemsChannel);
    };
  }, [orderId, enabled, onUpdate, onItemsChange]);

  return { order, loading, error };
};

export default useRealtimeOrder;
