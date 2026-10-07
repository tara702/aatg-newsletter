import { NextResponse } from 'next/server'
import { resolveBrandParam } from '@/lib/brand-api'
import { parseRssItems } from '@/lib/rss'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ brand: string }> }
) {
  const resolved = await resolveBrandParam(params)
  if ('error' in resolved) return resolved.error
  const { brand } = resolved

  try {
    const res = await fetch(brand.rssFeedUrl, {
      next: { revalidate: 300 },
      headers: {
        'User-Agent': `${brand.shortName}-Newsletter/1.0`,
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    })

    if (!res.ok) throw new Error(`RSS feed error: ${res.status}`)

    const xml = await res.text()
    const articles = parseRssItems(xml)

    return NextResponse.json(articles)
  } catch (err) {
    console.error('RSS fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}
