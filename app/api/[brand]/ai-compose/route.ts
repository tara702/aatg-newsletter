import { NextRequest, NextResponse } from 'next/server'
import { resolveBrandParam } from '@/lib/brand-api'
import { generateAiCompose } from '@/lib/ai-compose'
import { getSession, canAccessBrand } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolved = await resolveBrandParam(params)
  if ('error' in resolved) return resolved.error
  const { brand } = resolved

  if (!canAccessBrand(session, brand.slug)) {
    return NextResponse.json({ error: 'No access to this brand' }, { status: 403 })
  }

  const body = await req.json()
  const topic = String(body.topic || '').trim()
  if (!topic) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

  try {
    const result = await generateAiCompose(brand, topic, {
      includeProducts: !!body.includeProducts,
    })
    return NextResponse.json({
      ...result,
      aiEnabled: !!process.env.OPENAI_API_KEY,
    })
  } catch (err: any) {
    console.error('AI compose error', err)
    return NextResponse.json({ error: err?.message || 'AI compose failed' }, { status: 500 })
  }
}
