import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseServerConfigured = Boolean(
  supabaseUrl &&
    (supabaseServiceRoleKey || supabaseAnonKey) &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-ref')
);

/**
 * Server-side Supabase client with Service Role privileges (for backend API routes and migrations).
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the frontend bundle.
 */
export const supabaseAdmin: SupabaseClient | null = isSupabaseServerConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
