import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const wpUrl = process.env.WORDPRESS_API_URL
    const res = await fetch(`${wpUrl}/posts?per_page=10&status=publish&_fields=id,title,excerpt,link,featured_media,date&_embed`, {
      next: { revalidate: 300 }
    })

    if (!res.ok) throw new Error('WordPress API error')

    const posts = await res.json()

    const articles = posts.map((post: any) => ({
      id: post.id,
      title: post.title?.rendered?.replace(/<[^>]+>/g, '') || '',
      excerpt: post.excerpt?.rendered?.replace(/<[^>]+>/g, '').slice(0, 160) + '...' || '',
      url: post.link,
      imageUrl: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
      date: post.date,
    }))

    return NextResponse.json(articles)
  } catch (err) {
    console.error('WordPress fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}
