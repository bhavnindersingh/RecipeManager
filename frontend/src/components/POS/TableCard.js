import React from 'react';

const TableCard = ({ table, onClick }) => {
  const getStatusClass = () => {
    switch (table.status) {
      case 'available':
        return 'table-card-available';
      case 'occupied':
        return 'table-card-occupied';
      case 'billing':
        return 'table-card-billing';
      case 'billed':
        return 'table-card-billed';
      case 'reserved':
        return 'table-card-reserved';
      default:
        return 'table-card-available';
    }
  };

  const getStatusIcon = () => {
    switch (table.status) {
      case 'available':
        return '✓';
      case 'occupied':
        return '🍽️';
      case 'billing':
        return '💳';
      case 'billed':
        return '✔️';
      case 'reserved':
        return '🔒';
      default:
        return '○';
    }
  };

  const getStatusText = () => {
    switch (table.status) {
      case 'available':
        return 'Free'; // Shorter text
      case 'occupied':
        return 'Occupied';
      case 'billing':
        return 'Billing';
      case 'billed':
        return 'Billed';
      case 'reserved':
        return 'Rsrvd';
      default:
        return table.status;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m`;
  };

  return (
    <div
      className={`table-card ${getStatusClass()}`}
      onClick={() => onClick(table)}
    >
      <div className="table-card-header">
        <span className="table-number">{table.table_number}</span>
        <span className="table-capacity">
          <span className="capacity-icon">👥</span>{table.capacity}
        </span>
      </div>

      <div className="table-card-body">
        {table.current_order ? (
          <>
            <div className="table-order-primary">
              <span className="order-amount">₹{parseFloat(table.current_order.total_amount).toFixed(0)}</span>
            </div>
            <div className="table-order-secondary">
              <span className="table-time">🕒 {formatTime(table.current_order.created_at)}</span>
              {table.current_order.guest_count && (
                <span className="guest-count">👤 {table.current_order.guest_count}</span>
              )}
            </div>
          </>
        ) : (
          <div className="table-status-indicator">
            {getStatusIcon()} <span className="status-text">{getStatusText()}</span>
          </div>
        )}
      </div>

      {/* Removed separate footer, status is implicit or shown in body */}
    </div>
  );
};

export default TableCard;
