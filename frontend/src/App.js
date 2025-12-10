import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import IngredientsManager from './components/IngredientsManager';
import RecipeForm from './components/RecipeForm';
import RecipeManager from './components/RecipeManager';
import Analytics from './components/Analytics';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import DataManager from './components/DataManager';
import { recipeService, ingredientService } from './services/supabaseService';
import './styles/App.css';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('isAuthenticated') === 'true';
  });

  // Save editingRecipe to sessionStorage whenever it changes
  useEffect(() => {
    if (editingRecipe) {
      sessionStorage.setItem('editingRecipe', JSON.stringify(editingRecipe));
    } else {
      sessionStorage.removeItem('editingRecipe');
    }
  }, [editingRecipe]);

  // Handle login
  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
    sessionStorage.setItem('isAuthenticated', 'true');
    navigate('/manager');
  }, [navigate]);

  // Handle logout
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('editingRecipe');
    navigate('/login');
  }, [navigate]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [isAuthenticated, location.pathname, navigate]);

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
      console.log('Fetched recipes:', data);
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchIngredients();
      fetchRecipes();
    }
  }, [isAuthenticated, fetchIngredients, fetchRecipes]);


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
      console.log('Deleting recipe with ID:', recipeId);
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

  const handleSalesUpdate = async () => {
    try {
      // Only refresh the recipes list
      await fetchRecipes();
      return true;
    } catch (error) {
      console.error('Error refreshing recipes:', error);
      return false;
    }
  };

  // Clear viewing recipe when navigating away
  useEffect(() => {
    return () => {
      setViewingRecipe(null);
    };
  }, []);

  return (
    <div className="app">
      <ScrollToTop />
      {isAuthenticated && (
        <header className="app-header">
          <div className="nav-container">
            <div className="nav-left">
              <img
                src="/conscious-cafe-logo.svg"
                alt="Conscious Café"
                className="header-logo"
                loading="eager"
              />
              <nav className="nav-tabs">
                <NavLink to="/manager" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Recipes
                </NavLink>
                <NavLink to="/ingredients" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Ingredients
                </NavLink>
                <NavLink to="/create" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Create Recipe
                </NavLink>
                <NavLink to="/analytics" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Analytics
                </NavLink>
                <NavLink to="/data" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  Sales Data
                </NavLink>
              </nav>
            </div>
            <div className="nav-actions">
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
      )}

      <main>
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? (
              <Navigate to="/manager" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          } />
          
          <Route path="/" element={
            isAuthenticated ? <Navigate to="/manager" replace /> : <Navigate to="/login" replace />
          } />
          
          <Route path="/manager" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RecipeManager 
                recipes={recipes} 
                onEditRecipe={handleEditRecipe}
                onDeleteRecipe={handleDeleteRecipe}
                onViewRecipe={handleViewRecipe}
              />
            </ProtectedRoute>
          } />

          <Route path="/manager/recipe-editor" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
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
            </ProtectedRoute>
          } />

          <Route path="/manager/show-recipe" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <RecipeForm 
                ingredients={ingredients}
                viewingRecipe={viewingRecipe}
                mode="view"
                recipes={recipes}
              />
            </ProtectedRoute>
          } />

          <Route 
            path="/ingredients" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <IngredientsManager />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/create" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
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
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Analytics recipes={recipes} />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/data" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <DataManager 
                  recipes={recipes} 
                  ingredients={ingredients}
                  onSalesUpdate={handleSalesUpdate}
                />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/manager" replace />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-text">&copy; 2024 Kavas Conscious Living LLP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Wrapper component that provides router context
function AppWrapper() {
  return (
    <Router>
      <ScrollToTop />
      <App />
    </Router>
  );
}

export default AppWrapper;
