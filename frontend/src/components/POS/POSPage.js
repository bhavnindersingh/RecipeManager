import React, { useState, useEffect } from 'react';
import { recipeService } from '../../services/supabaseService';
import OrderTypeSelector from './OrderTypeSelector';
import TableLayout from './TableLayout';
import TableOrderModal from './TableOrderModal';
import BillModal from './BillModal';
import DeliveryOrderForm from './DeliveryOrderForm';
import TakeawayOrderForm from './TakeawayOrderForm';
import '../../styles/POS.css';

const POSPage = ({ recipes: initialRecipes }) => {
  const [recipes, setRecipes] = useState(initialRecipes || []);
  const [selectedOrderType, setSelectedOrderType] = useState('dine-in');
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showTableOrderModal, setShowTableOrderModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);

  // Fetch recipes if not provided
  useEffect(() => {
    const fetchRecipes = async () => {
      if (!initialRecipes || initialRecipes.length === 0) {
        try {
          const data = await recipeService.getAllRecipes();
          setRecipes(data);
        } catch (error) {
          console.error('Error fetching recipes:', error);
        }
      }
    };
    fetchRecipes();
  }, [initialRecipes]);

  // Handle order type change
  const handleOrderTypeChange = (type) => {
    setSelectedOrderType(type);
    // Clear any active modals when switching types
    setShowTableOrderModal(false);
    setShowBillModal(false);
    setSelectedTable(null);
    setSelectedOrder(null);
  };

  // Handle table selection (dine-in only)
  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setShowTableOrderModal(true);
  };

  // Handle generate bill
  const handleGenerateBill = (order) => {
    setSelectedOrder(order);
    setShowTableOrderModal(false);
    setShowBillModal(true);
  };

  // Handle order/payment complete
  const handleComplete = () => {
    setSelectedTable(null);
    setSelectedOrder(null);
    setShowTableOrderModal(false);
    setShowBillModal(false);
  };

  // Handle delivery/takeaway order complete
  const handleOrderComplete = () => {
    // Callback for when delivery or takeaway orders are completed
    // Can add additional logic here if needed
  };

  return (
    <div className="pos-page">
      <div className="pos-header">
        <h1 className="pos-title">Point of Sale System</h1>
      </div>

      {/* Order Type Selector */}
      <OrderTypeSelector
        selectedType={selectedOrderType}
        onTypeChange={handleOrderTypeChange}
      />

      {/* Conditional Content Based on Order Type */}
      <div className="pos-content">
        {selectedOrderType === 'dine-in' && (
          <TableLayout onTableSelect={handleTableSelect} />
        )}

        {selectedOrderType === 'swiggy' && (
          <DeliveryOrderForm
            platform="swiggy"
            recipes={recipes}
            onOrderComplete={handleOrderComplete}
          />
        )}

        {selectedOrderType === 'zomato' && (
          <DeliveryOrderForm
            platform="zomato"
            recipes={recipes}
            onOrderComplete={handleOrderComplete}
          />
        )}

        {selectedOrderType === 'takeaway' && (
          <TakeawayOrderForm
            recipes={recipes}
            onOrderComplete={handleOrderComplete}
          />
        )}
      </div>

      {/* Table Order Modal (Dine-In Only) */}
      {showTableOrderModal && selectedTable && (
        <TableOrderModal
          table={selectedTable}
          recipes={recipes}
          onClose={() => {
            setShowTableOrderModal(false);
            setSelectedTable(null);
          }}
          onOrderComplete={handleComplete}
          onGenerateBill={handleGenerateBill}
        />
      )}

      {/* Bill Modal */}
      {showBillModal && selectedOrder && (
        <BillModal
          order={selectedOrder}
          onClose={() => {
            setShowBillModal(false);
            setSelectedOrder(null);
          }}
          onPaymentComplete={handleComplete}
        />
      )}
    </div>
  );
};

export default POSPage;
