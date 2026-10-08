import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resend, brandFromAddress } from '@/lib/resend'
import { getBrand, brandTables } from '@/lib/brands'

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
    const { email, firstName, sourceUrl, utmCampaign, utmContent, brand: brandSlug } = body

    // Default to AATG for legacy embed forms that don't send brand yet
    const brand = getBrand(brandSlug || 'animals-around-the-globe')
    if (!brand) {
      return NextResponse.json({ error: 'Unknown brand' }, { status: 400, headers: corsHeaders })
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400, headers: corsHeaders })
    }

    const tables = brandTables(brand)

    const { data: existing } = await supabaseAdmin
      .from(tables.subscribers)
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ message: 'Already subscribed' }, { status: 200, headers: corsHeaders })
      }
      await supabaseAdmin
        .from(tables.subscribers)
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      const { error } = await supabaseAdmin.from(tables.subscribers).insert({
        email: email.toLowerCase(),
        first_name: firstName || null,
        source_url: sourceUrl || null,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
        status: 'active',
      })
      if (error) throw error
    }

    await resend.emails.send({
      from: brandFromAddress(brand),
      to: email,
      subject: `Welcome to ${brand.name}`,
      html: `
        <p>Hi ${firstName || 'there'},</p>
        <p>Welcome! You're now subscribed to the ${brand.name} newsletter.</p>
        <p>${brand.welcomeBlurb}</p>
        <p>Talk soon,<br/>The ${brand.name} Team</p>
        <hr/>
        <p style="font-size:12px;color:#888;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?brand=${brand.slug}&email=${encodeURIComponent(email)}">Unsubscribe</a>
        </p>
      `,
      tags: [{ name: 'brand', value: brand.slug }],
    })

    return NextResponse.json({ message: 'Subscribed successfully' }, { status: 201, headers: corsHeaders })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}
