import { createClient } from '@supabase/supabase-js'

// Server-side client.
// Uses the service role key when available (bypasses RLS).
// Falls back to the anon/publishable key if service role is not configured yet.
export const createServerClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
