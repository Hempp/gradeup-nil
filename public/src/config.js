/**
 * GradeUp NIL Platform - Configuration
 *
 * Environment configuration for the platform.
 * In production, these values should be set via environment variables.
 *
 * @module config
 */

// Configuration object - replace with your Supabase project values
export const config = {
  // Supabase Configuration
  // Get these from: https://supabase.com/dashboard/project/_/settings/api
  supabaseUrl: window.SUPABASE_URL || '',
  supabaseAnonKey: window.SUPABASE_ANON_KEY || '',

  // Application Settings
  appName: 'GradeUp NIL',
  appVersion: '1.0.0',

  // Feature Flags
  features: {
    enableAI: false,          // AI matching and recommendations
    enableRealtime: true,     // Real-time messaging and updates
    enableAnalytics: true,    // Analytics tracking
    enableStatTaq: true,      // StatTaq integration
    mockDataFallback: true,   // Fall back to mock data if not connected
  },

  // API Configuration
  api: {
    timeout: 30000,           // Request timeout in ms
    retries: 3,               // Number of retries on failure
  },

  // Storage Buckets
  storage: {
    avatars: 'avatars',
    documents: 'documents',
    contracts: 'contracts',
    media: 'media',
  },
};

/**
 * Check if Supabase is configured
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

/**
 * Set Supabase configuration
 * @param {string} url - Supabase project URL
 * @param {string} anonKey - Supabase anon key
 */
export function setSupabaseConfig(url, anonKey) {
  config.supabaseUrl = url;
  config.supabaseAnonKey = anonKey;
  window.SUPABASE_URL = url;
  window.SUPABASE_ANON_KEY = anonKey;
}

/**
 * Load configuration from environment
 * Checks for config in various locations
 */
export function loadConfig() {
  // Check for inline config
  if (window.GRADEUP_CONFIG) {
    Object.assign(config, window.GRADEUP_CONFIG);
  }

  // Check for environment variables (Vercel, Netlify, etc.)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.SUPABASE_URL) config.supabaseUrl = process.env.SUPABASE_URL;
    if (process.env.SUPABASE_ANON_KEY) config.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  }

  // Check for Vite environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_SUPABASE_URL) config.supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) config.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (import.meta.env.VITE_ENABLE_AI !== undefined) config.features.enableAI = import.meta.env.VITE_ENABLE_AI === 'true';
    if (import.meta.env.VITE_ENABLE_REALTIME !== undefined) config.features.enableRealtime = import.meta.env.VITE_ENABLE_REALTIME === 'true';
    if (import.meta.env.VITE_ENABLE_ANALYTICS !== undefined) config.features.enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
    if (import.meta.env.VITE_DEMO_MODE !== undefined) config.features.mockDataFallback = import.meta.env.VITE_DEMO_MODE === 'true';
  }

  return config;
}

export default config;
