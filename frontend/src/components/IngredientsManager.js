import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { INGREDIENT_CATEGORIES } from '../constants/ingredientCategories';
import { ingredientService } from '../services/supabaseService';
import '../styles/shared.css';
import '../styles/IngredientsManager.css';

const IngredientsManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: '',
    cost: '',
    category: 'Fresh Vegetables',
    minimum_stock: '10',
    vendor_name: '',
    vendor_phone: ''
  });
  const [error, setError] = useState({ message: '', type: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingValues, setEditingValues] = useState({
    cost: '',
    category: '',
    minimum_stock: '',
    vendor_name: '',
    vendor_phone: ''
  });

  const showToast = (message, type = 'success') => {
    setError({ message, type });
    setTimeout(() => {
      setError({ message: '', type: '' });
    }, 3000);
  };

  // Fetch ingredients on component mount
  useEffect(() => {
    const fetchIngredientsData = async () => {
      try {
        const data = await ingredientService.getAllIngredients();
        // Ensure all costs are properly parsed as numbers
        const processedData = data.map(ingredient => ({
          ...ingredient,
          cost: parseFloat(ingredient.cost) || 0,
          createdAt: new Date(ingredient.created_at || Date.now())
        })).sort((a, b) => b.createdAt - a.createdAt);
        setIngredients(processedData);
      } catch (error) {
        console.error('Error fetching ingredients:', error.message);
        setError({
          message: 'Failed to fetch ingredients. Please try again later.',
          type: 'error'
        });
      }
    };

    fetchIngredientsData();
  }, []);

  const normalizeIngredientName = (name) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '') // Remove all whitespace
      .replace(/[^a-z0-9]/g, ''); // Remove special characters
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();

    // Check for duplicate names using normalized comparison
    const normalizedNewName = normalizeIngredientName(newIngredient.name);
    const isDuplicate = ingredients.some(
      existing => normalizeIngredientName(existing.name) === normalizedNewName
    );

    if (isDuplicate) {
      setError({
        message: 'An ingredient with this name already exists',
        type: 'error',
        field: 'name'
      });
      return;
    }

    try {
      const savedIngredient = await ingredientService.createIngredient({
        name: newIngredient.name.trim(),
        cost: Number(newIngredient.cost),
        unit: newIngredient.unit.trim(),
        category: newIngredient.category.trim(),
        minimum_stock: Number(newIngredient.minimum_stock),
        vendor_name: newIngredient.vendor_name.trim() || null,
        vendor_phone: newIngredient.vendor_phone.trim() || null
      });

      // Add new ingredient at the beginning of the list
      const newIngredientWithDate = {
        ...savedIngredient,
        createdAt: new Date(savedIngredient.created_at || Date.now())
      };
      setIngredients(prev => [newIngredientWithDate, ...prev]);

      // Reset form
      setNewIngredient({
        name: '',
        unit: '',
        cost: '',
        category: 'Fresh Vegetables',
        minimum_stock: '10',
        vendor_name: '',
        vendor_phone: ''
      });

      showToast('Ingredient added successfully');
    } catch (error) {
      console.error('Error adding ingredient:', error);
      setError({
        message: error.message,
        type: 'error'
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await ingredientService.deleteIngredient(id);
      setIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
      showToast('Ingredient deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting ingredient:', error.message);
      showToast(error.message || 'Failed to delete ingredient', 'error');
    }
  };

  const exportIngredients = () => {
    // Prepare ingredients data for export
    const exportData = ingredients.map(({ id, ...ingredient }) => ({
      Name: ingredient.name,
      Unit: ingredient.unit,
      'Cost (₹)': ingredient.cost,
      'Min Stock': ingredient.minimum_stock || 10,
      Category: ingredient.category,
      Vendor: ingredient.vendor_name || '',
      Phone: ingredient.vendor_phone || ''
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 30 }, // Name
      { wch: 10 }, // Unit
      { wch: 12 }, // Cost
      { wch: 12 }, // Min Stock
      { wch: 20 }, // Category
      { wch: 25 }, // Vendor
      { wch: 15 }  // Phone
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Ingredients');

    // Save file
    XLSX.writeFile(wb, 'ingredients.xlsx');
  };

  const importIngredients = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Show loading toast
    showToast('Processing import file...', 'info');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first worksheet
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(ws);

        if (jsonData.length === 0) {
          showToast('No data found in the file', 'error');
          return;
        }

        let successCount = 0;
        let errorCount = 0;
        const newIngredients = [];

        // Process each row sequentially to respect DB constraints
        for (const row of jsonData) {
          try {
            const ingredientData = {
              name: (row.Name || row.name || '').trim(),
              unit: (row.Unit || row.unit || '').trim(),
              cost: Number(row['Cost (₹)'] || row.cost || 0),
              minimum_stock: Number(row['Min Stock'] || row['Min Stock'] || row.minimum_stock || 10),
              category: (row.Category || row.category || 'Fresh Vegetables').trim(),
              vendor_name: (row.Vendor || row.vendor_name || '').trim() || null,
              vendor_phone: (row.Phone || row.vendor_phone || '').trim() || null
            };

            // Validate required fields
            if (!ingredientData.name || !ingredientData.unit || ingredientData.cost <= 0) {
              console.warn('Skipping invalid row:', row);
              errorCount++;
              continue;
            }

            // Check for duplicates in current list
            const isDuplicate = ingredients.some(
              existing => normalizeIngredientName(existing.name) === normalizeIngredientName(ingredientData.name)
            );

            if (isDuplicate) {
              console.warn('Skipping duplicate:', ingredientData.name);
              continue;
            }

            // Save to Database
            const savedIngredient = await ingredientService.createIngredient(ingredientData);

            // Add to new list with proper Date object
            newIngredients.push({
              ...savedIngredient,
              createdAt: new Date(savedIngredient.created_at || Date.now())
            });
            successCount++;

          } catch (err) {
            console.error('Error saving ingredient:', err);
            errorCount++;
          }
        }

        // Update state with new ingredients at the top
        setIngredients(prev => [...newIngredients, ...prev]);

        // Clear file input
        event.target.value = '';

        // Show result message
        if (successCount > 0) {
          showToast(`Successfully imported ${successCount} ingredients${errorCount > 0 ? `. ${errorCount} failed.` : ''}`, 'success');
        } else if (errorCount > 0) {
          showToast(`Import failed. ${errorCount} items had errors.`, 'error');
        } else {
          showToast('No new ingredients were added (check for duplicates).', 'info');
        }

      } catch (error) {
        console.error('Import error:', error);
        showToast('Error processing file: ' + error.message, 'error');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleEdit = (ingredient) => {
    setEditingId(ingredient.id);
    setEditingValues({
      cost: ingredient.cost.toString(),
      category: ingredient.category,
      minimum_stock: (ingredient.minimum_stock || 10).toString(),
      vendor_name: ingredient.vendor_name || '',
      vendor_phone: ingredient.vendor_phone || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValues({
      cost: '',
      category: '',
      minimum_stock: '',
      vendor_name: '',
      vendor_phone: ''
    });
  };

  const handleSaveEdit = async (ingredient) => {
    try {
      await ingredientService.updateIngredient(ingredient.id, {
        name: ingredient.name,
        unit: ingredient.unit,
        cost: parseFloat(editingValues.cost),
        category: editingValues.category,
        minimum_stock: parseFloat(editingValues.minimum_stock),
        vendor_name: editingValues.vendor_name.trim() || null,
        vendor_phone: editingValues.vendor_phone.trim() || null
      });

      setIngredients(prev => prev.map(ing =>
        ing.id === ingredient.id
          ? {
            ...ing,
            cost: parseFloat(editingValues.cost),
            category: editingValues.category,
            minimum_stock: parseFloat(editingValues.minimum_stock),
            vendor_name: editingValues.vendor_name.trim() || null,
            vendor_phone: editingValues.vendor_phone.trim() || null
          }
          : ing
      ));
      setEditingId(null);
      setEditingValues({
        cost: '',
        category: '',
        minimum_stock: '',
        vendor_name: '',
        vendor_phone: ''
      });
      showToast('Ingredient updated successfully', 'success');
    } catch (error) {
      console.error('Error updating ingredient:', error.message);
      showToast(error.message, 'error');
    }
  };

  // Filter ingredients based on search term and category
  const filteredIngredients = ingredients
    .filter(ingredient => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        ingredient.name.toLowerCase().includes(searchLower) ||
        ingredient.category.toLowerCase().includes(searchLower) ||
        (ingredient.vendor_name && ingredient.vendor_name.toLowerCase().includes(searchLower))
      );
      const matchesCategory = selectedCategory === 'All' || ingredient.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewIngredient(prev => ({
      ...prev,
      [name]: (name === 'cost' || name === 'minimum_stock') ? (value === '' ? '' : parseFloat(value) || 0) : value
    }));
    setError({ message: '', type: '' });
  };

  return (
    <div className="ingredients-manager">
      {error.message && (
        <div className={`toast-message ${error.type}`}>
          {error.message}
        </div>
      )}

      {/* Header Section with Title and Stats */}
      <div className="page-title-card">
        <h1 className="page-title">Ingredients Manager</h1>
        <div className="header-stats">
          <span className="total-count">{ingredients.length} Total Ingredients</span>
          <div className="data-buttons">
            <input
              type="file"
              id="import-file"
              className="file-input-hidden"
              onChange={importIngredients}
              accept=".xlsx,.xls"
            />
            <button
              className="btn-import"
              onClick={() => document.getElementById('import-file').click()}
              title="Import from Excel"
            >
              Import
            </button>
            <button
              className="btn-export"
              onClick={exportIngredients}
              title="Export to Excel"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Add Ingredient Form Section */}
      <div className="form-section">
        <h2 className="section-title">Add New Ingredient</h2>
        <form onSubmit={handleAddIngredient}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={newIngredient.name}
                onChange={handleInputChange}
                placeholder="Enter ingredient name"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select
                name="unit"
                className="form-input form-select"
                value={newIngredient.unit}
                onChange={handleInputChange}
                required
              >
                <option value="">Select unit</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="g">Gram (g)</option>
                <option value="l">Liter (l)</option>
                <option value="ml">Milliliter (ml)</option>
                <option value="pcs">Pieces (pcs)</option>
                <option value="dozen">Dozen</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cost (₹)</label>
              <input
                type="number"
                name="cost"
                className="form-input"
                value={newIngredient.cost}
                onChange={handleInputChange}
                placeholder="Enter cost per unit"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Minimum Stock Level</label>
              <input
                type="number"
                name="minimum_stock"
                className="form-input"
                value={newIngredient.minimum_stock}
                onChange={handleInputChange}
                placeholder="Minimum stock alert level"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                name="category"
                className="form-input form-select"
                value={newIngredient.category}
                onChange={handleInputChange}
                required
              >
                {INGREDIENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Current Vendors</label>
              <input
                type="text"
                name="vendor_name"
                className="form-input"
                value={newIngredient.vendor_name}
                onChange={handleInputChange}
                placeholder="(optional)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="vendor_phone"
                className="form-input"
                value={newIngredient.vendor_phone}
                onChange={handleInputChange}
                placeholder="(optional)"
                pattern="[0-9]{10,15}"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-add">
              Add Ingredient
            </button>
          </div>
        </form>
      </div>

      {/* Search and Filter Section */}
      <div className="search-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter-select"
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              fontSize: '0.9rem',
              color: '#1e293b',
              minWidth: '200px',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Categories</option>
            {INGREDIENT_CATEGORIES.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="ingredient-count">
          Showing {filteredIngredients.length} of {ingredients.length} ingredients
        </div>
      </div>

      {/* Ingredients Table Section */}
      <div className="table-section">
        <div className="table-container">
          <table className="ingredients-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Unit</th>
                <th>Cost (₹)</th>
                <th>Min Stock</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.map(ingredient => (
                <tr key={ingredient.id}>
                  <td className="ingredient-name">{ingredient.name}</td>
                  <td>{ingredient.unit}</td>
                  <td className="ingredient-cost">
                    {editingId === ingredient.id ? (
                      <input
                        type="number"
                        value={editingValues.cost}
                        onChange={(e) => setEditingValues(prev => ({ ...prev, cost: e.target.value }))}
                        className="edit-input"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      `₹${ingredient.cost}`
                    )}
                  </td>
                  <td>
                    {editingId === ingredient.id ? (
                      <input
                        type="number"
                        value={editingValues.minimum_stock}
                        onChange={(e) => setEditingValues(prev => ({ ...prev, minimum_stock: e.target.value }))}
                        className="edit-input"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      `${ingredient.minimum_stock || 10} ${ingredient.unit}`
                    )}
                  </td>
                  <td>
                    {editingId === ingredient.id ? (
                      <select
                        value={editingValues.category}
                        onChange={(e) => setEditingValues(prev => ({ ...prev, category: e.target.value }))}
                        className="edit-input"
                      >
                        {INGREDIENT_CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    ) : (
                      ingredient.category
                    )}
                  </td>
                  <td className="vendor-info">
                    {editingId === ingredient.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <input
                          type="text"
                          value={editingValues.vendor_name}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, vendor_name: e.target.value }))}
                          className="edit-input"
                          placeholder="Vendor name"
                        />
                        <input
                          type="tel"
                          value={editingValues.vendor_phone}
                          onChange={(e) => setEditingValues(prev => ({ ...prev, vendor_phone: e.target.value }))}
                          className="edit-input"
                          placeholder="Phone number"
                          pattern="[0-9]{10,15}"
                        />
                      </div>
                    ) : (
                      ingredient.vendor_name || ingredient.vendor_phone ? (
                        <div>
                          <div>{ingredient.vendor_name || '-'}</div>
                          {ingredient.vendor_phone && (
                            <div className="vendor-phone">{ingredient.vendor_phone}</div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {editingId === ingredient.id ? (
                        <>
                          <button
                            className="action-btn save-btn"
                            onClick={() => handleSaveEdit(ingredient)}
                            title="Save"
                          >
                            <span role="img" aria-label="Save">✔️</span>
                          </button>
                          <button
                            className="action-btn cancel-btn"
                            onClick={handleCancelEdit}
                            title="Cancel"
                          >
                            <span role="img" aria-label="Cancel">❌</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEdit(ingredient)}
                            title="Edit"
                          >
                            <span role="img" aria-label="Edit">✏️</span>
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(ingredient.id)}
                            title="Delete"
                          >
                            <span role="img" aria-label="Delete">🗑️</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredIngredients.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-message">
                    {ingredients.length === 0 ? 'No ingredients added yet' : 'No matching ingredients found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IngredientsManager;
