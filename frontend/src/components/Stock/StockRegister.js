import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { stockService } from '../../services/stockService';
import StockListItem from './StockListItem';
import StockEditModal from './StockEditModal';
import '../../styles/StockRegister.css';

const StockRegister = () => {
  // State management
  const [stockLevels, setStockLevels] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
    recentTransactionsCount: 0
  });

  // UI State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quick-update'); // quick-update, stock-levels, transactions
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [modalActionType, setModalActionType] = useState('add'); // add, remove, adjust

  // Filter State
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('low'); // Default to low stock
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name, stock, category

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stockData, summaryData, recentTx] = await Promise.all([
        stockService.getAllStockLevels(),
        stockService.getStockSummary(),
        stockService.getTransactions({ limit: 50 })
      ]);

      setStockLevels(stockData);
      setSummary(summaryData);
      setTransactions(recentTx);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('Failed to load stock data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show message helper
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // Handle action button clicks on list items
  const handleAction = (actionType, stock) => {
    setModalActionType(actionType);
    // Add ingredient info to stock object for modal
    setSelectedStock({
      ...stock,
      ...stock.ingredient
    });
    setIsModalOpen(true);
  };

  // Handle modal save
  const handleModalSave = async (transactionData) => {
    try {
      await stockService.createTransaction(transactionData);

      const actionLabels = {
        purchase: 'added',
        wastage: 'removed',
        adjustment: 'adjusted'
      };

      showMessage(
        `Stock ${actionLabels[transactionData.transaction_type]} successfully!`,
        'success'
      );

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error; // Let modal handle the error display
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const exportData = await stockService.exportStockData();

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 25 }, // Ingredient
        { wch: 20 }, // Category
        { wch: 15 }, // Current Stock
        { wch: 8 },  // Unit
        { wch: 15 }, // Minimum Level
        { wch: 12 }, // Avg Cost
        { wch: 15 }, // Total Value
        { wch: 12 }, // Status
        { wch: 15 }  // Storage
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Stock Levels');
      XLSX.writeFile(wb, `stock_register_${new Date().toISOString().split('T')[0]}.xlsx`);
      showMessage('Stock data exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting:', error);
      showMessage('Failed to export data', 'error');
    }
  };

  // Get stock status
  const getStockStatus = (currentQty, minQty) => {
    if (currentQty === 0) return 'out';
    if (currentQty < minQty) return 'low';
    if (currentQty < minQty * 1.5) return 'medium';
    return 'good';
  };

  // Get category emoji
  const getCategoryEmoji = (category) => {
    const categoryEmojis = {
      'Vegetables': '🥕',
      'Fruits': '🍎',
      'Dairy': '🥛',
      'Grains': '🌾',
      'Spices': '🌶️',
      'Meat': '🥩',
      'Seafood': '🐟',
      'Beverages': '☕',
      'Bakery': '🍞',
      'Oil': '🫗',
      'Default': '📦'
    };
    return categoryEmojis[category] || categoryEmojis['Default'];
  };

  // Extract unique categories from stock levels
  const categories = [...new Set(stockLevels.map(s => s.ingredient?.category).filter(Boolean))].sort();

  // Get category counts
  const categoryCounts = stockLevels.reduce((acc, stock) => {
    const cat = stock.ingredient?.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Filter and sort stock levels
  const filteredStockLevels = stockLevels
    .filter(stock => {
      const matchesSearch = stock.ingredient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.ingredient?.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'low' && stock.current_quantity < stock.minimum_quantity) ||
        (filterStatus === 'out' && stock.current_quantity === 0) ||
        (filterStatus === 'ok' && stock.current_quantity >= stock.minimum_quantity);

      const matchesCategory = filterCategory === 'all' ||
        stock.ingredient?.category === filterCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return (a.ingredient?.name || '').localeCompare(b.ingredient?.name || '');
      } else if (sortBy === 'stock') {
        return a.current_quantity - b.current_quantity;
      } else if (sortBy === 'category') {
        return (a.ingredient?.category || '').localeCompare(b.ingredient?.category || '');
      }
      return 0;
    });

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesType = filterType === 'all' || tx.transaction_type === filterType;
    const matchesSearch = searchTerm === '' ||
      tx.ingredient.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="stock-register">
      {/* Toast Message */}
      {message.text && (
        <div className={`toast-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="page-title-card">
        <h1 className="page-title">Stock Register</h1>
        <div className="header-actions">
          {/* Compact Tab Pills */}
          <div className="tab-pills">
            <button
              className={`tab-pill ${activeTab === 'quick-update' ? 'active' : ''}`}
              onClick={() => setActiveTab('quick-update')}
              title="Quick Update"
            >
              ⚡ Quick
            </button>
            <button
              className={`tab-pill ${activeTab === 'stock-levels' ? 'active' : ''}`}
              onClick={() => setActiveTab('stock-levels')}
              title="Stock Levels"
            >
              📊 Levels
            </button>
            <button
              className={`tab-pill ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
              title="Transaction History"
            >
              📋 History
            </button>
          </div>
          <button className="btn-export" onClick={handleExport} title="Export to Excel">
            📥 Export
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stock-summary">
        <div className="summary-card">
          <div className="summary-label">Total Items</div>
          <div className="summary-value">{summary.totalItems}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Value</div>
          <div className="summary-value">₹{summary.totalValue.toFixed(2)}</div>
        </div>
        <div className="summary-card alert">
          <div className="summary-label">Low Stock Items</div>
          <div className="summary-value">{summary.lowStockCount}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Recent Transactions (24h)</div>
          <div className="summary-value">{summary.recentTransactionsCount}</div>
        </div>
      </div>

      {/* Quick Update Tab - NEW LIST VIEW */}
      {activeTab === 'quick-update' && (
        <div className="quick-update-section">
          {/* Filters */}
          <div className="filters-bar">
            <input
              type="text"
              placeholder="🔍 Search ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="low">⚠️ Low Stock</option>
              <option value="out">❌ Out of Stock</option>
              <option value="ok">✅ OK</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="name">Sort: Name</option>
              <option value="stock">Sort: Stock Level</option>
              <option value="category">Sort: Category</option>
            </select>
          </div>

          {/* Category Filter Pills */}
          <div className="category-filter-bar">
            <button
              className={`category-pill ${filterCategory === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCategory('all')}
            >
              <span className="category-icon">📦</span>
              All ({stockLevels.length})
            </button>
            {categories.map(category => (
              <button
                key={category}
                className={`category-pill ${filterCategory === category ? 'active' : ''}`}
                onClick={() => setFilterCategory(category)}
              >
                <span className="category-icon">{getCategoryEmoji(category)}</span>
                {category} ({categoryCounts[category] || 0})
              </button>
            ))}
          </div>

          {/* Results Counter */}
          <div className="results-counter">
            Showing {filteredStockLevels.length} of {stockLevels.length} items
          </div>

          {/* Stock List */}
          <div className="stock-list-container">
            {loading ? (
              <div className="loading-state">Loading ingredients...</div>
            ) : filteredStockLevels.length === 0 ? (
              <div className="empty-state">
                {searchTerm ? 'No ingredients match your search' : 'No stock data found'}
              </div>
            ) : (
              <div className="stock-list">
                {filteredStockLevels.map(stock => (
                  <StockListItem
                    key={stock.ingredient_id}
                    stock={stock}
                    onAction={handleAction}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stock Levels Tab - EXISTING TABLE VIEW */}
      {activeTab === 'stock-levels' && (
        <div className="stock-levels-section">
          {/* Filters */}
          <div className="filters-bar">
            <input
              type="text"
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
              <option value="ok">OK</option>
            </select>
          </div>

          {/* Stock Levels Table */}
          <div className="table-container">
            {loading ? (
              <div className="loading-state">Loading stock levels...</div>
            ) : filteredStockLevels.length === 0 ? (
              <div className="empty-state">No stock data found</div>
            ) : (
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Min Level</th>
                    <th>Avg Cost</th>
                    <th>Total Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockLevels.map(stock => {
                    const status = getStockStatus(stock.current_quantity, stock.minimum_quantity);
                    const totalValue = stock.current_quantity * (stock.unit_cost_avg || stock.ingredient.cost);

                    return (
                      <tr key={stock.ingredient_id} className={`status-${status}`}>
                        <td className="ingredient-name">{stock.ingredient.name}</td>
                        <td>{stock.ingredient.category}</td>
                        <td className="stock-quantity">
                          {stock.current_quantity.toFixed(2)} {stock.ingredient.unit}
                        </td>
                        <td>{stock.minimum_quantity.toFixed(2)} {stock.ingredient.unit}</td>
                        <td>₹{(stock.unit_cost_avg || stock.ingredient.cost).toFixed(2)}</td>
                        <td className="stock-value">₹{totalValue.toFixed(2)}</td>
                        <td>
                          <span className={`status-badge status-${status}`}>
                            {status === 'out' && '❌ Out'}
                            {status === 'low' && '⚠️ Low'}
                            {status === 'medium' && '⚡ Medium'}
                            {status === 'good' && '✅ Good'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Transaction History Tab */}
      {activeTab === 'transactions' && (
        <div className="transactions-section">
          {/* Filters */}
          <div className="filters-bar">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="adjustment">Adjustment</option>
              <option value="wastage">Wastage</option>
              <option value="usage">Usage</option>
            </select>
          </div>

          {/* Transactions Table */}
          <div className="table-container">
            {loading ? (
              <div className="loading-state">Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="empty-state">No transactions found</div>
            ) : (
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Ingredient</th>
                    <th>Quantity</th>
                    <th>Unit Cost</th>
                    <th>Reference</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id}>
                      <td className="tx-date">
                        {new Date(tx.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td>
                        <span className={`tx-type tx-${tx.transaction_type}`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td>{tx.ingredient.name}</td>
                      <td className="tx-quantity">
                        {tx.quantity.toFixed(2)} {tx.ingredient.unit}
                      </td>
                      <td>
                        {tx.unit_cost ? `₹${tx.unit_cost.toFixed(2)}` : '-'}
                      </td>
                      <td>{tx.reference_no || '-'}</td>
                      <td>{tx.created_by_profile?.name || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Stock Edit Modal */}
      <StockEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ingredient={selectedStock}
        actionType={modalActionType}
        onSave={handleModalSave}
      />
    </div>
  );
};

export default StockRegister;
