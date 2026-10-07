import { NextResponse } from 'next/server'

const FEED_URL = 'https://www.animalsaroundtheglobe.com/feed/'

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/&#38;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTag(block: string, tag: string): string {
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
  if (cdata?.[1]) return cdata[1].trim()
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return plain?.[1]?.trim() || ''
}

function extractImage(block: string): string | null {
  const media = block.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i)
  if (media?.[1]) return media[1]

  const enclosure = block.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*(?:type=["']image\/[^"']*["'])?[^>]*>/i)
  if (enclosure?.[1]) return enclosure[1]

  const img = block.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i)
  return img?.[1] || null
}

function parseRssItems(xml: string) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 10)

  return items.map((match, index) => {
    const block = match[1]
    const title = stripHtml(extractTag(block, 'title'))
    const url = extractTag(block, 'link') || extractTag(block, 'guid')
    const rawExcerpt = stripHtml(extractTag(block, 'description'))
      .replace(/\s*The post\s+.+$/i, '')
      .trim()
    const excerpt =
      rawExcerpt.length > 160 ? `${rawExcerpt.slice(0, 160).trim()}...` : rawExcerpt
    const date = extractTag(block, 'pubDate')
    const guid = extractTag(block, 'guid') || url || String(index + 1)

    return {
      id: index + 1,
      guid,
      title,
      excerpt,
      url,
      imageUrl: extractImage(block),
      date,
    }
  })
}

export async function GET() {
  try {
    const res = await fetch(FEED_URL, {
      next: { revalidate: 300 },
      headers: {
        'User-Agent': 'AnimalsAroundTheGlobe-Newsletter/1.0',
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
