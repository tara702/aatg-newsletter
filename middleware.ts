import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, canAccessBrand, decodeSession } from '@/lib/session'

const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth',
  '/api/subscribe',
  '/api/unsubscribe',
  '/api/webhooks',
  '/api/cron',
  '/brands/',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.match(/\.(png|jpg|jpeg|svg|ico|webp)$/)) {
    return NextResponse.next()
  }

  const session = await decodeSession(req.cookies.get(SESSION_COOKIE)?.value)
  const legacyOk = req.cookies.get('dashboard_auth')?.value === process.env.DASHBOARD_PASSWORD

  if (!session && !legacyOk) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const brandMatch = pathname.match(/^\/dashboard\/([^/]+)/)
  if (session && brandMatch) {
    const brandSlug = brandMatch[1]
    if (brandSlug !== 'users' && brandSlug !== 'schedules' && !canAccessBrand(session, brandSlug)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  if (pathname.startsWith('/dashboard/users') && session && session.role !== 'admin' && !legacyOk) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
