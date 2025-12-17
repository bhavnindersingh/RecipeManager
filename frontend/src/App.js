import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import PinLogin from './components/PinLogin';
import RoleBasedRoute from './components/RoleBasedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { recipeService, ingredientService } from './services/supabaseService';
import { authService } from './services/authService';
import './styles/shared.css';  // Import FIRST to load CSS variables
import './styles/App.css';

// Code splitting: Lazy load heavy components
const Dashboard = lazy(() => import('./components/Dashboard'));
const IngredientsManager = lazy(() => import('./components/IngredientsManager'));
const StockRegister = lazy(() => import('./components/Stock/StockRegister'));
const RecipeForm = lazy(() => import('./components/RecipeForm'));
const RecipeManager = lazy(() => import('./components/RecipeManager'));
const Analytics = lazy(() => import('./components/Analytics'));
const DataManager = lazy(() => import('./components/DataManager'));
const POSPage = lazy(() => import('./components/POS/POSPage'));
const KDSPage = lazy(() => import('./components/KDS/KDSPage'));
const ServerDashboard = lazy(() => import('./components/Server/ServerDashboard'));

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    fontSize: '1.2rem',
    color: '#64748b'
  }}>
    <div>Loading...</div>
  </div>
);

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [editingRecipe, setEditingRecipe] = useState(() => {
    const saved = sessionStorage.getItem('editingRecipe');
    return saved ? JSON.parse(saved) : null;
  });
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    return authService.getCurrentUser();
  });
  const [menuOpen, setMenuOpen] = useState(false);

  // Sidebar group state (persisted in localStorage)
  const [openGroups, setOpenGroups] = useState(() => {
    const saved = localStorage.getItem('sidebarGroups');
    return saved ? JSON.parse(saved) : { store: false, chef: false, sales: false, operations: false, accounts: false, analytics: false };
  });

  // Save openGroups to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarGroups', JSON.stringify(openGroups));
  }, [openGroups]);

  // Toggle sidebar group
  const toggleGroup = (groupName) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Sidebar Group Component
  const SidebarGroup = ({ title, icon, groupKey, children }) => {
    const isOpen = openGroups[groupKey];

    return (
      <div className="sidebar-group">
        <div
          className="sidebar-group-header"
          onClick={() => toggleGroup(groupKey)}
        >
          <div className="sidebar-group-header-content">
            <span className="sidebar-icon">{icon}</span>
            <span className="sidebar-group-title-text">{title}</span>
          </div>
          <span className={`sidebar-group-chevron ${isOpen ? 'open' : ''}`}>
            ▶
          </span>
        </div>
        <div className={`sidebar-group-links ${isOpen ? 'open' : ''}`}>
          {children}
        </div>
      </div>
    );
  };

  // Save editingRecipe to sessionStorage whenever it changes
  useEffect(() => {
    if (editingRecipe) {
      sessionStorage.setItem('editingRecipe', JSON.stringify(editingRecipe));
    } else {
      sessionStorage.removeItem('editingRecipe');
    }
  }, [editingRecipe]);

  // Handle logout
  const handleLogout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    sessionStorage.removeItem('editingRecipe');
    navigate('/pin-login');
  }, [navigate]);

  // Fetch data when authenticated
  const fetchIngredients = useCallback(async () => {
    try {
      const data = await ingredientService.getAllIngredients();
      setIngredients(data);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  }, []);

  const fetchRecipes = useCallback(async () => {
    try {
      const data = await recipeService.getAllRecipes();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchIngredients();
      fetchRecipes();
    }
  }, [currentUser, fetchIngredients, fetchRecipes]);


  const handleRecipeSubmit = async (recipeData, recipeId = null) => {
    const isUpdate = !!recipeId;

    try {
      let responseData;
      if (isUpdate) {
        responseData = await recipeService.updateRecipe(recipeId, recipeData);
      } else {
        responseData = await recipeService.createRecipe(recipeData);
      }

      // Update recipes list
      setRecipes(prevRecipes => {
        if (!prevRecipes) return [];
        return isUpdate
          ? prevRecipes.map(r => r.id === recipeId ? responseData : r)
          : [...prevRecipes, responseData];
      });

      return responseData;
    } catch (error) {
      console.error('Error submitting recipe:', error);
      throw error;
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    try {
      await recipeService.deleteRecipe(recipeId);

      // Update recipes state immediately after successful deletion
      setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.id !== recipeId));
    } catch (error) {
      console.error('Error deleting recipe:', error);
      throw error;
    }
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    navigate('/manager/recipe-editor');
  };

  const handleViewRecipe = (recipe) => {
    // Make sure we have all the recipe data
    const fullRecipe = {
      ...recipe,
      ingredients: recipe.ingredients || [],
      image_url: recipe.image_url || null,
      delivery_image_url: recipe.delivery_image_url || null
    };
    setViewingRecipe(fullRecipe);
    navigate('/manager/show-recipe');
  };

  // Clear viewing recipe when navigating away
  useEffect(() => {
    return () => {
      setViewingRecipe(null);
    };
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close menu on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="app">
      <ScrollToTop />
      {currentUser && (
        <>
          <header className="app-header">
            <div className="nav-container">
              {/* Burger Menu Button */}
              <button
                className={`burger-btn ${menuOpen ? 'open' : ''}`}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>

              {/* Centered Logo */}
              <img
                src="/android-icon-192x192.png"
                alt="Kavas Conscious Living"
                className="header-logo"
                loading="eager"
              />

              {/* Right Actions */}
              <div className="nav-actions">
                <span className="user-info">
                  {currentUser.name}
                </span>
                <button className="icon-btn" onClick={handleLogout} title="Logout">
                  <img
                    src="/logout-icon.svg"
                    alt="Logout"
                    className="btn-icon"
                  />
                </button>
              </div>
            </div>
          </header>

          {/* Sidebar Navigation */}
          {menuOpen && (
            <>
              <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />
              <nav className="sidebar">
                <div className="sidebar-header">
                  <h2>Menu</h2>
                  <button
                    className="sidebar-close"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    ×
                  </button>
                </div>

                <div className="sidebar-content">
                  {currentUser.role === 'admin' && (
                    <>
                      <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                        <span className="sidebar-icon">🏠</span>
                        Dashboard
                      </NavLink>

                      <SidebarGroup title="Sales" icon="💰" groupKey="sales">
                        <NavLink to="/data" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                          <span className="sidebar-icon">📊</span>
                          Order Data
                        </NavLink>
                        <NavLink to="/analytics" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                          <span className="sidebar-icon">📈</span>
                          Sales Analysis
                        </NavLink>
                      </SidebarGroup>

                      <SidebarGroup title="Store" icon="🏪" groupKey="store">
                        <NavLink to="/ingredients" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                          <span className="sidebar-icon">🥕</span>
                          Ingredients
                        </NavLink>
                        <NavLink to="/stock" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                          <span className="sidebar-icon">📦</span>
                          Stock Register
                        </NavLink>
                      </SidebarGroup>

                      <SidebarGroup title="Chef" icon="👨‍🍳" groupKey="chef">
                        <NavLink to="/create" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                          <span className="sidebar-icon">➕</span>
                          Create Recipe
                        </NavLink>
                        <NavLink to="/manager" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                          <span className="sidebar-icon">🍽️</span>
                          Recipes
                        </NavLink>
                      </SidebarGroup>

                      <SidebarGroup title="Operations" icon="⚙️" groupKey="operations">
                        <NavLink to="/pos" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                          <span className="sidebar-icon">🛒</span>
                          POS
                        </NavLink>
                        <NavLink to="/kds" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                          <span className="sidebar-icon">👨‍🍳</span>
                          KDS
                        </NavLink>
                        <NavLink to="/server" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                          <span className="sidebar-icon">🎯</span>
                          Server
                        </NavLink>
                      </SidebarGroup>

                      <SidebarGroup title="Accounts" icon="💳" groupKey="accounts">
                        <NavLink to="#" className="sidebar-link">
                          <span className="sidebar-icon">📋</span>
                          Coming Soon
                        </NavLink>
                      </SidebarGroup>

                      <SidebarGroup title="Analytics" icon="📊" groupKey="analytics">
                        <NavLink to="#" className="sidebar-link">
                          <span className="sidebar-icon">📈</span>
                          Coming Soon
                        </NavLink>
                      </SidebarGroup>
                    </>
                  )}
                  {currentUser.role === 'server' && (
                    <>
                      <NavLink to="/pos" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                        <span className="sidebar-icon">🛒</span>
                        POS
                      </NavLink>
                      <NavLink to="/server" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                        <span className="sidebar-icon">🎯</span>
                        Server
                      </NavLink>
                    </>
                  )}
                  {currentUser.role === 'kitchen' && (
                    <NavLink to="/kds" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                      <span className="sidebar-icon">👨‍🍳</span>
                      KDS
                    </NavLink>
                  )}
                  {currentUser.role === 'store_manager' && (
                    <SidebarGroup title="Store" icon="🏪" groupKey="store">
                      <NavLink to="/ingredients" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                        <span className="sidebar-icon">🥕</span>
                        Ingredients
                      </NavLink>
                      <NavLink to="/stock" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
                        <span className="sidebar-icon">📦</span>
                        Stock Register
                      </NavLink>
                    </SidebarGroup>
                  )}
                </div>

                <div className="sidebar-footer">
                  <div className="sidebar-user-info">
                    <strong>{currentUser.name}</strong>
                    <span>{currentUser.role.replace('_', ' ')}</span>
                  </div>
                </div>
              </nav>
            </>
          )}
        </>
      )}

      <main>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/pin-login" element={<PinLogin />} />

            <Route path="/" element={
              currentUser ? (
                currentUser.role === 'admin' ? <Navigate to="/dashboard" replace /> :
                  currentUser.role === 'server' ? <Navigate to="/pos" replace /> :
                    currentUser.role === 'kitchen' ? <Navigate to="/kds" replace /> :
                      currentUser.role === 'store_manager' ? <Navigate to="/ingredients" replace /> :
                        <Navigate to="/pin-login" replace />
              ) : (
                <Navigate to="/pin-login" replace />
              )
            } />

            <Route path="/dashboard" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <Dashboard recipes={recipes} />
              </RoleBasedRoute>
            } />

            <Route path="/manager" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <RecipeManager
                  recipes={recipes}
                  onEditRecipe={handleEditRecipe}
                  onDeleteRecipe={handleDeleteRecipe}
                  onViewRecipe={handleViewRecipe}
                />
              </RoleBasedRoute>
            } />

            <Route path="/manager/recipe-editor" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <RecipeForm
                  ingredients={ingredients}
                  onSubmit={handleRecipeSubmit}
                  editingRecipe={editingRecipe}
                  onCancel={() => {
                    setEditingRecipe(null);
                    navigate('/manager');
                  }}
                  mode={editingRecipe ? 'edit' : 'create'}
                  recipes={recipes}
                />
              </RoleBasedRoute>
            } />

            <Route path="/manager/show-recipe" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <RecipeForm
                  ingredients={ingredients}
                  viewingRecipe={viewingRecipe}
                  mode="view"
                  recipes={recipes}
                />
              </RoleBasedRoute>
            } />

            <Route
              path="/ingredients"
              element={
                <RoleBasedRoute allowedRoles={['admin', 'store_manager']}>
                  <IngredientsManager />
                </RoleBasedRoute>
              }
            />

            <Route
              path="/stock"
              element={
                <RoleBasedRoute allowedRoles={['admin', 'store_manager']}>
                  <StockRegister />
                </RoleBasedRoute>
              }
            />

            <Route
              path="/create"
              element={
                <RoleBasedRoute allowedRoles={['admin']}>
                  <RecipeForm
                    ingredients={ingredients}
                    mode="create"
                    onSubmit={handleRecipeSubmit}
                    onCancel={() => {
                      setEditingRecipe(null);
                      navigate('/manager');
                    }}
                    recipes={recipes}
                  />
                </RoleBasedRoute>
              }
            />

            <Route
              path="/analytics"
              element={
                <RoleBasedRoute allowedRoles={['admin']}>
                  <Analytics recipes={recipes} />
                </RoleBasedRoute>
              }
            />

            <Route
              path="/data"
              element={
                <RoleBasedRoute allowedRoles={['admin']}>
                  <DataManager />
                </RoleBasedRoute>
              }
            />

            {/* POS Route - Server and Admin */}
            <Route
              path="/pos"
              element={
                <RoleBasedRoute allowedRoles={['admin', 'server']}>
                  <POSPage recipes={recipes} />
                </RoleBasedRoute>
              }
            />

            {/* KDS Route - Kitchen and Admin */}
            <Route
              path="/kds"
              element={
                <RoleBasedRoute allowedRoles={['admin', 'kitchen']}>
                  <KDSPage />
                </RoleBasedRoute>
              }
            />

            {/* Server Dashboard Route - Server and Admin */}
            <Route
              path="/server"
              element={
                <RoleBasedRoute allowedRoles={['admin', 'server']}>
                  <ServerDashboard />
                </RoleBasedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-text">&copy; 2026 Kavas Conscious Living LLP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Wrapper component that provides router context
function AppWrapper() {
  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <App />
      </Router>
    </ErrorBoundary>
  );
}

export default AppWrapper;
