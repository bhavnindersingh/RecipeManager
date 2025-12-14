import React from 'react';

const OrderTypeSelector = ({ selectedType, onTypeChange }) => {
  const orderTypes = [
    {
      id: 'dine-in',
      label: 'Dine-In',
      icon: '🍽️',
      description: 'Table service orders'
    },
    {
      id: 'swiggy',
      label: 'Swiggy',
      icon: '🛵',
      description: 'Swiggy delivery orders'
    },
    {
      id: 'zomato',
      label: 'Zomato',
      icon: '🛵',
      description: 'Zomato delivery orders'
    },
    {
      id: 'takeaway',
      label: 'Takeaway',
      icon: '🚶',
      description: 'Walk-in takeaway orders'
    }
  ];

  return (
    <div className="order-type-selector" data-active-type={selectedType}>
      <div className="order-type-tabs">
        {orderTypes.map(type => (
          <button
            key={type.id}
            className={`order-type-tab ${selectedType === type.id ? 'active' : ''}`}
            onClick={() => onTypeChange(type.id)}
            title={type.description}
            data-type={type.id}
          >
            <span className="tab-icon">{type.icon}</span>
            <span className="tab-label">{type.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default OrderTypeSelector;
