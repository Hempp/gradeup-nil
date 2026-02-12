// Only export client-side utilities from index
// Server-side code should be imported directly from './server'
export { createClient as createBrowserClient, getSupabaseClient } from './client';

// Note: Don't re-export server code here - it uses 'next/headers' which
// can't be bundled with client components. Import directly from './server' when needed.
