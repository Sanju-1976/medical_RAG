import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _browserClient: SupabaseClient | null = null

/**
 * Returns a singleton instance of the Supabase browser client.
 * Prevents multiple GoTrue instances from conflicting on token storage.
 */
export const createBrowserClient = () => {
  if (!_browserClient) {
    _browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _browserClient
}
