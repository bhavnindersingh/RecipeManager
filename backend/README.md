# Recipe Manager Backend (Supabase)

This directory contains the Supabase configuration and database migrations for the Recipe Manager application.

## Structure

```
backend/supabase/
├── config.toml              # Supabase local config
├── migrations/              # Database migrations
│   ├── 20240101000000_initial_schema.sql
│   └── 20240101000001_storage_bucket.sql
└── functions/               # Edge functions (optional)
```

## Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to your Supabase project

```bash
cd backend
supabase link --project-ref your-project-ref
```

### 4. Push migrations to Supabase

```bash
supabase db push
```

## Local Development

Start Supabase locally:

```bash
supabase start
```

This will start:
- PostgreSQL database
- Studio (GUI)
- Auth server
- Storage server
- Edge Functions runtime

Access Studio at: http://localhost:54323

## Migrations

To create a new migration:

```bash
supabase migration new migration_name
```

## Database Schema

The database includes:
- `ingredients` - Store ingredient information
- `recipes` - Store recipe details
- `recipe_ingredients` - Junction table linking recipes and ingredients
- Storage bucket: `recipe-images` for image uploads

## Row Level Security (RLS)

All tables have RLS enabled with public access policies. For production, you should implement proper authentication and restrict these policies.
