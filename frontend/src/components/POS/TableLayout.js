import React, { useState, useEffect } from 'react';
import { tableService } from '../../services/tableService';
import TableCard from './TableCard';

const TableLayout = ({ onTableSelect }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTables();

    // Subscribe to table changes
    const channel = tableService.subscribeToTables((payload) => {
      console.log('Table update:', payload);
      fetchTables();
    });

    return () => {
      tableService.unsubscribe(channel);
    };
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const data = await tableService.getTablesWithOrders();
      setTables(data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = tables.filter(table => {
    if (filter === 'all') return true;
    return table.status === filter;
  });

  const getStatusCount = (status) => {
    return tables.filter(t => t.status === status).length;
  };

  if (loading) {
    return (
      <div className="table-layout-loading">
        <div className="loading-spinner"></div>
        <p>Loading tables...</p>
      </div>
    );
  }

  return (
    <div className="table-layout">
      <div className="table-layout-header">
        <h2>Table Layout</h2>
        <div className="table-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({tables.length})
          </button>
          <button
            className={`filter-btn filter-available ${filter === 'available' ? 'active' : ''}`}
            onClick={() => setFilter('available')}
          >
            Available ({getStatusCount('available')})
          </button>
          <button
            className={`filter-btn filter-occupied ${filter === 'occupied' ? 'active' : ''}`}
            onClick={() => setFilter('occupied')}
          >
            Occupied ({getStatusCount('occupied')})
          </button>
          <button
            className={`filter-btn filter-billing ${filter === 'billing' ? 'active' : ''}`}
            onClick={() => setFilter('billing')}
          >
            Billing ({getStatusCount('billing')})
          </button>
          <button
            className={`filter-btn filter-billed ${filter === 'billed' ? 'active' : ''}`}
            onClick={() => setFilter('billed')}
          >
            Billed ({getStatusCount('billed')})
          </button>
        </div>
      </div>

      <div className="table-grid">
        {filteredTables.length === 0 ? (
          <div className="no-tables">
            <p>No tables found</p>
          </div>
        ) : (
          filteredTables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              onClick={onTableSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TableLayout;
