import { supabase } from '../config/supabase';
import { authService } from './authService';

export const stockService = {
  /**
   * Get all stock levels with ingredient details
   * @returns {Promise<Array>} Stock levels with ingredient info
   */
  async getAllStockLevels() {
    try {
      // Fetch all three datasets in parallel
      const [stockResult, ingredientsResult, settingsResult] = await Promise.all([
        supabase
          .from('ingredient_stock')
          .select('*')
          .order('current_quantity', { ascending: true }),
        supabase
          .from('ingredients')
          .select('id, name, unit, category, cost, minimum_stock'),
        supabase
          .from('stock_settings')
          .select('ingredient_id, reorder_quantity, storage_location')
      ]);

      // Check for errors
      if (stockResult.error) throw stockResult.error;
      if (ingredientsResult.error) throw ingredientsResult.error;
      if (settingsResult.error) throw settingsResult.error;

      // Create lookup maps for O(1) joins
      const ingredientsMap = {};
      (ingredientsResult.data || []).forEach(ing => {
        ingredientsMap[ing.id] = ing;
      });

      const settingsMap = {};
      (settingsResult.data || []).forEach(setting => {
        settingsMap[setting.ingredient_id] = setting;
      });

      // Join data in JavaScript
      const joined = (stockResult.data || []).map(stock => ({
        ...stock,
        ingredient: ingredientsMap[stock.ingredient_id] || null,
        settings: settingsMap[stock.ingredient_id] || null
      }));

      return joined;
    } catch (error) {
      console.error('Error fetching stock levels:', error);
      throw error;
    }
  },

  /**
   * Get stock level for a specific ingredient
   * @param {number} ingredientId - Ingredient ID
   * @returns {Promise<Object>} Stock level data
   */
  async getStockByIngredient(ingredientId) {
    try {
      // Fetch data from all three tables in parallel
      const [stockResult, ingredientResult, settingsResult] = await Promise.all([
        supabase
          .from('ingredient_stock')
          .select('*')
          .eq('ingredient_id', ingredientId)
          .single(),
        supabase
          .from('ingredients')
          .select('id, name, unit, category, cost, minimum_stock')
          .eq('id', ingredientId)
          .single(),
        supabase
          .from('stock_settings')
          .select('ingredient_id, reorder_quantity, storage_location')
          .eq('ingredient_id', ingredientId)
          .maybeSingle() // Use maybeSingle as settings might not exist
      ]);

      if (stockResult.error) throw stockResult.error;
      if (ingredientResult.error) throw ingredientResult.error;
      // Settings error is ok if it doesn't exist

      // Join data
      return {
        ...stockResult.data,
        ingredient: ingredientResult.data,
        settings: settingsResult.data || null
      };
    } catch (error) {
      console.error('Error fetching stock for ingredient:', error);
      throw error;
    }
  },

  /**
   * Get low stock items (below minimum level)
   * @returns {Promise<Array>} Low stock items
   */
  async getLowStockItems() {
    try {
      // Get all stock levels (which already does the joining)
      const allStock = await this.getAllStockLevels();

      // Filter for items where current_quantity < minimum_quantity
      const lowStockItems = allStock.filter(
        item => item.current_quantity < item.minimum_quantity
      );

      return lowStockItems;
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      throw error;
    }
  },

  /**
   * Create a stock transaction
   * @param {Object} transactionData - Transaction details
   * @returns {Promise<Object>} Created transaction
   */
  async createTransaction(transactionData) {
    try {
      const currentUser = authService.getCurrentUser();

      const { data, error } = await supabase
        .from('stock_transactions')
        .insert([{
          ingredient_id: transactionData.ingredient_id,
          transaction_type: transactionData.transaction_type,
          quantity: transactionData.quantity,
          unit_cost: transactionData.unit_cost || null,
          reference_no: transactionData.reference_no || null,
          notes: transactionData.notes || null,
          created_by: currentUser?.id || null
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating stock transaction:', error);
      throw error;
    }
  },

  /**
   * Get stock transaction history
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Transaction history
   */
  async getTransactions(filters = {}) {
    try {
      // Build query for transactions
      let query = supabase
        .from('stock_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.ingredient_id) {
        query = query.eq('ingredient_id', filters.ingredient_id);
      }
      if (filters.transaction_type) {
        query = query.eq('transaction_type', filters.transaction_type);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Get unique ingredient IDs and user IDs
      const ingredientIds = [...new Set(transactions.map(tx => tx.ingredient_id))];
      const userIds = [...new Set(transactions.map(tx => tx.created_by).filter(Boolean))];

      // Fetch ingredients and profiles in parallel
      const [ingredientsResult, profilesResult] = await Promise.all([
        ingredientIds.length > 0
          ? supabase.from('ingredients').select('id, name, unit').in('id', ingredientIds)
          : { data: [], error: null },
        userIds.length > 0
          ? supabase.from('profiles').select('id, name').in('id', userIds)
          : { data: [], error: null }
      ]);

      // Create lookup maps
      const ingredientsMap = {};
      (ingredientsResult.data || []).forEach(ing => {
        ingredientsMap[ing.id] = ing;
      });

      const profilesMap = {};
      (profilesResult.data || []).forEach(profile => {
        profilesMap[profile.id] = profile;
      });

      // Join data
      const joined = transactions.map(tx => ({
        ...tx,
        ingredient: ingredientsMap[tx.ingredient_id] || null,
        created_by_profile: tx.created_by ? profilesMap[tx.created_by] : null
      }));

      return joined;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  },

  /**
   * Update stock settings for an ingredient
   * @param {number} ingredientId - Ingredient ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateStockSettings(ingredientId, settings) {
    try {
      const { data, error } = await supabase
        .from('stock_settings')
        .upsert({
          ingredient_id: ingredientId,
          min_stock_level: settings.min_stock_level,
          reorder_quantity: settings.reorder_quantity,
          storage_location: settings.storage_location || null,
          notes: settings.notes || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating stock settings:', error);
      throw error;
    }
  },

  /**
   * Bulk add stock transactions
   * @param {Array} transactions - Array of transaction data
   * @returns {Promise<Array>} Created transactions
   */
  async bulkAddTransactions(transactions) {
    try {
      const currentUser = authService.getCurrentUser();

      const transactionsWithUser = transactions.map(t => ({
        ...t,
        created_by: currentUser?.id || null
      }));

      const { data, error } = await supabase
        .from('stock_transactions')
        .insert(transactionsWithUser)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error bulk adding transactions:', error);
      throw error;
    }
  },

  /**
   * Get stock summary statistics
   * @returns {Promise<Object>} Stock statistics
   */
  async getStockSummary() {
    try {
      // Fetch stock data and ingredients in parallel
      const [stockResult, ingredientsResult, txCountResult] = await Promise.all([
        supabase
          .from('ingredient_stock')
          .select('ingredient_id, current_quantity, minimum_quantity, unit_cost_avg'),
        supabase
          .from('ingredients')
          .select('id, cost, minimum_stock'),
        // Get recent transactions count (last 24 hours)
        supabase
          .from('stock_transactions')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ]);

      if (stockResult.error) throw stockResult.error;
      if (ingredientsResult.error) throw ingredientsResult.error;
      if (txCountResult.error) throw txCountResult.error;

      // Create ingredients map
      const ingredientsMap = {};
      (ingredientsResult.data || []).forEach(ing => {
        ingredientsMap[ing.id] = ing;
      });

      const stockData = stockResult.data || [];

      // Calculate low stock count
      const lowStockCount = stockData.filter(
        item => item.current_quantity < item.minimum_quantity
      ).length;

      // Calculate total stock value
      const totalValue = stockData.reduce((sum, item) => {
        const ingredient = ingredientsMap[item.ingredient_id];
        const cost = item.unit_cost_avg || ingredient?.cost || 0;
        return sum + (item.current_quantity * cost);
      }, 0);

      return {
        totalItems: stockData.length,
        totalValue,
        lowStockCount,
        recentTransactionsCount: txCountResult.count || 0
      };
    } catch (error) {
      console.error('Error fetching stock summary:', error);
      throw error;
    }
  },

  /**
   * Export stock data to array for Excel
   * @returns {Promise<Array>} Stock data for export
   */
  async exportStockData() {
    try {
      const stockLevels = await this.getAllStockLevels();

      return stockLevels.map(stock => ({
        'Ingredient': stock.ingredient.name,
        'Category': stock.ingredient.category,
        'Current Stock': stock.current_quantity,
        'Unit': stock.ingredient.unit,
        'Minimum Level': stock.minimum_quantity,
        'Avg Cost (₹)': stock.unit_cost_avg || stock.ingredient.cost,
        'Total Value (₹)': (stock.current_quantity * (stock.unit_cost_avg || stock.ingredient.cost)).toFixed(2),
        'Status': stock.current_quantity < stock.minimum_quantity ? 'Low Stock' : 'OK',
        'Storage': stock.settings?.storage_location || '-'
      }));
    } catch (error) {
      console.error('Error exporting stock data:', error);
      throw error;
    }
  }
};

export default stockService;
