/**
 * GradeUp NIL Platform - Supabase Client
 * Shared Supabase client initialization for all services.
 *
 * @module services/supabase
 */

const config = {
  url: typeof window !== 'undefined'
    ? window.SUPABASE_URL || window.GRADEUP_CONFIG?.SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL
    : process.env.SUPABASE_URL,
  anonKey: typeof window !== 'undefined'
    ? window.SUPABASE_ANON_KEY || window.GRADEUP_CONFIG?.SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY
    : process.env.SUPABASE_ANON_KEY,
};

export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
  CONTRACTS: 'contracts',
  MEDIA: 'media',
  VIDEOS: 'videos',
  ATTACHMENTS: 'attachments',
};

export const ERROR_CODES = {
  NOT_FOUND: 'PGRST116',
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  INVALID_INPUT: '22P02',
  RLS_VIOLATION: '42501',
};

let supabaseInstance = null;

const clientOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'gradeup-auth',
  },
  global: {
    headers: { 'x-client-info': 'gradeup-nil-athlete-portal/1.0.0' },
  },
};

/**
 * Initialize or get the Supabase client instance (singleton)
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
export async function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  if (!config.url || !config.anonKey) {
    throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  // Check for CDN version first
  if (typeof window !== 'undefined' && window.supabase?.createClient) {
    supabaseInstance = window.supabase.createClient(config.url, config.anonKey, {
      ...clientOptions,
      auth: { ...clientOptions.auth, storage: window.localStorage },
    });
    return supabaseInstance;
  }

  // Dynamic import for browser/SSR compatibility
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  supabaseInstance = createClient(config.url, config.anonKey, {
    ...clientOptions,
    auth: {
      ...clientOptions.auth,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });

  return supabaseInstance;
}

export async function getCurrentUser() {
  const supabase = await getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export async function getSession() {
  const supabase = await getSupabaseClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

export async function isAuthenticated() {
  const { session } = await getSession();
  return session !== null;
}

export async function invokeFunction(functionName, body = null, options = {}) {
  const supabase = await getSupabaseClient();
  return supabase.functions.invoke(functionName, { body, ...options });
}

/**
 * Upload a file to Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in bucket
 * @param {File|Blob} file - File to upload
 * @param {object} options - Upload options
 * @returns {Promise<{data: {path: string, publicUrl: string}|null, error: Error|null}>}
 */
export async function uploadFile(bucket, path, file, options = {}) {
  const supabase = await getSupabaseClient();
  const { contentType, upsert = false } = options;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert });

  if (error) {
    return { data: null, error: new Error(`File upload failed: ${error.message}`) };
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { data: { path: data.path, publicUrl: urlData.publicUrl }, error: null };
}

/**
 * Delete file(s) from Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {string|string[]} paths - File path(s) to delete
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteFile(bucket, paths) {
  const supabase = await getSupabaseClient();
  const pathArray = Array.isArray(paths) ? paths : [paths];
  const { error } = await supabase.storage.from(bucket).remove(pathArray);

  if (error) {
    return { success: false, error: new Error(`File deletion failed: ${error.message}`) };
  }
  return { success: true, error: null };
}

export async function subscribeToTable(table, callback, options = {}) {
  const supabase = await getSupabaseClient();
  const { event = '*', filter } = options;

  const channelConfig = { event, schema: 'public', table };
  if (filter) channelConfig.filter = filter;

  return supabase
    .channel(`${table}-changes-${Date.now()}`)
    .on('postgres_changes', channelConfig, callback)
    .subscribe();
}

export async function unsubscribeFromChannel(channel) {
  const supabase = await getSupabaseClient();
  await supabase.removeChannel(channel);
}

export function parseError(error) {
  if (!error) return 'An unknown error occurred';

  const code = error.code || error.details?.code;
  const message = error.message || error.details?.message;

  switch (code) {
    case ERROR_CODES.NOT_FOUND:
      return 'The requested resource was not found';
    case ERROR_CODES.UNIQUE_VIOLATION:
      return 'This record already exists';
    case ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return 'This action references a record that does not exist';
    case ERROR_CODES.CHECK_VIOLATION:
      return 'The provided data does not meet the requirements';
    case ERROR_CODES.RLS_VIOLATION:
      return 'You do not have permission to perform this action';
    default:
      return message || 'An error occurred while processing your request';
  }
}

export function getConfig() {
  return {
    url: config.url,
    hasAnonKey: !!config.anonKey,
    isInitialized: !!supabaseInstance,
  };
}

export function setConfig(newConfig) {
  if (supabaseInstance) {
    console.warn('Supabase client already initialized. Configuration changes will not take effect.');
    return;
  }
  Object.assign(config, newConfig);
}

export function resetClient() {
  supabaseInstance = null;
}

export default {
  getSupabaseClient,
  getCurrentUser,
  getSession,
  isAuthenticated,
  invokeFunction,
  uploadFile,
  deleteFile,
  subscribeToTable,
  unsubscribeFromChannel,
  parseError,
  getConfig,
  setConfig,
  resetClient,
  STORAGE_BUCKETS,
  ERROR_CODES,
};
