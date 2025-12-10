# Recipe Manager

A modern, serverless recipe management system built with React, Netlify, and Supabase.

## Features

- **Recipe Management**: Create, update, and delete recipes with detailed information
- **Ingredient Tracking**: Manage ingredients with costs and categories
- **Cost Analysis**: Automatic calculation of recipe costs and profit margins
- **Image Upload**: Store recipe images in Supabase Storage
- **Sales Tracking**: Import and track recipe sales data
- **Analytics Dashboard**: Visualize profitability and performance metrics
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

### Frontend
- React 18
- React Router for navigation
- Chart.js for analytics
- Font Awesome icons
- Hosted on **Netlify**

### Backend
- **Supabase** (PostgreSQL database)
- **Supabase Storage** for image hosting
- **Supabase Edge Functions** for serverless backend
- Row Level Security (RLS) for data protection

## Project Structure

```
RecipeManager/
├── frontend/                 # React frontend application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # Supabase service layer
│   │   ├── config/          # Configuration files
│   │   ├── constants/       # App constants
│   │   └── styles/          # CSS styles
│   ├── package.json
│   └── .env.example
│
├── backend/                 # Supabase backend
│   └── supabase/
│       ├── migrations/      # Database migrations
│       ├── functions/       # Edge functions (optional)
│       └── config.toml      # Supabase configuration
│
├── netlify.toml            # Netlify deployment config
├── DEPLOYMENT.md           # Detailed deployment guide
└── README.md               # This file
```

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn
- Supabase account
- Netlify account

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd RecipeManager
   ```

2. **Set up Supabase**
   ```bash
   cd backend
   npm install -g supabase
   supabase login
   supabase link --project-ref your-project-ref
   supabase db push
   ```

3. **Set up Frontend**
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   # Edit .env with your Supabase credentials
   npm start
   ```

4. **Access the app**
   Open http://localhost:3000

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete deployment instructions.

### Quick Deploy to Netlify

1. Push code to GitHub
2. Connect repository to Netlify
3. Set environment variables
4. Deploy!

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

## Environment Variables

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema

### Tables
- **ingredients**: Store ingredient information (name, cost, unit, category)
- **recipes**: Store recipe details (name, category, steps, pricing, images)
- **recipe_ingredients**: Junction table linking recipes to ingredients

### Storage
- **recipe-images**: Public bucket for recipe images

## Features in Detail

### Recipe Management
- Create recipes with multiple ingredients
- Add preparation steps, cooking methods, and plating instructions
- Upload recipe images
- Mark recipes for different menu types (print, QR, website, delivery)

### Cost Calculation
- Automatic calculation of total ingredient costs
- Profit margin calculation
- Revenue and profit tracking based on sales
- Overhead percentage adjustment

### Analytics
- Profitability charts
- Sales performance metrics
- Category-wise analysis
- Excel export functionality

### Data Import/Export
- Import sales data from Excel files
- Export recipes and ingredients to Excel
- Bulk operations support

## API Reference

The app uses Supabase client library for all backend operations:

```javascript
// Get all recipes
const recipes = await recipeService.getAllRecipes();

// Create a recipe
const recipe = await recipeService.createRecipe(recipeData);

// Upload image
const url = await recipeService.uploadImage(file);

// Delete recipe
await recipeService.deleteRecipe(recipeId);
```

See `frontend/src/services/supabaseService.js` for complete API.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Cleanup

This repository has been restructured for modern serverless deployment. Old deployment files for GCloud and Render have been removed. The new structure is cleaner and optimized for:

- Faster builds (no unnecessary dependencies)
- Lower costs (serverless architecture)
- Better performance (Netlify CDN + Supabase)
- Easier maintenance (single source of truth)

**What was removed**:
- `gcloud-recipe-main/` (old structure)
- `recipe manager/` (old structure)
- Docker configurations
- Express.js server code (replaced with Supabase)
- Cloudinary config (replaced with Supabase Storage)
- Old deployment guides for GCloud/Render

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues and questions:
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help
- Review [Supabase docs](https://supabase.com/docs)
- Review [Netlify docs](https://docs.netlify.com)

---

Built with ❤️ using React, Netlify, and Supabase
