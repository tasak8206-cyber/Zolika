import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

/**
 * Singleton Supabase browser client.
 * Prevents multiple GoTrueClient instances and avoids memory leaks.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Returns the shared Supabase browser client instance.
 * Validates required environment variables on first initialization.
 *
 * Use this in Client Components and browser-side code.
 */
export function createClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      throw new Error(
        'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.'
      )
    }

    browserClient = createBrowserClient<Database>(url, key)
  }
  return browserClient
}