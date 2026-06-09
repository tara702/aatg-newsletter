import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return new NextResponse('Missing email', { status: 400 })

  await supabaseAdmin
    .from('subscribers')
    .update({ status: 'unsubscribed' })
    .eq('email', email.toLowerCase())

  return new NextResponse(
    `<html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2>You've been unsubscribed</h2>
      <p>You won't receive any more emails from Animals Around the Globe.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
