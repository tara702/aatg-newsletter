import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { brandTables } from '@/lib/brands'
import { resolveBrandParam } from '@/lib/brand-api'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ brand: string }> }
) {
  const resolved = await resolveBrandParam(params)
  if ('error' in resolved) return resolved.error
  const tables = brandTables(resolved.brand)

  const { data, error } = await supabaseAdmin
    .from(tables.broadcasts)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
) {
  const resolved = await resolveBrandParam(params)
  if ('error' in resolved) return resolved.error
  const tables = brandTables(resolved.brand)

  const body = await req.json()
  const { subject, preheader, contentHtml, contentType } = body

  const { data, error } = await supabaseAdmin
    .from(tables.broadcasts)
    .insert({
      subject,
      preheader,
      content_html: contentHtml,
      content_type: contentType || 'digest',
      status: 'draft',
    })
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
