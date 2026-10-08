import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resend, brandFromAddress } from '@/lib/resend'
import { buildEmailHtml } from '@/lib/email-template'
import { brandLogoUrl, brandTables } from '@/lib/brands'
import { resolveBrandParam } from '@/lib/brand-api'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
) {
  try {
    const resolved = await resolveBrandParam(params)
    if ('error' in resolved) return resolved.error
    const { brand } = resolved
    const tables = brandTables(brand)

    const { broadcastId, testEmail } = await req.json()

    const { data: broadcast } = await supabaseAdmin
      .from(tables.broadcasts)
      .select('*')
      .eq('id', broadcastId)
      .single()

    if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const from = brandFromAddress(brand)

    const emailHtml = (email: string) =>
      buildEmailHtml({
        subject: broadcast.subject,
        preheader: broadcast.preheader || '',
        content: broadcast.content_html,
        brandName: brand.name,
        brandDomain: brand.domain,
        accentColor: brand.accentColor,
        logoUrl: brandLogoUrl(brand, appUrl || ''),
        unsubscribeUrl: `${appUrl}/api/unsubscribe?brand=${brand.slug}&email=${encodeURIComponent(email)}`,
      })

    if (testEmail) {
      await resend.emails.send({
        from,
        to: testEmail,
        subject: `[TEST] ${broadcast.subject}`,
        html: emailHtml(testEmail),
        tags: [{ name: 'brand', value: brand.slug }],
      })
      return NextResponse.json({ message: 'Test email sent' })
    }

    const { data: subscribers } = await supabaseAdmin
      .from(tables.subscribers)
      .select('email, first_name')
      .eq('status', 'active')

    if (!subscribers?.length) {
      return NextResponse.json({ error: 'No active subscribers' }, { status: 400 })
    }

    const batchSize = 100
    let sent = 0

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      await Promise.all(
        batch.map(sub =>
          resend.emails.send({
            from,
            to: sub.email,
            subject: broadcast.subject,
            html: emailHtml(sub.email),
            tags: [{ name: 'brand', value: brand.slug }],
          })
        )
      )
      sent += batch.length
    }

    await supabaseAdmin
      .from(tables.broadcasts)
      .update({ status: 'sent', sent_at: new Date().toISOString(), recipient_count: sent })
      .eq('id', broadcastId)

    return NextResponse.json({ message: `Sent to ${sent} subscribers` })
  } catch (err) {
    console.error('Send error:', err)
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
