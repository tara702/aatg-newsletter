import type { Brand } from '@/lib/brands'
import { fetchBrandArticles } from '@/lib/digest'

export interface AiComposeResult {
  subject: string
  preheader: string
  introHtml: string
  selectedArticles: {
    id: number
    title: string
    excerpt: string
    url: string
    imageUrl?: string | null
  }[]
  productIdeas: { name: string; blurb: string; searchQuery: string }[]
  contentHtml: string
}

function fallbackCompose(
  brand: Brand,
  topic: string,
  articles: Awaited<ReturnType<typeof fetchBrandArticles>>,
  includeProducts: boolean
): AiComposeResult {
  const selected = articles.slice(0, 5)
  const subject = `${topic} — from ${brand.name}`
  const preheader = `Ideas and stories on ${topic}`
  const introHtml = `<p>Looking at <strong>${topic}</strong>? Here are some of the latest stories from ${brand.name} that can help.</p>`
  const productIdeas = includeProducts
    ? [
        {
          name: `${topic} starter kit`,
          blurb: `A simple set of essentials related to ${topic}, curated for ${brand.name} readers.`,
          searchQuery: topic,
        },
      ]
    : []

  const productsHtml = productIdeas.length
    ? `<div style="margin:28px 0;padding:20px;border:1px solid #e8e8e4;border-radius:8px;background:#fafafa">
        <h3 style="margin:0 0 12px;font-size:16px;">Worth considering</h3>
        ${productIdeas
          .map(
            p => `<p style="margin:0 0 8px"><strong>${p.name}</strong><br/><span style="color:#555">${p.blurb}</span></p>`
          )
          .join('')}
      </div>`
    : ''

  const articlesHtml = selected
    .map(
      a => `
      <div style="margin-bottom:28px">
        ${a.imageUrl ? `<img src="${a.imageUrl}" style="width:100%;max-height:200px;object-fit:cover;border-radius:6px;margin-bottom:12px" />` : ''}
        <h2 style="margin:0 0 8px;font-size:20px"><a href="${a.url}" style="color:#1a1a1a;text-decoration:none">${a.title}</a></h2>
        <p style="margin:0 0 12px;color:#555">${a.excerpt}</p>
        <a href="${a.url}" style="background:${brand.accentColor};color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px">Read More →</a>
      </div>`
    )
    .join('<hr style="border:none;border-top:1px solid #e8e8e4;margin:0 0 28px" />')

  return {
    subject,
    preheader,
    introHtml,
    selectedArticles: selected,
    productIdeas,
    contentHtml: `${introHtml}${productsHtml}${articlesHtml}`,
  }
}

export async function generateAiCompose(
  brand: Brand,
  topic: string,
  opts?: { includeProducts?: boolean }
): Promise<AiComposeResult> {
  const includeProducts = !!opts?.includeProducts
  const articles = await fetchBrandArticles(brand, 10)
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return fallbackCompose(brand, topic, articles, includeProducts)
  }

  const catalog = articles.map(a => ({
    id: a.id,
    title: a.title,
    excerpt: a.excerpt,
    url: a.url,
  }))

  const prompt = `You are writing a branded newsletter email for ${brand.name} (${brand.domain}).
Topic: ${topic}
Pick 3-5 of the most relevant articles from this catalog (by id) and write:
- subject (compelling, under 70 chars)
- preheader
- introHtml (1-2 short HTML paragraphs, no scripts)
${includeProducts ? '- productIdeas: 1-3 tasteful product suggestions with name, blurb, searchQuery (affiliate-friendly, not hard sell)' : '- productIdeas: []'}
Return JSON only with keys: subject, preheader, introHtml, articleIds (number[]), productIdeas ({name, blurb, searchQuery}[]).

Catalog:
${JSON.stringify(catalog, null, 2)}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You create high-quality newsletter copy. Reply with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!res.ok) {
    console.error('OpenAI error', await res.text())
    return fallbackCompose(brand, topic, articles, includeProducts)
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '{}'
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return fallbackCompose(brand, topic, articles, includeProducts)
  }

  const ids: number[] = Array.isArray(parsed.articleIds) ? parsed.articleIds : []
  const selected = articles.filter(a => ids.includes(a.id))
  const finalSelected = selected.length ? selected : articles.slice(0, 4)
  const productIdeas = includeProducts && Array.isArray(parsed.productIdeas) ? parsed.productIdeas : []

  const productsHtml = productIdeas.length
    ? `<div style="margin:28px 0;padding:20px;border:1px solid #e8e8e4;border-radius:8px;background:#fafafa">
        <h3 style="margin:0 0 12px;font-size:16px;">Worth considering</h3>
        ${productIdeas
          .map(
            (p: any) =>
              `<p style="margin:0 0 8px"><strong>${p.name || 'Idea'}</strong><br/><span style="color:#555">${p.blurb || ''}</span></p>`
          )
          .join('')}
      </div>`
    : ''

  const articlesHtml = finalSelected
    .map(
      a => `
      <div style="margin-bottom:28px">
        ${a.imageUrl ? `<img src="${a.imageUrl}" style="width:100%;max-height:200px;object-fit:cover;border-radius:6px;margin-bottom:12px" />` : ''}
        <h2 style="margin:0 0 8px;font-size:20px"><a href="${a.url}" style="color:#1a1a1a;text-decoration:none">${a.title}</a></h2>
        <p style="margin:0 0 12px;color:#555">${a.excerpt}</p>
        <a href="${a.url}" style="background:${brand.accentColor};color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px">Read More →</a>
      </div>`
    )
    .join('<hr style="border:none;border-top:1px solid #e8e8e4;margin:0 0 28px" />')

  const introHtml = parsed.introHtml || `<p>Here's a look at <strong>${topic}</strong>.</p>`

  return {
    subject: parsed.subject || `${topic} — from ${brand.name}`,
    preheader: parsed.preheader || topic,
    introHtml,
    selectedArticles: finalSelected,
    productIdeas,
    contentHtml: `${introHtml}${productsHtml}${articlesHtml}`,
  }
}
