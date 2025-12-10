# Project Structure

## 📁 Directory Layout

```
RecipeManager/
│
├── 📂 frontend/                      # React Application (Deploy to Netlify)
│   ├── 📂 public/                   # Static assets (images, icons, HTML)
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   ├── manifest.json
│   │   └── *.svg, *.png            # Logo and icon files
│   │
│   ├── 📂 src/                      # React source code
│   │   ├── 📂 components/          # React components
│   │   │   ├── Analytics.js        # Analytics dashboard
│   │   │   ├── DataManager.js      # Import/export functionality
│   │   │   ├── IngredientForm.js   # Add/edit ingredients
│   │   │   ├── IngredientsManager.js # Manage ingredients
│   │   │   ├── Login.js            # Login component
│   │   │   ├── ProfitabilityAnalysis.js # Profit analytics
│   │   │   ├── ProtectedRoute.js   # Route protection
│   │   │   ├── RecipeForm.js       # Add/edit recipes
│   │   │   ├── RecipeList.js       # Display recipes
│   │   │   └── RecipeManager.js    # Main recipe management
│   │   │
│   │   ├── 📂 services/            # Backend service layer
│   │   │   └── supabaseService.js  # All Supabase operations
│   │   │
│   │   ├── 📂 config/              # Configuration
│   │   │   └── supabase.js         # Supabase client setup
│   │   │
│   │   ├── 📂 constants/           # App constants
│   │   │   ├── categories.js      # Recipe categories
│   │   │   └── ingredientCategories.js # Ingredient categories
│   │   │
│   │   ├── 📂 styles/              # CSS files
│   │   │   ├── Analytics.css
│   │   │   ├── App.css
│   │   │   ├── DataManager.css
│   │   │   ├── IngredientsManager.css
│   │   │   ├── Login.css
│   │   │   └── NewRecipeForm.css
│   │   │
│   │   ├── App.js                  # Main App component
│   │   ├── App.css                 # Main App styles
│   │   ├── index.js                # React entry point
│   │   ├── index.css               # Global styles
│   │   └── config.js               # App configuration
│   │
│   ├── package.json                # Frontend dependencies
│   ├── .env.example                # Environment variables template
│   ├── .gitignore                  # Git ignore for frontend
│   └── README.md                   # Frontend documentation
│
├── 📂 backend/                      # Supabase Backend Configuration
│   └── 📂 supabase/
│       ├── 📂 migrations/          # Database migrations
│       │   ├── 20240101000000_initial_schema.sql  # Tables & indexes
│       │   └── 20240101000001_storage_bucket.sql  # Storage setup
│       │
│       ├── 📂 functions/           # Edge Functions (optional)
│       │   └── upload-image/       # Image upload function (if needed)
│       │
│       ├── config.toml             # Supabase local config
│       └── README.md               # Backend documentation
│
├── 📄 netlify.toml                  # Netlify deployment configuration
├── 📄 .gitignore                    # Root Git ignore
│
├── 📖 README.md                     # Main project documentation
├── 📖 DEPLOYMENT.md                 # Deployment guide (Netlify + Supabase)
├── 📖 MIGRATION_GUIDE.md            # Migration from old setup
├── 📖 CLEANUP_INSTRUCTIONS.md       # How to remove old files
├── 📖 QUICKSTART.md                 # 5-minute quick start
├── 📖 RESTRUCTURE_SUMMARY.md        # Summary of changes
└── 📖 PROJECT_STRUCTURE.md          # This file
```

## 🗂️ Old Structure (To Be Removed)

```
RecipeManager/
└── 📂 recipe manager/               # ⚠️ OLD - Can be deleted after migration
    ├── 📂 gcloud-recipe-main/      # Old application (900MB+)
    │   ├── server/                 # Express.js backend (no longer needed)
    │   ├── src/                    # Old React frontend (copied to new frontend/)
    │   ├── node_modules/           # 892 MB (huge!)
    │   └── build/                  # Old build artifacts
    ├── 📂 client/                   # Old client code
    └── Various old config files
```

## 📊 File Count Summary

### New Structure
- **Frontend Source Files**: ~20 React components + services
- **Backend Files**: 2 SQL migrations + 1 config
- **Documentation**: 7 markdown files
- **Configuration**: 3 files (netlify.toml, .gitignore, package.json)
- **Total Size**: ~50 MB (source code only)

### Old Structure (to be removed)
- **node_modules**: 892 MB
- **server/node_modules**: 20 MB
- **build**: 12 MB
- **Total**: ~1.2 GB

## 🎯 Key Files Explained

### Configuration Files

| File | Purpose |
|------|---------|
| `netlify.toml` | Netlify deployment config (build command, redirects) |
| `frontend/package.json` | React dependencies |
| `frontend/.env` | Supabase credentials (not committed) |
| `backend/supabase/config.toml` | Supabase local development config |

### Service Layer

| File | Purpose |
|------|---------|
| `frontend/src/services/supabaseService.js` | All database operations (CRUD) |
| `frontend/src/config/supabase.js` | Supabase client initialization |
| `frontend/src/config.js` | App-wide configuration |

### Database

| File | Purpose |
|------|---------|
| `backend/supabase/migrations/20240101000000_initial_schema.sql` | Create tables, indexes, RLS policies |
| `backend/supabase/migrations/20240101000001_storage_bucket.sql` | Create storage bucket for images |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview, features, tech stack |
| `DEPLOYMENT.md` | Complete deployment guide (step-by-step) |
| `QUICKSTART.md` | Get running in 5 minutes |
| `MIGRATION_GUIDE.md` | Migrate from old setup |
| `CLEANUP_INSTRUCTIONS.md` | Safely remove old files |
| `RESTRUCTURE_SUMMARY.md` | Summary of all changes |
| `PROJECT_STRUCTURE.md` | This file - project structure |

## 🔄 Data Flow

```
User Browser
    ↓
React App (Netlify)
    ↓
Supabase Client
    ↓
┌─────────────────────┐
│  Supabase Backend   │
│  ┌───────────────┐  │
│  │  PostgreSQL   │  │ ← Database tables
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │    Storage    │  │ ← Image files
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │     Auth      │  │ ← User auth (optional)
│  └───────────────┘  │
└─────────────────────┘
```

## 🚀 Deployment Flow

```
Git Push
    ↓
GitHub Repository
    ↓
Netlify (automatic trigger)
    ↓
Build React App
    ↓
Deploy to Netlify CDN
    ↓
Live Application
```

## 💾 Database Schema

### Tables

1. **ingredients**
   - id, name, cost, unit, category
   - Stores ingredient master data

2. **recipes**
   - id, name, category, steps, pricing, images, etc.
   - Stores recipe details

3. **recipe_ingredients**
   - recipe_id, ingredient_id, quantity
   - Links recipes to ingredients (many-to-many)

### Storage Buckets

1. **recipe-images**
   - Public bucket for recipe photos
   - Configured with policies for upload/read/delete

## 🎨 React Component Hierarchy

```
App
├── Router
    ├── Login
    ├── ProtectedRoute
        ├── RecipeManager
        │   ├── RecipeList
        │   └── RecipeForm
        ├── IngredientsManager
        │   └── IngredientForm
        ├── Analytics
        │   └── ProfitabilityAnalysis
        └── DataManager
```

## 📦 Dependencies

### Frontend (package.json)
- `@supabase/supabase-js` - Supabase client
- `react` - React library
- `react-router-dom` - Routing
- `chart.js`, `react-chartjs-2` - Charts
- `xlsx` - Excel import/export
- `@fortawesome/react-fontawesome` - Icons

### Backend
- No dependencies! Uses Supabase managed services

## 🔧 Development vs Production

### Development
- Frontend runs on `localhost:3000`
- Connects to Supabase cloud
- Hot reload enabled
- Source maps enabled

### Production
- Frontend deployed on Netlify
- Optimized build
- CDN distribution
- HTTPS automatic
- Environment variables from Netlify

## ⚡ Performance Optimizations

1. **Code Splitting**: React lazy loading (can be added)
2. **CDN**: Netlify edge network
3. **Database**: Indexed queries
4. **Images**: Optimized with Supabase transformations
5. **Caching**: Browser caching headers

## 🔐 Security Features

1. **Row Level Security**: Database policies
2. **HTTPS**: Automatic SSL
3. **CORS**: Configured in Supabase
4. **Environment Variables**: Never committed
5. **Public/Private Buckets**: Controlled access

---

**Next Steps**: Read QUICKSTART.md or DEPLOYMENT.md to get started!
