# Recipe Manager Frontend

React-based frontend for the Recipe Manager application, optimized for Netlify deployment.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your Supabase credentials

4. Start development server:
```bash
npm start
```

## Build for Production

```bash
npm run build
```

## Environment Variables

- `REACT_APP_SUPABASE_URL` - Your Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Deployment

This app is configured for Netlify deployment. Push to your connected Git repository and Netlify will automatically build and deploy.
