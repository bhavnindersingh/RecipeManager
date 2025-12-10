# Migration Guide: Old Structure → Netlify + Supabase

This guide explains how to migrate from the old deployment (GCloud/Render) to the new Netlify + Supabase setup.

## What Changed?

### Old Structure
```
RecipeManager/
└── recipe manager/
    └── gcloud-recipe-main/
        ├── server/              # Express.js backend
        ├── src/                 # React frontend
        ├── node_modules/        # 900MB+
        └── build/
```

### New Structure
```
RecipeManager/
├── frontend/                    # Clean React app
│   ├── src/
│   └── package.json
├── backend/supabase/           # Supabase config & migrations
├── netlify.toml                # Netlify config
└── DEPLOYMENT.md               # New deployment guide
```

## Benefits of New Structure

1. **90% Smaller**: Removed 900MB+ of node_modules
2. **Serverless**: No Express server to maintain
3. **Faster**: Netlify CDN + Supabase edge network
4. **Cheaper**: Free tier for both services
5. **Simpler**: Direct database access with Supabase client

## Migration Steps

### 1. Data Migration

If you have existing data in your old database:

```bash
# Export from old PostgreSQL database
pg_dump your_old_database_url > backup.sql

# Import to Supabase
# (Get connection string from Supabase Dashboard → Settings → Database)
psql "your_supabase_connection_string" < backup.sql
```

### 2. Image Migration

If you have images in Cloudinary or GCloud Storage:

1. Download all images from old storage
2. Upload to Supabase Storage:
   - Go to Supabase Dashboard → Storage
   - Select `recipe-images` bucket
   - Upload files
3. Update image URLs in database:
   ```sql
   UPDATE recipes
   SET image_url = REPLACE(image_url, 'old-domain.com', 'your-project.supabase.co/storage/v1/object/public/recipe-images');
   ```

### 3. Code Changes

The new frontend uses Supabase client instead of REST API:

**Old way (REST API):**
```javascript
const response = await fetch(`${API_URL}/recipes`);
const recipes = await response.json();
```

**New way (Supabase):**
```javascript
import { recipeService } from './services/supabaseService';
const recipes = await recipeService.getAllRecipes();
```

### 4. Environment Variables

**Old (.env):**
```
REACT_APP_API_URL=https://backend.example.com
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
DB_HOST=xxx
DB_PASSWORD=xxx
```

**New (.env):**
```
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=xxx
```

Much simpler!

## What Was Removed?

### Files/Directories Removed
- `recipe manager/gcloud-recipe-main/server/` - Express.js backend
- `recipe manager/gcloud-recipe-main/node_modules/` - 900MB
- All Docker files
- GCloud deployment configs
- Render deployment configs
- Cloudinary configuration

### Why They're Not Needed
- **Express server**: Replaced by Supabase (PostgreSQL + Auth + Storage)
- **Cloudinary**: Replaced by Supabase Storage
- **Docker**: Netlify handles deployment
- **GCloud/Render configs**: Using Netlify instead

## Component Updates

All React components work as-is! The only changes are in service layer:

### Updated Files
- `frontend/src/services/supabaseService.js` - New Supabase service
- `frontend/src/config/supabase.js` - Supabase client config
- `frontend/src/config.js` - Simplified config

### No Changes Needed
- All React components (they use the service layer)
- All styles
- All assets
- All constants

## Testing Migration

After migration, test these features:

1. ✅ View all recipes
2. ✅ Create new recipe with ingredients
3. ✅ Upload recipe image
4. ✅ Update recipe
5. ✅ Delete recipe (verify image deleted from storage)
6. ✅ Create/update/delete ingredients
7. ✅ Import sales data from Excel
8. ✅ Export data to Excel
9. ✅ View analytics dashboard

## Rollback Plan

If you need to rollback:

1. Keep old deployment running until new one is tested
2. Old data is still in old database (not touched)
3. Can export from Supabase and import back to old DB if needed

## Cost Comparison

### Old Setup (GCloud/Render)
- Cloud Run: $20-50/month
- Cloud SQL: $10-30/month
- Cloud Storage: $5-10/month
- **Total: ~$35-90/month**

### New Setup (Netlify + Supabase)
- Netlify: $0 (free tier)
- Supabase: $0 (free tier)
- **Total: $0/month**

For production traffic, upgrade costs:
- Netlify Pro: $19/month
- Supabase Pro: $25/month
- **Total: $44/month** (still cheaper!)

## Cleanup Old Resources

Once migration is complete and tested:

### GCloud Cleanup
```bash
# Delete Cloud Run services
gcloud run services delete recipe-frontend
gcloud run services delete recipe-backend

# Delete Cloud SQL instance
gcloud sql instances delete recipe-db

# Delete Storage buckets
gsutil rm -r gs://your-bucket-name
```

### Render Cleanup
1. Go to Render Dashboard
2. Delete each service
3. Delete PostgreSQL database

### Local Cleanup
```bash
# Remove old directories (after confirming new setup works!)
rm -rf "recipe manager/"
```

## Troubleshooting Migration

### Data didn't migrate?
- Check pg_dump completed without errors
- Verify table names match (lowercase in PostgreSQL)
- Check Supabase logs for import errors

### Images not displaying?
- Verify bucket is public
- Check image URLs are correct
- Ensure storage policies allow public read

### App not connecting to Supabase?
- Verify environment variables in Netlify
- Check Supabase project is active
- Verify anon key is correct (not service role key!)

## Need Help?

1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment steps
2. Review Supabase docs: https://supabase.com/docs
3. Check Netlify docs: https://docs.netlify.com

---

**Migration complete!** You now have a modern, serverless architecture that's faster, cheaper, and easier to maintain.
