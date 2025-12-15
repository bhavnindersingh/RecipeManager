import { supabase } from '../config/supabase';
import { authService } from './authService';

export const orderService = {
  /**
   * Create a new order
   * @param {Object} orderData - Order details
   * @param {Array} orderData.items - Array of { recipe_id, quantity, unit_price, notes }
   * @param {string} orderData.order_type - 'dine-in', 'delivery', or 'takeaway'
   * @param {string} orderData.table_number - Table number (optional)
   * @param {string} orderData.customer_name - Customer name (optional)
   * @param {string} orderData.customer_phone - Customer phone (optional)
   * @param {string} orderData.notes - Order notes (optional)
   * @returns {Promise<Object>} Created order with items
   */
  async createOrder(orderData) {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { items, ...orderFields } = orderData;

      // Calculate total amount
      const totalAmount = items.reduce((sum, item) =>
        sum + (item.quantity * item.unit_price), 0
      );

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          ...orderFields,
          created_by: currentUser.id,
          total_amount: totalAmount,
          status: 'pending'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      if (items && items.length > 0) {
        const orderItems = items.map(item => ({
          order_id: order.id,
          recipe_id: item.recipe_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes || null,
          item_status: 'pending'
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      // Return complete order
      return this.getOrderById(order.id);
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  /**
   * Get all orders with optional filters
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Filter by status
   * @param {string} filters.order_type - Filter by order type
   * @param {number} filters.created_by - Filter by creator
   * @returns {Promise<Array>} Array of orders
   */
  async getAllOrders(filters = {}) {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          created_by_profile:profiles!created_by(id, name, role),
          order_items(
            id,
            quantity,
            unit_price,
            item_status,
            notes,
            recipe:recipes(*)
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.order_type) {
        query = query.eq('order_type', filters.order_type);
      }
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  /**
   * Get single order by ID
   * @param {number} id - Order ID
   * @returns {Promise<Object>} Order with items
   */
  async getOrderById(id) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          created_by_profile:profiles!created_by(id, name, role),
          order_items(
            id,
            quantity,
            unit_price,
            item_status,
            notes,
            recipe:recipes(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  /**
   * Update order status
   * @param {number} id - Order ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated order
   */
  async updateOrderStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  /**
   * Update order item status
   * @param {number} itemId - Order item ID
   * @param {string} status - New item status
   * @returns {Promise<Object>} Updated item
   */
  async updateItemStatus(itemId, status) {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .update({ item_status: status })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating item status:', error);
      throw error;
    }
  },

  /**
   * Cancel an order
   * @param {number} id - Order ID
   * @returns {Promise<Object>} Cancelled order
   */
  async cancelOrder(id) {
    return this.updateOrderStatus(id, 'cancelled');
  },

  /**
   * Get orders for KDS (pending, cooking, ready)
   * @returns {Promise<Array>} Active orders for kitchen
   */
  async getKitchenOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          created_by_profile:profiles!created_by(id, name, role),
          order_items(
            id,
            quantity,
            unit_price,
            item_status,
            notes,
            recipe:recipes(id, name, category)
          )
        `)
        .in('status', ['pending', 'cooking', 'ready'])
        .order('created_at', { ascending: true }); // Oldest first

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
      throw error;
    }
  },

  /**
   * Get orders by table ID
   * @param {number} tableId - Table ID
   * @returns {Promise<Array>} Orders for the table
   */
  async getOrdersByTable(tableId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          created_by_profile:profiles!created_by(id, name, role),
          order_items(
            id,
            quantity,
            unit_price,
            item_status,
            notes,
            recipe:recipes(*)
          )
        `)
        .eq('table_id', tableId)
        .in('status', ['pending', 'cooking', 'ready'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching table orders:', error);
      throw error;
    }
  },

  /**
   * Add items to existing order
   * @param {number} orderId - Order ID
   * @param {Array} items - Array of { recipe_id, quantity, unit_price, notes }
   * @returns {Promise<Object>} Updated order
   */
  async addItemsToOrder(orderId, items) {
    try {
      // Create new order items
      const orderItems = items.map(item => ({
        order_id: orderId,
        recipe_id: item.recipe_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        notes: item.notes || null,
        item_status: 'pending'
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Recalculate and update order total
      const { data: allItems, error: fetchError } = await supabase
        .from('order_items')
        .select('quantity, unit_price')
        .eq('order_id', orderId);

      if (fetchError) throw fetchError;

      const newTotal = allItems.reduce((sum, item) =>
        sum + (item.quantity * item.unit_price), 0
      );

      const { error: updateError } = await supabase
        .from('orders')
        .update({ total_amount: newTotal })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Return updated order
      return this.getOrderById(orderId);
    } catch (error) {
      console.error('Error adding items to order:', error);
      throw error;
    }
  },

  /**
   * Subscribe to orders changes (Realtime)
   * @param {Function} callback - Callback function for changes
   * @returns {Object} Supabase subscription channel
   */
  subscribeToOrders(callback) {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order change:', payload);
          callback(payload);
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * Subscribe to order items changes (Realtime)
   * @param {Function} callback - Callback function for changes
   * @returns {Object} Supabase subscription channel
   */
  subscribeToOrderItems(callback) {
    const channel = supabase
      .channel('order-items-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items'
        },
        (payload) => {
          console.log('Order item change:', payload);
          callback(payload);
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * Unsubscribe from realtime channel
   * @param {Object} channel - Supabase channel to unsubscribe
   */
  unsubscribe(channel) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  },

  /**
   * Get order statistics
   * @returns {Promise<Object>} Order statistics
   */
  async getOrderStats() {
    try {
      const { data, error } = await supabase.rpc('get_order_stats');

      if (error) throw error;
      return data && data.length > 0 ? data[0] : {
        total_orders: 0,
        pending_orders: 0,
        cooking_orders: 0,
        ready_orders: 0,
        served_orders: 0,
        total_revenue: 0
      };
    } catch (error) {
      console.error('Error fetching order stats:', error);
      throw error;
    }
  },

  /**
   * Get orders by platform type (swiggy, zomato, takeaway, dine-in)
   * @param {string} orderType - Order type to filter by
   * @returns {Promise<Array>} Orders of the specified type
   */
  async getOrdersByType(orderType) {
    try {
      const { data, error } = await supabase.rpc('get_orders_by_type', {
        type_param: orderType
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${orderType} orders:`, error);
      throw error;
    }
  },

  /**
   * Get order statistics grouped by type
   * @returns {Promise<Array>} Statistics for each order type
   */
  async getOrderStatsByType() {
    try {
      const { data, error } = await supabase.rpc('get_order_stats_by_type');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching order stats by type:', error);
      throw error;
    }
  },

  /**
   * Get delivery orders (swiggy + zomato)
   * @returns {Promise<Array>} All delivery platform orders
   */
  async getDeliveryOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          created_by_profile:profiles!created_by(id, name, role),
          order_items(
            id,
            quantity,
            unit_price,
            item_status,
            notes,
            recipe:recipes(*)
          )
        `)
        .in('order_type', ['swiggy', 'zomato'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching delivery orders:', error);
      throw error;
    }
  },

  /**
   * Get paginated orders with filters and payment details
   * @param {Object} options - Pagination and filter options
   * @param {number} options.page - Page number (1-indexed)
   * @param {number} options.limit - Items per page (default: 100)
   * @param {string} options.orderType - Filter by order type
   * @param {string} options.paymentStatus - Filter by payment status
   * @param {string} options.paymentMethod - Filter by payment method
   * @param {string} options.dateFrom - Start date (ISO string)
   * @param {string} options.dateTo - End date (ISO string)
   * @param {string} options.search - Search order number or customer name
   * @returns {Promise<Object>} { orders, total, page, totalPages }
   */
  async getOrdersPaginated(options = {}) {
    try {
      const {
        page = 1,
        limit = 100,
        orderType,
        paymentStatus,
        paymentMethod,
        dateFrom,
        dateTo,
        search
      } = options;

      const offset = (page - 1) * limit;

      // Build query for orders with payments
      let query = supabase
        .from('orders')
        .select(`
          *,
          created_by_profile:profiles!created_by(id, name, role),
          order_items(
            id,
            quantity,
            unit_price,
            item_status,
            notes,
            recipe:recipes(id, name, category)
          ),
          payments(
            id,
            amount,
            payment_method,
            payment_status,
            transaction_reference,
            cash_received,
            change_amount,
            paid_by_name
          )
        `, { count: 'exact' });

      // Apply filters
      if (orderType && orderType !== 'all') {
        query = query.eq('order_type', orderType);
      }

      if (paymentStatus && paymentStatus !== 'all') {
        query = query.eq('payment_status', paymentStatus);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      if (search) {
        query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
      }

      // Apply pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: orders, error, count } = await query;

      if (error) throw error;

      // Filter by payment method if needed (done in memory since payments is a joined table)
      let filteredOrders = orders || [];
      if (paymentMethod && paymentMethod !== 'all') {
        filteredOrders = filteredOrders.filter(order =>
          order.payments && order.payments.some(p => p.payment_method === paymentMethod)
        );
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        orders: filteredOrders,
        total: count || 0,
        page,
        totalPages,
        limit
      };
    } catch (error) {
      console.error('Error fetching paginated orders:', error);
      throw error;
    }
  },

  /**
   * Get order count with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} Total count of filtered orders
   */
  async getOrdersCount(filters = {}) {
    try {
      let query = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true });

      // Apply filters
      if (filters.orderType && filters.orderType !== 'all') {
        query = query.eq('order_type', filters.orderType);
      }

      if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        query = query.eq('payment_status', filters.paymentStatus);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters.search) {
        query = query.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error counting orders:', error);
      throw error;
    }
  },

  /**
   * Get order with full payment details
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} Order with payments and splits
   */
  async getOrderWithPayments(orderId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          created_by_profile:profiles!created_by(id, name, role),
          order_items(
            id,
            quantity,
            unit_price,
            item_status,
            notes,
            recipe:recipes(*)
          ),
          payments(
            id,
            amount,
            payment_method,
            payment_status,
            transaction_reference,
            cash_received,
            change_amount,
            paid_by_name,
            created_at,
            payment_splits(
              id,
              amount,
              payment_method,
              transaction_reference,
              paid_by_name
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching order with payments:', error);
      throw error;
    }
  }
};

export default orderService;
