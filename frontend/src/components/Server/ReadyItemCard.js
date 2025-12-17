import React from 'react';

const ReadyItemCard = ({ item, onMarkServed }) => {
    const elapsed = () => {
        const created = new Date(item.order.created_at);
        const now = new Date();
        const diffMins = Math.floor((now - created) / 60000);
        return diffMins;
    };

    const waitTime = elapsed();
    const isUrgent = waitTime > 15;

    return (
        <div className={`ready-item-card ${isUrgent ? 'urgent' : ''}`}>
            <div className="ready-item-main">
                <div className="item-info">
                    <span className="item-qty">{item.quantity}×</span>
                    <span className="item-name">{item.recipe.name}</span>
                </div>
                <button
                    className="btn-serve"
                    onClick={() => onMarkServed(item.id)}
                >
                    ✓ Serve
                </button>
            </div>

            {item.notes && (
                <div className="item-notes-server">
                    <span className="notes-icon">📝</span> {item.notes}
                </div>
            )}

            <div className="item-footer">
                <span className={`wait-time ${isUrgent ? 'urgent' : ''}`}>
                    ⏱ {waitTime} mins
                </span>
                {item.order.order_number && (
                    <span className="order-ref">{item.order.order_number}</span>
                )}
            </div>
        </div>
    );
};

export default ReadyItemCard;
