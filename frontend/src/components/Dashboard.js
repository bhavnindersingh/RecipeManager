import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';
import '../styles/Dashboard.css';

const Dashboard = ({ recipes }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
    pendingOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch today's orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allOrders = await orderService.getOrders();

      // Filter today's orders
      const todayOrders = allOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });

      // Calculate stats
      const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
      const activeOrders = allOrders.filter(order =>
        order.status === 'pending' || order.status === 'cooking'
      ).length;
      const pendingOrders = allOrders.filter(order => order.status === 'pending').length;

      setStats({
        todayOrders: todayOrders.length,
        todayRevenue,
        activeOrders,
        pendingOrders
      });

      // Get recent orders (last 5)
      const recent = allOrders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      setRecentOrders(recent);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'cooking': return 'status-cooking';
      case 'ready': return 'status-ready';
      case 'served': return 'status-served';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const quickAccessCards = [
    { title: 'Sales Data', icon: '💰', path: '/data', color: '#10b981' },
    { title: 'Ingredients', icon: '🥕', path: '/ingredients', color: '#f59e0b' },
    { title: 'Recipes', icon: '🍽️', path: '/manager', color: '#944c68' },
    { title: 'Create Recipe', icon: '➕', path: '/create', color: '#06b6d4' },
    { title: 'Analytics', icon: '📊', path: '/analytics', color: '#8b5cf6' },
    { title: 'POS', icon: '🛒', path: '/pos', color: '#ec4899' },
    { title: 'Kitchen', icon: '👨‍🍳', path: '/kds', color: '#f97316' }
  ];

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            📈
          </div>
          <div className="stat-details">
            <p className="stat-label">Today's Orders</p>
            <h2 className="stat-value">{stats.todayOrders}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            💵
          </div>
          <div className="stat-details">
            <p className="stat-label">Today's Revenue</p>
            <h2 className="stat-value">{formatCurrency(stats.todayRevenue)}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            🔥
          </div>
          <div className="stat-details">
            <p className="stat-label">Active Orders</p>
            <h2 className="stat-value">{stats.activeOrders}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            ⏳
          </div>
          <div className="stat-details">
            <p className="stat-label">Pending Orders</p>
            <h2 className="stat-value">{stats.pendingOrders}</h2>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="dashboard-section">
        <h2 className="section-title">Quick Access</h2>
        <div className="quick-access-grid">
          {quickAccessCards.map((card, index) => (
            <div
              key={index}
              className="quick-access-card"
              onClick={() => navigate(card.path)}
              style={{ borderColor: card.color }}
            >
              <div className="quick-access-icon" style={{ background: card.color }}>
                {card.icon}
              </div>
              <h3 className="quick-access-title">{card.title}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="dashboard-section">
        <h2 className="section-title">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <div className="empty-state">
            <p>No recent orders</p>
          </div>
        ) : (
          <div className="recent-orders-list">
            {recentOrders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h4 className="order-id">Order #{order.id.slice(0, 8)}</h4>
                    <span className="order-time">{formatTime(order.created_at)}</span>
                  </div>
                  <span className={`order-status ${getStatusClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="order-details">
                  <div className="order-meta">
                    <span className="order-type">{order.order_type}</span>
                    {order.table_number && (
                      <span className="order-table">Table {order.table_number}</span>
                    )}
                  </div>
                  <div className="order-amount">{formatCurrency(order.total_amount)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="dashboard-section">
        <h2 className="section-title">System Overview</h2>
        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon">🍽️</div>
            <div className="info-content">
              <p className="info-label">Total Recipes</p>
              <h3 className="info-value">{recipes?.length || 0}</h3>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon">⭐</div>
            <div className="info-content">
              <p className="info-label">Status</p>
              <h3 className="info-value">Active</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
