# Recipe Manager - Netlify + Supabase Deployment Guide

Complete guide to deploy your Recipe Manager application using Netlify for the frontend and Supabase for the backend.

## Architecture Overview

- **Frontend**: React app hosted on Netlify
- **Backend**: Supabase (PostgreSQL database + Storage + Auth)
- **Image Storage**: Supabase Storage buckets
- **CDN**: Netlify's built-in CDN

## Prerequisites

1. GitHub account with your code repository
2. Netlify account (free tier available)
3. Supabase account (free tier available)

---

## Part 1: Supabase Setup

### Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click **"New Project"**
3. Configure your project:
   - **Name**: recipe-manager
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Plan**: Free tier is sufficient to start
4. Wait for project provisioning (~2 minutes)

### Step 2: Run Database Migrations

1. Get your project reference ID from the Supabase dashboard URL:
   ```
   https://app.supabase.com/project/[your-project-ref]
   ```

2. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

3. Login to Supabase:
   ```bash
   supabase login
   ```

4. Link your project:
   ```bash
   cd backend
   supabase link --project-ref your-project-ref
   ```

5. Push migrations to create tables:
   ```bash
   supabase db push
   ```

### Step 3: Set Up Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. The `recipe-images` bucket should already be created by migration
3. If not, create it manually:
   - Click **"New bucket"**
   - Name: `recipe-images`
   - **Public bucket**: ON
   - Click **"Create bucket"**

4. Set bucket policies (should be set by migration):
   - Go to **Policies** tab
   - Ensure public read access is enabled
   - Allow authenticated uploads/deletes

### Step 4: Get Supabase Credentials

From your Supabase project dashboard:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

Keep these handy for Netlify configuration!

---

## Part 2: Netlify Deployment

### Step 5: Prepare Your Repository

1. Ensure your code is pushed to GitHub:
   ```bash
   git add .
   git commit -m "Restructure for Netlify + Supabase deployment"
   git push origin main
   ```

### Step 6: Deploy to Netlify

#### Option A: Using Netlify UI (Recommended)

1. Go to https://netlify.com and sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect to your GitHub repository
4. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`
   - **Branch to deploy**: `main`

5. Add environment variables (click **"Show advanced"** → **"New variable"**):
   - `REACT_APP_SUPABASE_URL` = Your Supabase project URL
   - `REACT_APP_SUPABASE_ANON_KEY` = Your Supabase anon key

6. Click **"Deploy site"**

#### Option B: Using Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### Step 7: Configure Custom Domain (Optional)

1. In Netlify dashboard, go to **Domain settings**
2. Click **"Add custom domain"**
3. Follow instructions to configure DNS

---

## Part 3: Verification & Testing

### Step 8: Test Your Deployment

1. Open your Netlify URL (e.g., `https://your-app.netlify.app`)

2. Test the following:
   - ✅ App loads without errors
   - ✅ Create a new ingredient
   - ✅ Upload an image (test Supabase Storage)
   - ✅ Create a new recipe with ingredients
   - ✅ Update a recipe
   - ✅ Delete a recipe (verify image deletion)

3. Check browser console for any errors

4. Verify Supabase data:
   - Open Supabase Dashboard
   - Go to **Table Editor**
   - Check that data appears in `ingredients` and `recipes` tables

---

## Troubleshooting

### Frontend Issues

**Problem**: "Missing Supabase environment variables"
- Verify environment variables are set in Netlify
- Redeploy the site after adding variables
- Check variable names match exactly (case-sensitive)

**Problem**: Build fails
- Check Node version (should be 18)
- Clear build cache: Netlify UI → Deploys → Trigger deploy → Clear cache and deploy
- Check build logs for specific errors

**Problem**: "Cannot connect to Supabase"
- Verify Supabase URL and anon key are correct
- Check that your Supabase project is active
- Open browser DevTools → Network to see actual error

### Backend Issues

**Problem**: "Row Level Security policy violation"
- Go to Supabase Dashboard → Authentication → Policies
- Verify policies allow public access (or implement auth)
- Check migration ran successfully

**Problem**: "Permission denied for storage bucket"
- Go to Storage → Policies
- Ensure public read access is enabled
- Check bucket name matches `recipe-images`

**Problem**: Images don't upload
- Check storage bucket exists and is public
- Verify file size is under 10MB
- Check browser console for specific errors

---

## Environment Variables Reference

### Frontend (.env)

```bash
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### Netlify Environment Variables

Add these in Netlify Dashboard → Site settings → Environment variables:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

---

## Cost & Limitations

### Free Tier Limits

**Netlify Free Tier**:
- 100 GB bandwidth/month
- 300 build minutes/month
- Automatic HTTPS
- Continuous deployment from Git
- Custom domains

**Supabase Free Tier**:
- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users
- 500,000 Edge Function invocations

### Upgrading for Production

**Netlify Pro** ($19/month):
- 400 GB bandwidth
- More build minutes
- Analytics
- Background functions

**Supabase Pro** ($25/month):
- 8 GB database
- 100 GB file storage
- 250 GB bandwidth
- Daily backups
- Priority support

---

## Continuous Deployment

Once set up, any push to your main branch will trigger:
1. Automatic build on Netlify
2. Automatic deployment
3. Zero-downtime updates

To deploy:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Netlify will automatically build and deploy!

---

## Database Backups

### Manual Backup

1. Go to Supabase Dashboard
2. Database → Backups
3. Click "Download backup"

### Automated Backups

Available on Supabase Pro plan:
- Daily automated backups
- Point-in-time recovery
- 7-day retention

---

## Monitoring & Logs

### Netlify Logs
- Netlify Dashboard → Deploys → Deploy log
- Function logs (if using Netlify Functions)

### Supabase Logs
- Supabase Dashboard → Logs
- Database logs
- API logs
- Storage logs

---

## Security Best Practices

1. **Row Level Security**: Already enabled, but consider implementing user authentication
2. **API Keys**: Never commit API keys to Git (use environment variables)
3. **CORS**: Configured automatically by Supabase
4. **HTTPS**: Automatic with both Netlify and Supabase
5. **Storage**: Consider adding file type validation in production

---

## Next Steps

1. **Add Authentication**: Implement Supabase Auth for user management
2. **Custom Domain**: Set up your custom domain in Netlify
3. **Analytics**: Enable Netlify Analytics
4. **Monitoring**: Set up error tracking (e.g., Sentry)
5. **CI/CD**: Add automated tests before deployment

---

## Support Resources

- **Netlify Docs**: https://docs.netlify.com
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev

---

## Migration from Old Setup

If migrating from GCloud/Render:

1. **Data Migration**:
   ```bash
   # Export from old PostgreSQL
   pg_dump old_database_url > backup.sql

   # Import to Supabase
   psql supabase_connection_string < backup.sql
   ```

2. **Image Migration**:
   - Download images from old storage
   - Upload to Supabase Storage bucket
   - Update image URLs in database

3. **Update DNS**:
   - Point domain to Netlify
   - Update CORS origins in Supabase if needed

---

**Deployment Complete! 🎉**

Your Recipe Manager is now live on Netlify with Supabase backend!

Need help? Check the troubleshooting section above or consult the official documentation.
