import React, { useState, useMemo } from 'react';
import { FaEdit, FaTrash, FaEye, FaBoxOpen, FaStore, FaUtensils } from 'react-icons/fa';
import { RECIPE_CATEGORIES } from '../constants/categories';
import '../styles/RecipeManager.css';

const SORT_FIELDS = {
  LATEST: 'updated_at',
  SALES: 'sales',
  MARKUP: 'markup_factor',
  COGS: 'total_cost',
  PROFIT: 'profit_margin'
};

const FILTER_TYPES = {
  ALL: 'all',
  POS_READY: 'production',
  INTERNAL: 'internal'
};

const RecipeManager = ({ recipes = [], onEditRecipe, onDeleteRecipe, onViewRecipe }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [salesChannelFilter, setSalesChannelFilter] = useState(FILTER_TYPES.ALL);
  const [sortConfig, setSortConfig] = useState({
    field: SORT_FIELDS.LATEST,
    direction: 'desc'
  });

  const categories = useMemo(() => {
    return ['all', ...RECIPE_CATEGORIES];
  }, []);

  const handleSort = (field) => {
    setSortConfig(prevConfig => ({
      field,
      direction: prevConfig.field === field && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const filteredAndSortedRecipes = useMemo(() => {
    if (!Array.isArray(recipes)) return [];
    let filtered = recipes;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe =>
        recipe?.name?.toLowerCase().includes(query) ||
        recipe?.sku?.toLowerCase().includes(query) ||
        recipe?.ingredients?.some(ingredient =>
          ingredient?.name?.toLowerCase().includes(query)
        )
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(recipe => recipe?.category === selectedCategory);
    }

    // Apply Sales Channel Filter
    if (salesChannelFilter === FILTER_TYPES.POS_READY) {
      filtered = filtered.filter(recipe => recipe.is_production_recipe);
    } else if (salesChannelFilter === FILTER_TYPES.INTERNAL) {
      filtered = filtered.filter(recipe => !recipe.is_production_recipe);
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.field) {
        case SORT_FIELDS.LATEST:
          aValue = new Date(a?.updated_at || a?.created_at || 0).getTime();
          bValue = new Date(b?.updated_at || b?.created_at || 0).getTime();
          break;
        case SORT_FIELDS.SALES:
          aValue = parseInt(a?.sales || 0);
          bValue = parseInt(b?.sales || 0);
          break;
        case SORT_FIELDS.MARKUP:
          aValue = parseFloat(a?.markup_factor || 0);
          bValue = parseFloat(b?.markup_factor || 0);
          break;
        case SORT_FIELDS.COGS:
          aValue = parseFloat(a?.total_cost || 0);
          bValue = parseFloat(b?.total_cost || 0);
          break;
        case SORT_FIELDS.PROFIT:
          aValue = parseFloat(a?.profit_margin || 0);
          bValue = parseFloat(b?.profit_margin || 0);
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'desc') {
        return bValue - aValue;
      }
      return aValue - bValue;
    });
  }, [recipes, searchQuery, selectedCategory, salesChannelFilter, sortConfig]);

  return (
    <div className="recipe-manager">
      <div className="page-title-card">
        <h1 className="page-title">Recipe Manager</h1>
        <div className="recipe-stats">
          <span className="stat-badge">
            <FaBoxOpen /> {recipes.length} Total
          </span>
          <span className="stat-badge success">
            <FaStore /> {recipes.filter(r => r.is_production_recipe).length} For Sale
          </span>
        </div>
      </div>

      <div className="recipe-header">
        <div className="control-card">
          <div className="control-section">
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, SKU, or ingredient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <select
              className="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>

            <select
              className="category-select"
              value={salesChannelFilter}
              onChange={(e) => setSalesChannelFilter(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value={FILTER_TYPES.ALL}>All Channels</option>
              <option value={FILTER_TYPES.POS_READY}>POS Ready (For Sale)</option>
              <option value={FILTER_TYPES.INTERNAL}>Internal / Prep</option>
            </select>
          </div>

          <div className="filter-section">
            <button
              className={`sort-btn ${sortConfig.field === SORT_FIELDS.LATEST ? 'active' : ''}`}
              onClick={() => handleSort(SORT_FIELDS.LATEST)}
            >
              Latest {sortConfig.field === SORT_FIELDS.LATEST && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
            <button
              className={`sort-btn ${sortConfig.field === SORT_FIELDS.SALES ? 'active' : ''}`}
              onClick={() => handleSort(SORT_FIELDS.SALES)}
            >
              Sales {sortConfig.field === SORT_FIELDS.SALES && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
            <button
              className={`sort-btn ${sortConfig.field === SORT_FIELDS.PROFIT ? 'active' : ''}`}
              onClick={() => handleSort(SORT_FIELDS.PROFIT)}
            >
              Margin {sortConfig.field === SORT_FIELDS.PROFIT && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>

        <div className="recipe-count">
          Showing {filteredAndSortedRecipes.length} of {recipes.length} recipes
        </div>

        <div className="recipe-grid">
          {filteredAndSortedRecipes.map(recipe => (
            <div key={recipe.id} className={`recipe-card ${!recipe.is_production_recipe ? 'internal-card' : ''}`}>
              <div className="card-top-badges">
                <span className="category-tag" data-category={recipe.category}>{recipe.category}</span>
                {recipe.sku && <span className="sku-badge">{recipe.sku}</span>}
                {!recipe.is_production_recipe && <span className="internal-badge"><FaUtensils /> Internal</span>}
              </div>

              <div className="recipe-card-header">
                <h3 className="recipe-name">{recipe.name}</h3>
              </div>

              <div className="recipe-metrics">
                {recipe.is_production_recipe ? (
                  // POS / Production Metrics
                  <>
                    <div className="metric">
                      <span className="metric-label">Selling Price</span>
                      <span className="metric-value">₹{Math.round(parseFloat(recipe.selling_price || 0))}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Gross Margin</span>
                      <span className={`metric-value ${parseFloat(recipe.profit_margin || 0) >= 60 ? 'markup-good' : 'markup-bad'}`}>
                        {parseFloat(recipe.profit_margin || 0).toFixed(0)}%
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Sales (Units)</span>
                      <span className="metric-value">{recipe.sales || 0}</span>
                    </div>
                  </>
                ) : (
                  // Internal Prep Metrics
                  <>
                    <div className="metric">
                      <span className="metric-label">Total Cost</span>
                      <span className="metric-value">₹{Math.round(parseFloat(recipe.total_cost || 0))}</span>
                    </div>
                    <div className="metric full-width">
                      <span className="metric-label">Usage</span>
                      <span className="metric-txt">Internal Component</span>
                    </div>
                  </>
                )}
              </div>

              <div className="recipe-footer-info">
                <span className="ingredients-count">
                  {recipe.ingredients?.length || 0} ingredients • ₹{parseFloat(recipe.total_cost || 0).toFixed(2)} cost
                </span>
                {recipe.available_for_delivery && recipe.is_production_recipe && (
                  <span className="delivery-badge" title="Available for Delivery">🛵</span>
                )}
              </div>

              <div className="recipe-actions">
                <div className="left-actions">
                  <button
                    className="action-button view"
                    onClick={() => {
                      const recipeToView = recipes.find(r => r.id === recipe.id);
                      if (recipeToView) onViewRecipe(recipeToView);
                    }}
                    title="View details"
                  >
                    <FaEye />
                  </button>
                </div>
                <div className="right-actions">
                  <button
                    className="action-button edit"
                    onClick={() => onEditRecipe(recipe)}
                    title="Edit recipe"
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="action-button delete"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this recipe?')) {
                        onDeleteRecipe(recipe.id);
                      }
                    }}
                    title="Delete recipe"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecipeManager;
