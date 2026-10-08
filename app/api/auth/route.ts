import { NextRequest, NextResponse } from 'next/server'
import {
  encodeSession,
  hashPassword,
  loadUserSession,
  masterAdminSession,
  sessionCookieOptions,
  clearSessionCookie,
  verifyPassword,
} from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')

  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  // Break-glass / bootstrap: master dashboard password = full admin
  if (process.env.DASHBOARD_PASSWORD && password === process.env.DASHBOARD_PASSWORD) {
    const session = masterAdminSession(email || 'admin@amg')
    const token = await encodeSession(session)
    const res = NextResponse.json({ ok: true, user: session })
    res.cookies.set(sessionCookieOptions(token))
    res.cookies.delete('dashboard_auth')
    return res
  }

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const { data: user, error } = await supabaseAdmin
    .from('hub_users')
    .select('id, password_hash, is_active')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.error('Auth lookup error', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }

  if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
  }

  const session = await loadUserSession(user.id)
  if (!session) {
    return NextResponse.json({ error: 'Account inactive' }, { status: 401 })
  }

  await supabaseAdmin
    .from('hub_users')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', user.id)

  const token = await encodeSession(session)
  const res = NextResponse.json({ ok: true, user: session })
  res.cookies.set(sessionCookieOptions(token))
  res.cookies.delete('dashboard_auth')
  return res
}

export async function GET() {
  // Used by UI to know who is logged in — resolved via cookie in route through request would need middleware.
  // Keep simple: clients call /api/me instead.
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(clearSessionCookie())
  res.cookies.delete('dashboard_auth')
  return res
}
