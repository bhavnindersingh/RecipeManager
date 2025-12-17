import React, { useState, useEffect, useCallback } from 'react';
import { orderService } from '../../services/orderService';
import ReadyItemCard from './ReadyItemCard';
import '../../styles/ServerDashboard.css';

const ServerDashboard = () => {
    const [readyItems, setReadyItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('table'); // 'table' or 'order'

    // Fetch ready items
    const fetchReadyItems = useCallback(async () => {
        try {
            setLoading(true);
            const data = await orderService.getReadyItems();
            setReadyItems(data);
        } catch (error) {
            console.error('Error fetching ready items:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchReadyItems();
    }, [fetchReadyItems]);

    // Setup realtime subscription
    useEffect(() => {
        // Subscribe to order_items changes
        const channel = orderService.subscribeToOrderItems((payload) => {
            console.log('Order item update:', payload);
            // Refresh when any item status changes
            fetchReadyItems();
        });

        return () => {
            if (channel) {
                orderService.unsubscribe(channel);
            }
        };
    }, [fetchReadyItems]);

    // Handle mark as served
    const handleMarkServed = async (itemId) => {
        try {
            await orderService.updateItemStatus(itemId, 'served');
            // Realtime will trigger refresh
        } catch (error) {
            console.error('Error marking item as served:', error);
        }
    };

    // Group items by table/order
    const groupedItems = readyItems.reduce((acc, item) => {
        const key = groupBy === 'table'
            ? item.order.table_number || item.order.customer_name || 'No Table'
            : item.order.order_number;

        if (!acc[key]) {
            acc[key] = {
                groupKey: key,
                orderInfo: item.order,
                items: []
            };
        }
        acc[key].items.push(item);
        return acc;
    }, {});

    const groups = Object.values(groupedItems);

    return (
        <div className="server-dashboard">
            <div className="server-header">
                <h1 className="server-title">Ready to Serve</h1>
                <div className="server-stats">
                    <span className="stat-badge-server ready">
                        {readyItems.length} Items Ready
                    </span>
                </div>
            </div>

            <div className="server-controls">
                <button
                    className={`group-btn ${groupBy === 'table' ? 'active' : ''}`}
                    onClick={() => setGroupBy('table')}
                >
                    📍 Group by Table
                </button>
                <button
                    className={`group-btn ${groupBy === 'order' ? 'active' : ''}`}
                    onClick={() => setGroupBy('order')}
                >
                    🧾 Group by Order
                </button>
            </div>

            {loading ? (
                <div className="server-loading">Loading ready items...</div>
            ) : readyItems.length === 0 ? (
                <div className="server-empty">
                    <p>✅ No items ready to serve</p>
                    <p className="empty-hint">Items will appear here when kitchen marks them as ready</p>
                </div>
            ) : (
                <div className="server-groups">
                    {groups.map((group) => (
                        <div key={group.groupKey} className="server-group">
                            <div className="group-header">
                                <div className="group-title">
                                    {groupBy === 'table' ? (
                                        <>
                                            <span className="table-icon">📍</span>
                                            <span className="table-name">
                                                {group.orderInfo.table_number ? `Table ${group.orderInfo.table_number}` : group.orderInfo.customer_name || 'Takeaway'}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="order-icon">🧾</span>
                                            <span className="order-name">{group.groupKey}</span>
                                        </>
                                    )}
                                </div>
                                <div className="group-meta">
                                    <span className="order-type-badge">{group.orderInfo.order_type}</span>
                                    <span className="items-count">{group.items.length} items</span>
                                </div>
                            </div>

                            <div className="ready-items-list">
                                {group.items.map((item) => (
                                    <ReadyItemCard
                                        key={item.id}
                                        item={item}
                                        onMarkServed={handleMarkServed}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ServerDashboard;
