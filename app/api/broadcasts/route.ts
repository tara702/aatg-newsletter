import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resend, FROM_EMAIL, FROM_NAME } from '@/lib/resend'
import { buildEmailHtml } from '@/lib/email-template'

// GET all broadcasts
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

// POST create draft broadcast
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { subject, preheader, contentHtml, contentType } = body

  const { data, error } = await supabaseAdmin
    .from('broadcasts')
    .insert({ subject, preheader, content_html: contentHtml, content_type: contentType || 'custom', status: 'draft' })
    .select()
    .single()

  if (error) {
    console.error('Create broadcast error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create broadcast', details: error },
      { status: 500 }
    )
  }
  return NextResponse.json(data, { status: 201 })
}
