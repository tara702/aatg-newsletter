import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _admin: SupabaseClient | null = null
let _client: SupabaseClient | null = null

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

export function getSupabaseAdmin() {
  if (_admin) return _admin
  _admin = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _admin
}

export function getSupabase() {
  if (_client) return _client
  _client = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
  return _client
}

/** Lazy proxy so importing this module during build doesn't require env vars. */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin() as any
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : Reflect.get(client, prop, receiver)
  },
})

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase() as any
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : Reflect.get(client, prop, receiver)
  },
})
