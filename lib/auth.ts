import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { BRAND_SLUGS, type BrandSlug } from '@/lib/brands'
import { supabaseAdmin } from '@/lib/supabase'
import {
  canAccessBrand,
  decodeSession,
  encodeSession,
  type HubRole,
  type HubSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  clearSessionCookie,
} from '@/lib/session'

export type { HubRole, HubSession }
export {
  canAccessBrand,
  decodeSession,
  encodeSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  clearSessionCookie,
}

export function hashPassword(password: string, salt?: string) {
  const s = salt || randomBytes(16).toString('hex')
  const hash = scryptSync(password, s, 64).toString('hex')
  return `${s}:${hash}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const next = scryptSync(password, salt, 64)
  const prev = Buffer.from(hash, 'hex')
  if (next.length !== prev.length) return false
  return timingSafeEqual(next, prev)
}

export function sessionFromRequest(req: NextRequest): Promise<HubSession | null> {
  return decodeSession(req.cookies.get(SESSION_COOKIE)?.value)
}

export async function getSession(): Promise<HubSession | null> {
  const jar = await cookies()
  return decodeSession(jar.get(SESSION_COOKIE)?.value)
}

export async function loadUserSession(userId: string): Promise<HubSession | null> {
  const { data: user } = await supabaseAdmin
    .from('hub_users')
    .select('id, email, name, role, is_active')
    .eq('id', userId)
    .single()

  if (!user || !user.is_active) return null

  if (user.role === 'admin') {
    return {
      userId: user.id,
      email: user.email,
      name: user.name || user.email,
      role: 'admin',
      brandSlugs: '*',
    }
  }

  const { data: access } = await supabaseAdmin
    .from('hub_user_brands')
    .select('brand_slug')
    .eq('user_id', user.id)

  const brandSlugs = (access || [])
    .map(a => a.brand_slug)
    .filter((s): s is BrandSlug => BRAND_SLUGS.includes(s as BrandSlug))

  return {
    userId: user.id,
    email: user.email,
    name: user.name || user.email,
    role: 'editor',
    brandSlugs,
  }
}

export function masterAdminSession(email = 'admin@amg'): HubSession {
  return {
    userId: 'master',
    email,
    name: 'AMG Admin',
    role: 'admin',
    brandSlugs: '*',
  }
}
