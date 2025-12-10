# Cleanup Instructions

This document explains what can be safely removed after migrating to the new structure.

## ⚠️ IMPORTANT: Read Before Deleting

**DO NOT DELETE** anything until you:
1. Have successfully deployed to Netlify + Supabase
2. Have migrated all your data
3. Have tested all features work correctly
4. Have backed up your old database (if needed)

## What Can Be Deleted

### Large Directories (Save ~920MB of space)

These are the old deployment files that are no longer needed:

```bash
# Old application directory (entire old structure)
recipe manager/

# Contents include:
recipe manager/gcloud-recipe-main/node_modules/      # 892 MB
recipe manager/gcloud-recipe-main/server/node_modules/  # 20 MB
recipe manager/gcloud-recipe-main/build/              # 12 MB
recipe manager/gcloud-recipe-main/server/            # Express.js backend
recipe manager/client/                               # Old client code
```

### Specific Old Files

- `recipe manager/DEPLOYMENT.md` (old deployment guide)
- `recipe manager/gcloud-recipe-main/DEPLOYMENT_GUIDE.md` (old guide)
- `recipe manager/gcloud-recipe-main/QUICK_DEPLOY.md` (Render specific)
- `recipe manager/gcloud-recipe-main/render.yaml` (Render config)
- `recipe manager/gcloud-recipe-main/.dockerignore` (Docker config)
- `recipe manager/gcloud-recipe-main/server/.env*` (old env files)
- `recipe manager/.env.supabase` (old Supabase config)
- `recipe manager/supabase-schema.sql` (moved to backend/supabase/migrations/)
- `recipe manager/cloud-sql-proxy.exe` (GCloud specific)
- `recipe manager/package-lock.json` (not needed at root)

## How to Clean Up

### Step 1: Verify New Setup Works

Before deleting anything, confirm:

```bash
# Check new frontend exists
ls frontend/src/
ls frontend/package.json

# Check new backend exists
ls backend/supabase/migrations/

# Check configuration exists
ls netlify.toml
ls DEPLOYMENT.md
```

### Step 2: Create Backup (Optional but Recommended)

```bash
# Backup old directory before deletion
tar -czf recipe-manager-old-backup-$(date +%Y%m%d).tar.gz "recipe manager/"
```

### Step 3: Delete Old Directories

```bash
# Delete the old structure
rm -rf "recipe manager/"

# OR on Windows PowerShell:
Remove-Item -Recurse -Force "recipe manager"
```

### Step 4: Clean Git History (Optional)

If you want to remove these from Git:

```bash
# Remove from Git but keep in working directory temporarily
git rm -r --cached "recipe manager/"

# Commit the removal
git commit -m "Remove old deployment structure"

# Push to remote
git push origin main
```

## New Structure After Cleanup

```
RecipeManager/
├── frontend/                # React app (Netlify)
├── backend/                 # Supabase configs
├── netlify.toml            # Netlify config
├── DEPLOYMENT.md           # New deployment guide
├── MIGRATION_GUIDE.md      # Migration instructions
├── CLEANUP_INSTRUCTIONS.md # This file
├── README.md               # Main readme
└── .gitignore              # Updated gitignore
```

## Space Savings

- **Before cleanup**: ~1.2 GB
- **After cleanup**: ~50 MB (just source code)
- **Space saved**: ~1.15 GB (95% reduction!)

## What to Keep

✅ **Keep these**:
- `frontend/` - Your React application
- `backend/` - Supabase configuration
- `netlify.toml` - Netlify deployment config
- All new `.md` files (README, DEPLOYMENT, etc.)
- `.gitignore` - Updated for new structure

## Frequently Asked Questions

### Can I recover files after deletion?

Yes, if you:
1. Created a backup (recommended)
2. Or have Git history (files are in previous commits)

To recover from Git:
```bash
git log --all -- "recipe manager/"  # Find commit with the files
git checkout <commit-hash> -- "recipe manager/"
```

### What if something breaks after deletion?

1. Restore from backup if you created one
2. Or recover from Git history (see above)
3. Or download from your GitHub repository

### Should I delete from Git history entirely?

Only if you want to reduce repository size. This is advanced:

```bash
# WARNING: This rewrites Git history!
git filter-branch --tree-filter 'rm -rf "recipe manager"' HEAD
git push --force
```

**Note**: This affects all collaborators. Only do this if you understand the implications.

## Verification Checklist

Before considering cleanup complete:

- [ ] New app deployed to Netlify
- [ ] Database migrated to Supabase
- [ ] All features tested and working
- [ ] Images migrated to Supabase Storage
- [ ] Environment variables configured
- [ ] Backup created (if desired)
- [ ] Old GCloud/Render resources deleted (if applicable)
- [ ] Team members notified of new structure

## Old Cloud Resources

Don't forget to delete old cloud resources to avoid charges:

### Google Cloud
```bash
gcloud run services delete recipe-frontend --region=us-central1
gcloud run services delete recipe-backend --region=us-central1
gcloud sql instances delete recipe-db
```

### Render.com
- Go to Render Dashboard
- Delete web services
- Delete PostgreSQL database

### Cloudinary (if used)
- Delete unused images
- Downgrade plan if on paid tier

---

**Ready to clean up?** Follow the steps above carefully, and you'll have a lean, modern codebase!
