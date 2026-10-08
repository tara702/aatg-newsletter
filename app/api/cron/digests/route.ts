import { NextRequest, NextResponse } from 'next/server'
import { BRANDS, getBrand } from '@/lib/brands'
import { curateAndSendDigest } from '@/lib/digest'
import { supabaseAdmin } from '@/lib/supabase'

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  const header = req.headers.get('authorization')
  return header === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const day = now.getUTCDay()
  const hour = now.getUTCHours()
  const forceBrand = req.nextUrl.searchParams.get('brand')
  const force = req.nextUrl.searchParams.get('force') === '1'

  const { data: schedules, error } = await supabaseAdmin.from('brand_schedules').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: any[] = []

  for (const schedule of schedules || []) {
    const brand = getBrand(schedule.brand_slug)
    if (!brand) continue
    if (forceBrand && forceBrand !== brand.slug) continue

    // Hobby plans allow at most one cron run per day (configured for 14:00 UTC).
    // Match on weekday; hour_utc is stored for display / future Pro upgrades.
    const due =
      force ||
      (schedule.enabled &&
        schedule.day_of_week === day &&
        (schedule.hour_utc === hour || schedule.hour_utc === 14))

    if (!due) {
      results.push({ brand: brand.slug, skipped: true, reason: 'not due' })
      continue
    }

    if (!force && schedule.last_sent_at) {
      const last = new Date(schedule.last_sent_at)
      const sameDay =
        last.getUTCFullYear() === now.getUTCFullYear() &&
        last.getUTCMonth() === now.getUTCMonth() &&
        last.getUTCDate() === now.getUTCDate()
      if (sameDay) {
        results.push({ brand: brand.slug, skipped: true, reason: 'already sent today' })
        continue
      }
    }

    try {
      const result = await curateAndSendDigest(brand)
      results.push({ brand: brand.slug, ...result })
    } catch (err: any) {
      console.error('Cron digest failed', brand.slug, err)
      results.push({ brand: brand.slug, error: err?.message || 'failed' })
    }
  }

  // Ensure all brands exist in result when forced listing
  if (!schedules?.length) {
    for (const brand of BRANDS) {
      results.push({ brand: brand.slug, skipped: true, reason: 'no schedule row' })
    }
  }

  return NextResponse.json({ ok: true, at: now.toISOString(), results })
}
