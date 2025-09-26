import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for server-side
export const createServerSupabaseClient = () => {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Create a singleton client for client-side
let clientSupabase: ReturnType<typeof createClient> | null = null

export const createClientSupabaseClient = () => {
  if (clientSupabase) return clientSupabase

  clientSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  return clientSupabase
}
