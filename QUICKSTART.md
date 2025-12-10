# Quick Start Guide

Get your Recipe Manager up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Git

## Step 1: Get Supabase Credentials (2 min)

1. Go to https://supabase.com
2. Sign in or create account
3. Click "New Project"
4. Wait for project to be created
5. Go to Settings → API
6. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

## Step 2: Set Up Database (1 min)

In Supabase Dashboard:

1. Go to **SQL Editor**
2. Copy contents of `backend/supabase/migrations/20240101000000_initial_schema.sql`
3. Paste and click **Run**
4. Copy contents of `backend/supabase/migrations/20240101000001_storage_bucket.sql`
5. Paste and click **Run**

Done! Your database is ready.

## Step 3: Run Locally (2 min)

```bash
# 1. Clone and navigate
cd RecipeManager/frontend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Edit .env and add your Supabase credentials
# (use nano, vim, or any text editor)
nano .env

# Add:
# REACT_APP_SUPABASE_URL=https://your-project.supabase.co
# REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here

# 5. Start the app
npm start
```

App opens at http://localhost:3000 🎉

## Step 4: Deploy to Netlify (Optional, 3 min)

1. Push code to GitHub
2. Go to https://netlify.com
3. Click "Add new site" → "Import an existing project"
4. Select your GitHub repo
5. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`
6. Add environment variables (same as .env)
7. Click "Deploy"

Your app is live! 🚀

## That's It!

You now have a running Recipe Manager app.

### Next Steps

- Read [README.md](./README.md) for feature overview
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment
- Review [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) if migrating from old setup

### Common Issues

**"Missing Supabase environment variables"**
→ Check your .env file has correct credentials

**"Cannot connect to Supabase"**
→ Verify your Supabase project is active and URL is correct

**Build fails**
→ Ensure you're in the `frontend/` directory and ran `npm install`

---

Need help? Check the detailed guides or Supabase/Netlify documentation.
