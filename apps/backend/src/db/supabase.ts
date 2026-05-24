import { createClient } from '@supabase/supabase-js'
import { config } from '../config/index.js'

// Admin client — bypasses RLS, used by the backend only
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
