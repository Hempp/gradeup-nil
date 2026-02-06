/**
 * GradeUp NIL Platform - Initialization
 *
 * Main initialization script that sets up the platform services
 * and prepares the application for use.
 *
 * @module init
 */

import { config, loadConfig, isSupabaseConfigured } from './config.js';
import { initServices, onAuthStateChange, getSession, getCurrentUser } from './services/index.js';

// Global state
export const appState = {
  initialized: false,
  authenticated: false,
  user: null,
  profile: null,
  role: null,
  error: null,
};

/**
 * Initialize the GradeUp platform
 * Call this when the page loads.
 *
 * @returns {Promise<{success: boolean, error?: Error}>}
 */
export async function initGradeUp() {
  console.log('[GradeUp] Initializing platform...');

  try {
    // Load configuration
    loadConfig();

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn('[GradeUp] Supabase not configured. Running in demo mode with mock data.');

      if (config.features.mockDataFallback) {
        appState.initialized = true;
        appState.error = new Error('Running in demo mode - backend not connected');
        dispatchInitEvent(true, 'demo');
        return { success: true, mode: 'demo' };
      }

      throw new Error('Supabase configuration required. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
    }

    // Initialize services with Supabase config
    await initServices({
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
    });

    console.log('[GradeUp] Services initialized');

    // Check for existing session
    const { session, error: sessionError } = await getSession();
    if (sessionError) {
      console.warn('[GradeUp] Session check error:', sessionError);
    }

    if (session) {
      const { user } = await getCurrentUser();
      appState.authenticated = true;
      appState.user = user;
      console.log('[GradeUp] User authenticated:', user?.email);
    }

    // Set up auth state listener
    await onAuthStateChange((event, session) => {
      console.log('[GradeUp] Auth state changed:', event);

      if (event === 'SIGNED_IN' && session) {
        appState.authenticated = true;
        appState.user = session.user;
        dispatchAuthEvent('signed_in', session.user);
      } else if (event === 'SIGNED_OUT') {
        appState.authenticated = false;
        appState.user = null;
        appState.profile = null;
        appState.role = null;
        dispatchAuthEvent('signed_out');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[GradeUp] Token refreshed');
      }
    });

    appState.initialized = true;
    appState.error = null;
    dispatchInitEvent(true, 'connected');

    console.log('[GradeUp] Platform initialized successfully');
    return { success: true, mode: 'connected' };

  } catch (error) {
    console.error('[GradeUp] Initialization failed:', error);
    appState.error = error;
    dispatchInitEvent(false, 'error', error);
    return { success: false, error };
  }
}

/**
 * Dispatch custom event for initialization status
 */
function dispatchInitEvent(success, mode, error = null) {
  window.dispatchEvent(new CustomEvent('gradeup:init', {
    detail: { success, mode, error, state: appState }
  }));
}

/**
 * Dispatch custom event for auth state changes
 */
function dispatchAuthEvent(event, user = null) {
  window.dispatchEvent(new CustomEvent('gradeup:auth', {
    detail: { event, user, state: appState }
  }));
}

/**
 * Check if running in demo mode
 * @returns {boolean}
 */
export function isDemoMode() {
  return !isSupabaseConfigured() && config.features.mockDataFallback;
}

/**
 * Get current app state
 * @returns {object}
 */
export function getAppState() {
  return { ...appState };
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return appState.authenticated;
}

// Export for use in HTML script tags
if (typeof window !== 'undefined') {
  window.GradeUp = {
    init: initGradeUp,
    getState: getAppState,
    isAuthenticated,
    isDemoMode,
    config,
  };
}

export default {
  initGradeUp,
  getAppState,
  isAuthenticated,
  isDemoMode,
  appState,
};
