import { supabaseAdmin } from '@/lib/supabase'
import { resend, brandFromAddress } from '@/lib/resend'
import { buildEmailHtml } from '@/lib/email-template'
import {
  brandLogoUrl,
  brandTables,
  defaultDigestSubject,
  type Brand,
} from '@/lib/brands'
import { parseRssItems } from '@/lib/rss'

export function articlesToHtml(articles: { title: string; excerpt: string; url: string; imageUrl?: string | null }[], accentColor: string) {
  return articles
    .map(
      a => `
        <div style="margin-bottom:32px">
          ${a.imageUrl ? `<img src="${a.imageUrl}" style="width:100%;max-height:200px;object-fit:cover;border-radius:6px;margin-bottom:12px" />` : ''}
          <h2 style="margin:0 0 8px;font-size:20px"><a href="${a.url}" style="color:#1a1a1a;text-decoration:none">${a.title}</a></h2>
          <p style="margin:0 0 12px;color:#555">${a.excerpt}</p>
          <a href="${a.url}" style="background:${accentColor};color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px">Read More →</a>
        </div>`
    )
    .join('<hr style="border:none;border-top:1px solid #e8e8e4;margin:0 0 32px" />')
}

export async function fetchBrandArticles(brand: Brand, limit = 10) {
  const res = await fetch(brand.rssFeedUrl, {
    next: { revalidate: 0 },
    headers: {
      'User-Agent': `${brand.shortName}-Newsletter/1.0`,
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
  })
  if (!res.ok) throw new Error(`RSS feed error: ${res.status}`)
  const xml = await res.text()
  return parseRssItems(xml, limit)
}

export async function curateAndSendDigest(brand: Brand, opts?: { testEmail?: string; articleLimit?: number }) {
  const tables = brandTables(brand)
  const articles = await fetchBrandArticles(brand, opts?.articleLimit ?? 10)
  if (!articles.length) throw new Error('No articles in RSS feed')

  const subject = defaultDigestSubject(brand)
  const preheader = `This week's top stories from ${brand.name}`
  const contentHtml = articlesToHtml(articles, brand.accentColor)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  const { data: broadcast, error } = await supabaseAdmin
    .from(tables.broadcasts)
    .insert({
      subject,
      preheader,
      content_html: contentHtml,
      content_type: 'digest',
      status: 'draft',
    })
    .select()
    .single()

  if (error || !broadcast) throw new Error(error?.message || 'Failed to create broadcast')

  const htmlFor = (email: string) =>
    buildEmailHtml({
      subject,
      preheader,
      content: contentHtml,
      brandName: brand.name,
      brandDomain: brand.domain,
      accentColor: brand.accentColor,
      logoUrl: brandLogoUrl(brand, appUrl),
      unsubscribeUrl: `${appUrl}/api/unsubscribe?brand=${brand.slug}&email=${encodeURIComponent(email)}`,
    })

  const from = brandFromAddress(brand)

  if (opts?.testEmail) {
    await resend.emails.send({
      from,
      to: opts.testEmail,
      subject: `[TEST] ${subject}`,
      html: htmlFor(opts.testEmail),
      tags: [{ name: 'brand', value: brand.slug }],
    })
    return { broadcastId: broadcast.id, sent: 1, mode: 'test' as const, subject }
  }

  const { data: subscribers } = await supabaseAdmin
    .from(tables.subscribers)
    .select('email')
    .eq('status', 'active')

  if (!subscribers?.length) {
    return { broadcastId: broadcast.id, sent: 0, mode: 'skipped' as const, subject, reason: 'No active subscribers' }
  }

  const batchSize = 100
  let sent = 0
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize)
    await Promise.all(
      batch.map(sub =>
        resend.emails.send({
          from,
          to: sub.email,
          subject,
          html: htmlFor(sub.email),
          tags: [{ name: 'brand', value: brand.slug }],
        })
      )
    )
    sent += batch.length
  }

  await supabaseAdmin
    .from(tables.broadcasts)
    .update({ status: 'sent', sent_at: new Date().toISOString(), recipient_count: sent })
    .eq('id', broadcast.id)

  await supabaseAdmin
    .from('brand_schedules')
    .upsert(
      {
        brand_slug: brand.slug,
        last_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'brand_slug' }
    )

  return { broadcastId: broadcast.id, sent, mode: 'live' as const, subject }
}
