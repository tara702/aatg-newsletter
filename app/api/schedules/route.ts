import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { BRANDS } from '@/lib/brands'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin.from('brand_schedules').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const bySlug = Object.fromEntries((data || []).map(r => [r.brand_slug, r]))
  const schedules = BRANDS.filter(b => session.role === 'admin' || session.brandSlugs === '*' || session.brandSlugs.includes(b.slug)).map(
    b => ({
      brandSlug: b.slug,
      brandName: b.name,
      enabled: bySlug[b.slug]?.enabled ?? false,
      dayOfWeek: bySlug[b.slug]?.day_of_week ?? 1,
      hourUtc: bySlug[b.slug]?.hour_utc ?? 14,
      lastSentAt: bySlug[b.slug]?.last_sent_at ?? null,
    })
  )

  return NextResponse.json({ schedules })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  const brandSlug = String(body.brandSlug || '')
  if (!BRANDS.some(b => b.slug === brandSlug)) {
    return NextResponse.json({ error: 'Unknown brand' }, { status: 400 })
  }

  const row = {
    brand_slug: brandSlug,
    enabled: !!body.enabled,
    day_of_week: Number.isFinite(body.dayOfWeek) ? body.dayOfWeek : 1,
    hour_utc: Number.isFinite(body.hourUtc) ? body.hourUtc : 14,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin.from('brand_schedules').upsert(row, { onConflict: 'brand_slug' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, schedule: row })
}
