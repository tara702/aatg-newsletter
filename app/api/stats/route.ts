import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const [
    { count: totalSubscribers },
    { count: activeSubscribers },
    { count: unsubscribed },
    { count: bounced },
    { data: recentBroadcasts },
    { data: dailyGrowth },
    { data: topSources },
  ] = await Promise.all([
    supabaseAdmin.from('subscribers').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'unsubscribed'),
    supabaseAdmin.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'bounced'),
    supabaseAdmin.from('broadcasts').select('*').eq('status', 'sent').order('sent_at', { ascending: false }).limit(5),
    supabaseAdmin.rpc('get_daily_growth', { days: 30 }),
    supabaseAdmin
      .from('subscribers')
      .select('source_url')
      .not('source_url', 'is', null)
      .eq('status', 'active')
      .limit(500),
  ])

  // Aggregate top sources
  const sourceCounts: Record<string, number> = {}
  topSources?.forEach((s: any) => {
    const key = s.source_url || 'Direct'
    sourceCounts[key] = (sourceCounts[key] || 0) + 1
  })
  const sortedSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([url, count]) => ({ url, count }))

  // Calculate broadcast stats
  const broadcastsWithStats = await Promise.all(
    (recentBroadcasts || []).map(async (b) => {
      const [opens, clicks] = await Promise.all([
        supabaseAdmin.from('email_events').select('*', { count: 'exact', head: true })
          .eq('event_type', 'opened').not('resend_email_id', 'is', null),
        supabaseAdmin.from('email_events').select('*', { count: 'exact', head: true })
          .eq('event_type', 'clicked').not('resend_email_id', 'is', null),
      ])
      return {
        ...b,
        openRate: b.recipient_count ? ((opens.count || 0) / b.recipient_count * 100).toFixed(1) : '0',
        clickRate: b.recipient_count ? ((clicks.count || 0) / b.recipient_count * 100).toFixed(1) : '0',
      }
    })
  )

  return NextResponse.json({
    subscribers: {
      total: totalSubscribers || 0,
      active: activeSubscribers || 0,
      unsubscribed: unsubscribed || 0,
      bounced: bounced || 0,
    },
    recentBroadcasts: broadcastsWithStats,
    dailyGrowth: dailyGrowth || [],
    topSources: sortedSources,
  })
}
