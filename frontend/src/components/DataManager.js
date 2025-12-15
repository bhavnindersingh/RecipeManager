import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { orderService } from '../services/orderService';
import '../styles/DataManager.css';

const DataManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    ordersToday: 0
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 100;

  // Filter state
  const [filters, setFilters] = useState({
    orderType: 'all',
    paymentStatus: 'all',
    paymentMethod: 'all',
    dateRange: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });

  const getDateRange = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filters.dateRange) {
      case 'today':
        return {
          dateFrom: today.toISOString(),
          dateTo: new Date().toISOString()
        };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          dateFrom: yesterday.toISOString(),
          dateTo: today.toISOString()
        };
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        return {
          dateFrom: last7.toISOString(),
          dateTo: new Date().toISOString()
        };
      case 'last30days':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        return {
          dateFrom: last30.toISOString(),
          dateTo: new Date().toISOString()
        };
      case 'custom':
        return {
          dateFrom: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : undefined,
          dateTo: filters.dateTo ? new Date(filters.dateTo).toISOString() : undefined
        };
      default:
        return {};
    }
  }, [filters.dateRange, filters.dateFrom, filters.dateTo]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { dateFrom, dateTo } = getDateRange();

      const result = await orderService.getOrdersPaginated({
        page: currentPage,
        limit: itemsPerPage,
        orderType: filters.orderType,
        paymentStatus: filters.paymentStatus,
        paymentMethod: filters.paymentMethod,
        dateFrom,
        dateTo,
        search: filters.search
      });

      setOrders(result.orders);
      setTotalPages(result.totalPages);
      setTotalCount(result.total);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, getDateRange]);

  const calculateStats = useCallback(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ordersToday = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= today;
    }).length;

    setStats({
      totalOrders: totalCount,
      totalRevenue,
      avgOrderValue,
      ordersToday
    });
  }, [orders, totalCount]);

  // Load orders on mount and when filters/page change
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Calculate stats whenever orders change
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const handleExportOrders = () => {
    try {
      const exportData = orders.map(order => {
        const payment = order.payments?.[0];
        return {
          'Order #': order.order_number,
          'Date': new Date(order.created_at).toLocaleString('en-IN'),
          'Type': formatOrderType(order.order_type),
          'Customer': order.customer_name || '-',
          'Phone': order.customer_phone || '-',
          'Items': order.order_items?.length || 0,
          'Amount (₹)': parseFloat(order.total_amount).toFixed(2),
          'Payment Status': order.payment_status || 'unpaid',
          'Payment Method': payment?.payment_method || '-',
          'Status': order.status,
          'Table': order.table_id || '-',
          'Platform Order ID': order.delivery_platform_order_id || '-',
          'Notes': order.notes || ''
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // Order #
        { wch: 20 }, // Date
        { wch: 12 }, // Type
        { wch: 20 }, // Customer
        { wch: 15 }, // Phone
        { wch: 8 },  // Items
        { wch: 12 }, // Amount
        { wch: 15 }, // Payment Status
        { wch: 15 }, // Payment Method
        { wch: 12 }, // Status
        { wch: 10 }, // Table
        { wch: 20 }, // Platform Order ID
        { wch: 30 }  // Notes
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Orders');

      const fileName = `orders_${filters.dateRange || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error exporting orders:', error);
    }
  };

  const formatOrderType = (type) => {
    const types = {
      'dine-in': 'Dine-In',
      'takeaway': 'Takeaway',
      'swiggy': 'Swiggy',
      'zomato': 'Zomato'
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getPaymentMethodDisplay = (order) => {
    if (!order.payments || order.payments.length === 0) {
      return '-';
    }

    if (order.payments.length === 1) {
      return order.payments[0].payment_method?.toUpperCase() || '-';
    }

    // Split payment
    return 'Split';
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      'paid': 'badge-paid',
      'partial': 'badge-partial',
      'unpaid': 'badge-unpaid'
    };
    return badges[status] || 'badge-unpaid';
  };

  return (
    <div className="data-manager orders-viewer">
      <div className="page-title-card">
        <h1 className="page-title">Sales Data - Orders</h1>
        <div className="data-buttons">
          <button className="icon-btn" onClick={handleExportOrders} title="Export to Excel">
            <img src={process.env.PUBLIC_URL + '/export-icon.svg'} alt="Export" className="btn-icon" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{stats.totalOrders}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">₹{stats.totalRevenue.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Order Value</div>
          <div className="stat-value">₹{stats.avgOrderValue.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Orders Today</div>
          <div className="stat-value">{stats.ordersToday}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Order Type</label>
          <select
            value={filters.orderType}
            onChange={(e) => handleFilterChange('orderType', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="dine-in">Dine-In</option>
            <option value="takeaway">Takeaway</option>
            <option value="swiggy">Swiggy</option>
            <option value="zomato">Zomato</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Payment Status</label>
          <select
            value={filters.paymentStatus}
            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Payment Method</label>
          <select
            value={filters.paymentMethod}
            onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Date Range</label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {filters.dateRange === 'custom' && (
          <>
            <div className="filter-group">
              <label>From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label>To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="filter-input"
              />
            </div>
          </>
        )}

        <div className="filter-group search-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Order # or Customer..."
            value={filters.search}
            onChange={handleSearch}
            className="filter-input search-input"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-table-container">
        {loading ? (
          <div className="loading-state">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders found</div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Payment Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td className="order-number">{order.order_number}</td>
                  <td className="order-date">{formatDate(order.created_at)}</td>
                  <td className="order-type">{formatOrderType(order.order_type)}</td>
                  <td className="customer-info">
                    <div>{order.customer_name || '-'}</div>
                    {order.customer_phone && (
                      <div className="customer-phone">{order.customer_phone}</div>
                    )}
                  </td>
                  <td className="items-count">{order.order_items?.length || 0}</td>
                  <td className="order-amount">₹{parseFloat(order.total_amount).toFixed(2)}</td>
                  <td>
                    <span className={`payment-badge ${getPaymentStatusBadge(order.payment_status)}`}>
                      {order.payment_status || 'unpaid'}
                    </span>
                  </td>
                  <td className="payment-method">{getPaymentMethodDisplay(order)}</td>
                  <td>
                    <span className={`status-badge status-${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <div className="pagination-info">
            Page {currentPage} of {totalPages} ({totalCount} total orders)
          </div>

          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default DataManager;
