// Configuration for the Recipe Manager app
// This file uses Supabase for backend services

const config = {
  // Supabase credentials (loaded from environment variables)
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY,

  // App metadata
  APP_NAME: 'Recipe Manager',
  APP_VERSION: '2.0.0',

  // Storage bucket name
  STORAGE_BUCKET: 'recipe-images',

  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

// Validate required environment variables
if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables!');
  console.error('Please ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set.');
}

export default config;
