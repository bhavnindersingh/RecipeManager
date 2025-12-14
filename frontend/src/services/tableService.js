import { supabase } from '../config/supabase';

export const tableService = {
  /**
   * Get all tables
   */
  async getAllTables() {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('is_active', true)
        .order('table_number');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw error;
    }
  },

  /**
   * Get table by ID with current order
   */
  async getTableWithOrder(tableId) {
    try {
      const { data, error } = await supabase.rpc('get_table_with_order', {
        table_id_param: tableId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching table with order:', error);
      throw error;
    }
  },

  /**
   * Get tables with their current orders
   */
  async getTablesWithOrders() {
    try {
      // Get all tables
      const { data: tables, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('is_active', true)
        .order('table_number');

      if (tablesError) throw tablesError;

      // Get active orders for all tables
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            recipe:recipes (*)
          )
        `)
        .in('status', ['pending', 'cooking', 'ready'])
        .not('table_id', 'is', null);

      if (ordersError) throw ordersError;

      // Combine tables with their orders
      const tablesWithOrders = tables.map(table => {
        const tableOrders = orders.filter(order => order.table_id === table.id);
        const currentOrder = tableOrders[0] || null;

        return {
          ...table,
          current_order: currentOrder,
          order_count: tableOrders.length
        };
      });

      return tablesWithOrders;
    } catch (error) {
      console.error('Error fetching tables with orders:', error);
      throw error;
    }
  },

  /**
   * Update table status
   */
  async updateTableStatus(tableId, status) {
    try {
      const { data, error } = await supabase
        .from('tables')
        .update({ status })
        .eq('id', tableId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating table status:', error);
      throw error;
    }
  },

  /**
   * Create a new table
   */
  async createTable(tableData) {
    try {
      const { data, error } = await supabase
        .from('tables')
        .insert([tableData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  },

  /**
   * Update table details
   */
  async updateTable(tableId, tableData) {
    try {
      const { data, error } = await supabase
        .from('tables')
        .update(tableData)
        .eq('id', tableId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating table:', error);
      throw error;
    }
  },

  /**
   * Clear table (set to available and remove association)
   */
  async clearTable(tableId) {
    try {
      const { data, error} = await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', tableId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error clearing table:', error);
      throw error;
    }
  },

  /**
   * Subscribe to table changes
   */
  subscribeToTables(callback) {
    const channel = supabase
      .channel('tables-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tables'
      }, (payload) => {
        callback(payload);
      })
      .subscribe();

    return channel;
  },

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channel) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  }
};

export default tableService;
