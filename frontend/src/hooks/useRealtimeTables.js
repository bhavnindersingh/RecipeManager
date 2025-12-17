import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { tableService } from '../services/tableService';

/**
 * Hook to subscribe to realtime updates for tables with their orders
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether to enable the subscription (default: true)
 * @param {Function} options.onTableUpdate - Callback when table is updated
 * @param {Function} options.onOrderChange - Callback when order affecting tables changes
 * @returns {Object} { tables, loading, error, refetch }
 */
export const useRealtimeTables = (options = {}) => {
  const { enabled = true, onTableUpdate, onOrderChange } = options;
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  // Fetch tables with orders
  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tableService.getTablesWithOrders();
      if (isMountedRef.current) {
        setTables(data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
      if (isMountedRef.current) {
        setError(err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchTables();

    // Subscribe to tables changes
    const tablesChannel = supabase
      .channel('tables-realtime-all')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tables'
      }, (payload) => {
        console.log('Tables change:', payload);

        if (onTableUpdate) {
          onTableUpdate(payload);
        }

        fetchTables();
      })
      .subscribe();

    // Subscribe to orders changes (affects table status)
    const ordersChannel = supabase
      .channel('tables-orders-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        console.log('Order change affecting tables:', payload);

        // Only refetch if order has table_id or status changed
        const shouldRefetch =
          payload.new?.table_id ||
          payload.old?.table_id ||
          (payload.new?.status !== payload.old?.status);

        if (shouldRefetch) {
          if (onOrderChange) {
            onOrderChange(payload);
          }
          fetchTables();
        }
      })
      .subscribe();

    // Subscribe to order_items changes (affects order totals on tables)
    const orderItemsChannel = supabase
      .channel('tables-order-items-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items'
      }, (payload) => {
        console.log('Order items change affecting tables:', payload);
        fetchTables();
      })
      .subscribe();

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(orderItemsChannel);
    };
  }, [enabled, fetchTables, onTableUpdate, onOrderChange]);

  return { tables, loading, error, refetch: fetchTables };
};

export default useRealtimeTables;
