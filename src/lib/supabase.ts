import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '@/config'

/** Supabase client (loaded lazily so it stays out of the initial bundle). `null` when accounts are disabled. */
export const supabase: SupabaseClient | null =
  config.supabaseUrl && config.supabaseKey
    ? createClient(config.supabaseUrl, config.supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
      })
    : null
