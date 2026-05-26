import { createClient } from '@supabase/supabase-js'
import { config } from '../config/index.js'

// Admin client — bypasses RLS via explicit Authorization header with service role key
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
      },
    },
  }
)
