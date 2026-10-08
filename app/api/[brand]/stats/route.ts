import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { brandTables } from '@/lib/brands'
import { resolveBrandParam } from '@/lib/brand-api'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ brand: string }> }
) {
  const resolved = await resolveBrandParam(params)
  if ('error' in resolved) return resolved.error
  const { brand } = resolved
  const tables = brandTables(brand)

  const [
    { count: totalSubscribers },
    { count: activeSubscribers },
    { count: unsubscribed },
    { count: bounced },
    { data: recentBroadcasts },
    { data: recentSubscribers },
    { data: topSources },
  ] = await Promise.all([
    supabaseAdmin.from(tables.subscribers).select('*', { count: 'exact', head: true }),
    supabaseAdmin.from(tables.subscribers).select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from(tables.subscribers).select('*', { count: 'exact', head: true }).eq('status', 'unsubscribed'),
    supabaseAdmin.from(tables.subscribers).select('*', { count: 'exact', head: true }).eq('status', 'bounced'),
    supabaseAdmin.from(tables.broadcasts).select('*').eq('status', 'sent').order('sent_at', { ascending: false }).limit(5),
    supabaseAdmin
      .from(tables.subscribers)
      .select('created_at')
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin
      .from(tables.subscribers)
      .select('source_url')
      .not('source_url', 'is', null)
      .eq('status', 'active')
      .limit(500),
  ])

  // Daily growth from last 30 days of signups
  const dayCounts: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
    dayCounts[key] = 0
  }
  recentSubscribers?.forEach((s: { created_at: string }) => {
    const d = new Date(s.created_at)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
    if (key in dayCounts) dayCounts[key] += 1
  })
  const dailyGrowth = Object.entries(dayCounts).map(([date, count]) => ({ date, count }))

  const sourceCounts: Record<string, number> = {}
  topSources?.forEach((s: { source_url: string }) => {
    const key = s.source_url || 'Direct'
    sourceCounts[key] = (sourceCounts[key] || 0) + 1
  })
  const sortedSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([url, count]) => ({ url, count }))

  const broadcastsWithStats = await Promise.all(
    (recentBroadcasts || []).map(async (b) => {
      const [opens, clicks] = await Promise.all([
        supabaseAdmin
          .from(tables.emailEvents)
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'opened')
          .not('resend_email_id', 'is', null),
        supabaseAdmin
          .from(tables.emailEvents)
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'clicked')
          .not('resend_email_id', 'is', null),
      ])
      return {
        ...b,
        openRate: b.recipient_count ? (((opens.count || 0) / b.recipient_count) * 100).toFixed(1) : '0',
        clickRate: b.recipient_count ? (((clicks.count || 0) / b.recipient_count) * 100).toFixed(1) : '0',
      }
    })
  )

  return NextResponse.json({
    brand: { slug: brand.slug, name: brand.name },
    subscribers: {
      total: totalSubscribers || 0,
      active: activeSubscribers || 0,
      unsubscribed: unsubscribed || 0,
      bounced: bounced || 0,
    },
    recentBroadcasts: broadcastsWithStats,
    dailyGrowth,
    topSources: sortedSources,
  })
}
