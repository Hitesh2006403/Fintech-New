import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env first, then root .env as fallback
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Normalizes Supabase URL by stripping accidental trailing /rest/v1/ paths
 */
export function sanitizeSupabaseUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  url = url.replace(/\/rest\/v1\/?$/, '');
  url = url.replace(/\/+$/, '');
  return url;
}

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const rawKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
export const supabaseKey = rawKey ? rawKey.trim() : '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-ref')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

/**
 * Validates connection to the Supabase PostgreSQL Cloud instance
 */
export async function testSupabaseCloudConnection() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      configured: false,
      message: 'Supabase credentials not configured in backend/.env (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)'
    };
  }

  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        configured: true,
        urlSnippet: supabaseUrl.slice(0, 30) + '...',
        code: error.code,
        message: error.message,
        hint: error.hint || 'Ensure tables exist and grant permissions or set RLS policies in Supabase SQL editor'
      };
    }
    return {
      connected: true,
      configured: true,
      urlSnippet: supabaseUrl.slice(0, 30) + '...',
      message: 'Supabase PostgreSQL Cloud connection verified and query successful.'
    };
  } catch (err) {
    return {
      connected: false,
      configured: true,
      message: `Supabase network error: ${err.message}`
    };
  }
}
