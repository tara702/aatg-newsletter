import { NextRequest, NextResponse } from 'next/server'
import { getSession, hashPassword } from '@/lib/auth'
import { BRAND_SLUGS } from '@/lib/brands'
import { supabaseAdmin } from '@/lib/supabase'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { data: users, error } = await supabaseAdmin
    .from('hub_users')
    .select('id, email, name, role, is_active, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: access } = await supabaseAdmin.from('hub_user_brands').select('user_id, brand_slug')
  const byUser: Record<string, string[]> = {}
  for (const row of access || []) {
    byUser[row.user_id] = byUser[row.user_id] || []
    byUser[row.user_id].push(row.brand_slug)
  }

  return NextResponse.json({
    users: (users || []).map(u => ({
      ...u,
      brandSlugs: u.role === 'admin' ? BRAND_SLUGS : byUser[u.id] || [],
    })),
  })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  const email = String(body.email || '').trim().toLowerCase()
  const name = String(body.name || '').trim()
  const password = String(body.password || '')
  const role = body.role === 'admin' ? 'admin' : 'editor'
  const brandSlugs: string[] = Array.isArray(body.brandSlugs) ? body.brandSlugs : []

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const { data: user, error } = await supabaseAdmin
    .from('hub_users')
    .insert({
      email,
      name: name || null,
      password_hash: hashPassword(password),
      role,
      is_active: true,
    })
    .select('id, email, name, role, is_active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (role === 'editor' && brandSlugs.length) {
    await supabaseAdmin.from('hub_user_brands').insert(
      brandSlugs
        .filter(s => BRAND_SLUGS.includes(s as any))
        .map(brand_slug => ({ user_id: user.id, brand_slug }))
    )
  }

  return NextResponse.json({ user: { ...user, brandSlugs: role === 'admin' ? BRAND_SLUGS : brandSlugs } }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'User id required' }, { status: 400 })

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (typeof body.name === 'string') updates.name = body.name
  if (body.role === 'admin' || body.role === 'editor') updates.role = body.role
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
  if (body.password) updates.password_hash = hashPassword(String(body.password))

  const { error } = await supabaseAdmin.from('hub_users').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (Array.isArray(body.brandSlugs)) {
    await supabaseAdmin.from('hub_user_brands').delete().eq('user_id', id)
    const slugs = body.brandSlugs.filter((s: string) => BRAND_SLUGS.includes(s as any))
    if (slugs.length && body.role !== 'admin') {
      await supabaseAdmin.from('hub_user_brands').insert(slugs.map((brand_slug: string) => ({ user_id: id, brand_slug })))
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'User id required' }, { status: 400 })
  const { error } = await supabaseAdmin.from('hub_users').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
