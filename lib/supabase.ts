import { createClient } from "@supabase/supabase-js"

// Validate environment variables
function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    const error = `Missing required environment variable: ${name}. Please set this in your Vercel project settings.`
    if (typeof window === 'undefined') {
      // Server-side: throw error
      throw new Error(error)
    } else {
      // Client-side: log error and show user-friendly message
      console.error(error)
      throw new Error('Configuration error: Supabase is not properly configured. Please contact support.')
    }
  }
  return value
}

// Create a single supabase client for server-side
export const createServerSupabaseClient = () => {
  const url = validateEnvVar('SUPABASE_URL', process.env.SUPABASE_URL)
  const key = validateEnvVar('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY)
  return createClient(url, key)
}

// Create a singleton client for client-side
let clientSupabase: ReturnType<typeof createClient> | null = null

export const createClientSupabaseClient = () => {
  if (clientSupabase) return clientSupabase

  const url = validateEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key = validateEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  
  clientSupabase = createClient(url, key)

  return clientSupabase
}
