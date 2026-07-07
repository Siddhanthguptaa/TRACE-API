import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase

  // NEXT_PUBLIC_ vars are string-replaced at build time by Next.js.
  // Read them here so the replacement happens inside the function body,
  // which is still evaluated at build time but only throws when called.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      `Supabase config missing: URL=${url ? 'set' : 'EMPTY'}, KEY=${key ? 'set' : 'EMPTY'}. ` +
      `Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment ` +
      `and that the app was rebuilt after setting them.`
    )
  }

  _supabase = createClient(url, key)
  return _supabase
}

// Proxy defers actual client creation to first property access at runtime
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = Reflect.get(client, prop)
    // Bind methods to the client instance
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
