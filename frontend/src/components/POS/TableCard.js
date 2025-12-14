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
        return 'Available';
      case 'occupied':
        return 'Occupied';
      case 'billing':
        return 'Billing';
      case 'billed':
        return 'Billed';
      case 'reserved':
        return 'Reserved';
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
        <div className="table-number">Table {table.table_number}</div>
        <div className="table-status-icon">{getStatusIcon()}</div>
      </div>

      <div className="table-card-body">
        <div className="table-capacity">
          <span className="capacity-icon">👥</span>
          <span>{table.capacity} seats</span>
        </div>

        {table.current_order && (
          <>
            <div className="table-order-info">
              <div className="order-amount">
                ₹{parseFloat(table.current_order.total_amount).toFixed(2)}
              </div>
              {table.current_order.guest_count && (
                <div className="guest-count">
                  {table.current_order.guest_count} guests
                </div>
              )}
            </div>
            <div className="table-time">
              {formatTime(table.current_order.created_at)}
            </div>
          </>
        )}
      </div>

      <div className="table-card-footer">
        <span className="table-status-label">{getStatusText()}</span>
      </div>
    </div>
  );
};

export default TableCard;
