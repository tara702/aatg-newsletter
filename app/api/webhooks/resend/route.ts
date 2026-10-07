import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getBrand, brandTables, BRANDS } from '@/lib/brands'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const { type, data } = payload

    const eventMap: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
      'email.bounced': 'bounced',
      'email.complained': 'spam',
      'email.unsubscribed': 'unsubscribed',
    }

    const eventType = eventMap[type]
    if (!eventType) return NextResponse.json({ ok: true })

    const email = data?.to?.[0] || data?.email
    if (!email) return NextResponse.json({ ok: true })

    const tagBrand =
      data?.tags?.find?.((t: { name: string; value: string }) => t.name === 'brand')?.value ||
      data?.tags?.brand

    const brand = getBrand(tagBrand) || BRANDS[0]
    const tables = brandTables(brand)

    await supabaseAdmin.from(tables.emailEvents).insert({
      email: email.toLowerCase(),
      event_type: eventType,
      resend_email_id: data?.email_id || null,
      click_url: data?.click?.link || null,
      created_at: new Date().toISOString(),
    })

    if (eventType === 'bounced' || eventType === 'unsubscribed') {
      await supabaseAdmin
        .from(tables.subscribers)
        .update({ status: eventType === 'bounced' ? 'bounced' : 'unsubscribed' })
        .eq('email', email.toLowerCase())
    }

    if (eventType === 'opened' || eventType === 'clicked') {
      const { data: sub } = await supabaseAdmin
        .from(tables.subscribers)
        .select('engagement_score')
        .eq('email', email.toLowerCase())
        .single()

      if (sub) {
        const newScore = Math.min(10, (sub.engagement_score || 5) + (eventType === 'clicked' ? 2 : 1))
        await supabaseAdmin
          .from(tables.subscribers)
          .update({ engagement_score: newScore })
          .eq('email', email.toLowerCase())
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
