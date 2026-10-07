import { NextResponse } from 'next/server'
import { getBrand, type Brand } from '@/lib/brands'

export async function resolveBrandParam(
  params: Promise<{ brand: string }> | { brand: string }
): Promise<{ brand: Brand } | { error: NextResponse }> {
  const resolved = await Promise.resolve(params)
  const brand = getBrand(resolved.brand)
  if (!brand) {
    return { error: NextResponse.json({ error: 'Unknown brand' }, { status: 404 }) }
  }
  return { brand }
}
