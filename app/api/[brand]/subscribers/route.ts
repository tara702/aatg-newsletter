import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { brandTables } from '@/lib/brands'
import { resolveBrandParam } from '@/lib/brand-api'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
) {
  const resolved = await resolveBrandParam(params)
  if ('error' in resolved) return resolved.error
  const tables = brandTables(resolved.brand)

  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const status = searchParams.get('status') || 'active'
  const from = (page - 1) * limit

  const { data, error, count } = await supabaseAdmin
    .from(tables.subscribers)
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscribers: data, total: count, page, limit })
}
