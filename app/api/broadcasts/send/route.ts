import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resend, FROM_EMAIL, FROM_NAME } from '@/lib/resend'
import { buildEmailHtml } from '@/lib/email-template'

export async function POST(req: NextRequest) {
  try {
    const { broadcastId, testEmail } = await req.json()

    const { data: broadcast } = await supabaseAdmin
      .from('broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .single()

    if (!broadcast) return NextResponse.json({ error: 'Broadcast not found' }, { status: 404 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    // Test send
    if (testEmail) {
      await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: testEmail,
        subject: `[TEST] ${broadcast.subject}`,
        html: buildEmailHtml({
          subject: broadcast.subject,
          preheader: broadcast.preheader || '',
          content: broadcast.content_html,
          unsubscribeUrl: `${appUrl}/api/unsubscribe?email=${encodeURIComponent(testEmail)}`,
        }),
      })
      return NextResponse.json({ message: 'Test email sent' })
    }

    // Get all active subscribers
    const { data: subscribers } = await supabaseAdmin
      .from('subscribers')
      .select('email, first_name')
      .eq('status', 'active')

    if (!subscribers?.length) {
      return NextResponse.json({ error: 'No active subscribers' }, { status: 400 })
    }

    // Send in batches of 100
    const batchSize = 100
    let sent = 0

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      await Promise.all(
        batch.map(sub =>
          resend.emails.send({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: sub.email,
            subject: broadcast.subject,
            html: buildEmailHtml({
              subject: broadcast.subject,
              preheader: broadcast.preheader || '',
              content: broadcast.content_html,
              unsubscribeUrl: `${appUrl}/api/unsubscribe?email=${encodeURIComponent(sub.email)}`,
            }),
          })
        )
      )
      sent += batch.length
    }

    // Mark broadcast as sent
    await supabaseAdmin
      .from('broadcasts')
      .update({ status: 'sent', sent_at: new Date().toISOString(), recipient_count: sent })
      .eq('id', broadcastId)

    return NextResponse.json({ message: `Sent to ${sent} subscribers` })
  } catch (err) {
    console.error('Send error:', err)
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
