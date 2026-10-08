import type { BrandSlug } from '@/lib/brands'

export type HubRole = 'admin' | 'editor'

export interface HubSession {
  userId: string
  email: string
  name: string
  role: HubRole
  brandSlugs: BrandSlug[] | '*'
}

export const SESSION_COOKIE = 'amg_hub_session'

function secret() {
  return process.env.HUB_SESSION_SECRET || process.env.DASHBOARD_PASSWORD || 'amg-dev-secret'
}

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function textToBase64Url(text: string) {
  return bytesToBase64Url(new TextEncoder().encode(text))
}

function base64UrlToText(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value))
}

async function hmac(payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return bytesToBase64Url(sig)
}

export async function encodeSession(session: HubSession) {
  const payload = textToBase64Url(JSON.stringify(session))
  const sig = await hmac(payload)
  return `${payload}.${sig}`
}

export async function decodeSession(token: string | undefined | null): Promise<HubSession | null> {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = await hmac(payload)
  if (expected !== sig) return null
  try {
    return JSON.parse(base64UrlToText(payload)) as HubSession
  } catch {
    return null
  }
}

export function canAccessBrand(session: HubSession, brandSlug: string) {
  if (session.role === 'admin' || session.brandSlugs === '*') return true
  return session.brandSlugs.includes(brandSlug as BrandSlug)
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  }
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  }
}
