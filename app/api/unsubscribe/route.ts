import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getBrand, brandTables, BRANDS } from '@/lib/brands'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  const brandSlug = req.nextUrl.searchParams.get('brand')
  if (!email) return new NextResponse('Missing email', { status: 400 })

  const brand = getBrand(brandSlug || 'animals-around-the-globe')

  if (brand) {
    const tables = brandTables(brand)
    await supabaseAdmin
      .from(tables.subscribers)
      .update({ status: 'unsubscribed' })
      .eq('email', email.toLowerCase())
  } else {
    // Fallback: try all brand tables
    await Promise.all(
      BRANDS.map(b =>
        supabaseAdmin
          .from(brandTables(b).subscribers)
          .update({ status: 'unsubscribed' })
          .eq('email', email.toLowerCase())
      )
    )
  }

  const name = brand?.name || 'our newsletter'

  return new NextResponse(
    `<html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2>You've been unsubscribed</h2>
      <p>You won't receive any more emails from ${name}.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
