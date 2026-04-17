import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars. Check .env.example.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Wraps any async fn with retry logic.
 * Supabase Pro can return transient 502s — wait 1.5s and retry up to 3 times.
 */
export async function withRetry(fn, retries = 3, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const result = await fn()
    if (!result.error) return result
    const status = result.error?.status ?? result.error?.code
    const isTransient = status === 502 || status === 503 || status === 'PGRST_CONNECTION_ERROR'
    if (!isTransient || attempt === retries) return result
    await new Promise(r => setTimeout(r, delayMs))
  }
}

export async function updateProject(po_number, field, value) {
  return withRetry(() =>
    supabase
      .from('projects')
      .update({ [field]: value })
      .eq('po_number', po_number)
  )
}
