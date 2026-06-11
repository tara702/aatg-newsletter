import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resend, FROM_EMAIL, FROM_NAME } from '@/lib/resend'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, firstName, sourceUrl, utmCampaign, utmContent } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    // Check if already subscribed
    const { data: existing } = await supabaseAdmin
      .from('subscribers')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ message: 'Already subscribed' }, { status: 200 })
      }
      // Resubscribe
      await supabaseAdmin
        .from('subscribers')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      // New subscriber
      const { error } = await supabaseAdmin.from('subscribers').insert({
        email: email.toLowerCase(),
        first_name: firstName || null,
        source_url: sourceUrl || null,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
        status: 'active',
      })
      if (error) throw error
    }

    // Send welcome email via Resend
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: 'Welcome to Doggo Digest 🐾',
      html: `
        <p>Hi ${firstName || 'there'},</p>
        <p>Welcome! You're now subscribed to the Doggo Digest newsletter.</p>
        <p>We'll send you the best dog stories, care tips, and heartfelt moments every week.</p>
        <p>Talk soon,<br/>The Doggo Digest Team</p>
        <hr/>
        <p style="font-size:12px;color:#888;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a>
        </p>
      `,
    })

    return NextResponse.json({ message: 'Subscribed successfully' }, { status: 201, headers: corsHeaders })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}
