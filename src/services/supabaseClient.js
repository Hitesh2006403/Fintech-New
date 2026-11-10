import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://rmzbuevslhddkinkgikq.supabase.co';
const rawKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_3irM48DO-tN8a1MDY8qLvg_dB2TVuj7';

// Sanitize URL by removing accidental trailing /rest/v1 or trailing slashes
const supabaseUrl = (rawUrl || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (rawKey || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-ref')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    })
  : null;

/**
 * Diagnostic status helper
 */
export async function testSupabaseConnection() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      message: 'Supabase credentials not configured in .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).'
    };
  }

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        message: `Supabase query error: ${error.message}`
      };
    }
    return {
      connected: true,
      message: 'Connected to Supabase PostgreSQL successfully.'
    };
  } catch (err) {
    return {
      connected: false,
      message: `Connection failed: ${err.message}`
    };
  }
}
