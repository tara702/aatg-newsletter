'use client'

import { use, useEffect, useState } from 'react'
import { defaultDigestSubject, getBrand } from '@/lib/brands'

interface Article {
  id: number
  title: string
  excerpt: string
  url: string
  imageUrl?: string | null
}

type Mode = 'digest' | 'ai'

export default function ComposePage({
  params,
}: {
  params: Promise<{ brand: string }>
}) {
  const { brand: slug } = use(params)
  const brand = getBrand(slug)

  const [mode, setMode] = useState<Mode>('digest')
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticles, setSelectedArticles] = useState<Article[]>([])
  const [loadingArticles, setLoadingArticles] = useState(true)
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [includeProducts, setIncludeProducts] = useState(false)
  const [aiHtml, setAiHtml] = useState('')
  const [generating, setGenerating] = useState(false)
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    if (!brand) return
    setSubject(defaultDigestSubject(brand))
  }, [brand])

  useEffect(() => {
    if (!brand) return
    let cancelled = false

    const loadArticles = async () => {
      setLoadingArticles(true)
      try {
        const res = await fetch(`/api/${brand.slug}/rss`)
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data)) {
          setArticles(data)
          setSelectedArticles(data)
        } else {
          setStatus(data.error || 'Failed to load articles')
        }
      } catch {
        if (!cancelled) setStatus('Failed to load articles from RSS feed')
      } finally {
        if (!cancelled) setLoadingArticles(false)
      }
    }

    loadArticles()
    return () => {
      cancelled = true
    }
  }, [brand])

  if (!brand) return null

  const toggleArticle = (article: Article) => {
    setSelectedArticles(prev =>
      prev.some(s => s.id === article.id)
        ? prev.filter(s => s.id !== article.id)
        : [...prev, article]
    )
  }

  const buildDigestHtml = () =>
    selectedArticles
      .map(
        a => `
          <div style="margin-bottom:32px">
            ${a.imageUrl ? `<img src="${a.imageUrl}" style="width:100%;max-height:200px;object-fit:cover;border-radius:6px;margin-bottom:12px" />` : ''}
            <h2 style="margin:0 0 8px;font-size:20px"><a href="${a.url}" style="color:#1a1a1a;text-decoration:none">${a.title}</a></h2>
            <p style="margin:0 0 12px;color:#555">${a.excerpt}</p>
            <a href="${a.url}" style="background:${brand.accentColor};color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px">Read More →</a>
          </div>`
      )
      .join('<hr style="border:none;border-top:1px solid #e8e8e4;margin:0 0 32px" />')

  const formatError = (payload: any) => {
    if (!payload) return 'Unknown error'
    if (typeof payload === 'string') return payload
    if (payload.message) return payload.message
    if (payload.error) return formatError(payload.error)
    try {
      return JSON.stringify(payload)
    } catch {
      return 'Unknown error'
    }
  }

  const generateAi = async () => {
    if (!aiTopic.trim()) return setStatus('Enter a topic for AI compose')
    setGenerating(true)
    setStatus('')
    try {
      const res = await fetch(`/api/${brand.slug}/ai-compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, includeProducts }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(formatError(data))
      setSubject(data.subject || subject)
      setPreheader(data.preheader || '')
      setAiHtml(data.contentHtml || '')
      setSelectedArticles(data.selectedArticles || [])
      setAiEnabled(!!data.aiEnabled)
      setStatus(
        data.aiEnabled
          ? 'AI draft ready — review and send'
          : 'Draft ready (template mode — add OPENAI_API_KEY for full AI)'
      )
    } catch (err: any) {
      setStatus(err?.message || 'AI compose failed')
    } finally {
      setGenerating(false)
    }
  }

  const saveDraft = async () => {
    const contentHtml = mode === 'ai' ? aiHtml : buildDigestHtml()
    if (!contentHtml) throw new Error('Nothing to send yet')

    const res = await fetch(`/api/${brand.slug}/broadcasts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        preheader,
        contentHtml,
        contentType: mode === 'ai' ? 'custom' : 'digest',
      }),
    })
    const data = await res.json()
    if (!res.ok || !data?.id) {
      throw new Error(formatError(data) || 'Failed to save broadcast draft')
    }
    return data
  }

  const sendTest = async () => {
    if (!testEmail || !subject) return setStatus('Subject and test email required')
    if (mode === 'digest' && selectedArticles.length === 0) return setStatus('Select at least one article')
    if (mode === 'ai' && !aiHtml) return setStatus('Generate an AI draft first')
    setSending(true)
    try {
      const draft = await saveDraft()
      const res = await fetch(`/api/${brand.slug}/broadcasts/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcastId: draft.id, testEmail }),
      })
      const data = await res.json()
      setStatus(data.message || formatError(data))
    } catch (err: any) {
      setStatus(err?.message || 'Failed to send test email')
    } finally {
      setSending(false)
    }
  }

  const sendAll = async () => {
    if (!subject) return setStatus('Subject required')
    if (mode === 'digest' && selectedArticles.length === 0) return setStatus('Select at least one article')
    if (mode === 'ai' && !aiHtml) return setStatus('Generate an AI draft first')
    if (!confirm(`Send to all active ${brand.name} subscribers?`)) return
    setSending(true)
    try {
      const draft = await saveDraft()
      const res = await fetch(`/api/${brand.slug}/broadcasts/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcastId: draft.id }),
      })
      const data = await res.json()
      setStatus(data.message || formatError(data))
    } catch (err: any) {
      setStatus(err?.message || 'Failed to send broadcast')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: brand.accentColor }}>
          {brand.name}
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">{brand.digestName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Build a digest from{' '}
          <a href={brand.siteUrl} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: brand.accentColor }}>
            {brand.domain}
          </a>
          , or ask AI to draft a custom newsletter around a topic.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-2 flex gap-2">
            <button
              onClick={() => setMode('digest')}
              className={`flex-1 py-2 rounded text-sm font-medium ${mode === 'digest' ? 'text-white' : 'bg-gray-50 text-gray-600'}`}
              style={mode === 'digest' ? { backgroundColor: brand.accentColor } : undefined}
            >
              RSS digest
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`flex-1 py-2 rounded text-sm font-medium ${mode === 'ai' ? 'text-white' : 'bg-gray-50 text-gray-600'}`}
              style={mode === 'ai' ? { backgroundColor: brand.accentColor } : undefined}
            >
              AI custom email
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Subject line *</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Preheader</label>
              <input
                value={preheader}
                onChange={e => setPreheader(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
            </div>
          </div>

          {mode === 'ai' ? (
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Topic</label>
                <input
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  placeholder="e.g. How to prepare your garden for winter"
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={includeProducts} onChange={e => setIncludeProducts(e.target.checked)} />
                Suggest related products
              </label>
              <button
                onClick={generateAi}
                disabled={generating}
                className="px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50"
                style={{ backgroundColor: brand.accentColor }}
              >
                {generating ? 'Generating…' : 'Generate draft'}
              </button>
              {aiEnabled === false && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">
                  OPENAI_API_KEY is not set on Vercel — using a template draft with RSS matches. Add the key for full AI copy.
                </p>
              )}
              {aiHtml && (
                <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 max-h-96 overflow-auto text-sm" dangerouslySetInnerHTML={{ __html: aiHtml }} />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-gray-600">
                  Latest articles from RSS (deselect any to exclude)
                </label>
                {!loadingArticles && articles.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedArticles(selectedArticles.length === articles.length ? [] : articles)
                    }
                    className="text-xs font-medium hover:underline"
                    style={{ color: brand.accentColor }}
                  >
                    {selectedArticles.length === articles.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {loadingArticles ? (
                <p className="text-sm text-gray-400">Loading articles from {brand.name}...</p>
              ) : (
                <div className="space-y-2">
                  {articles.map(a => {
                    const selected = selectedArticles.some(s => s.id === a.id)
                    return (
                      <div
                        key={a.id}
                        onClick={() => toggleArticle(a)}
                        className={`p-3 rounded border cursor-pointer transition-colors ${
                          selected ? 'border-green-500' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={selected ? { backgroundColor: brand.softColor } : undefined}
                      >
                        <div className="flex items-start gap-3">
                          {a.imageUrl && (
                            <img src={a.imageUrl} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800">{a.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{a.excerpt}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Send</h2>
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 block mb-1">Test email</label>
              <input
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={sendTest}
              disabled={sending}
              className="w-full py-2 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 mb-3 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send test email'}
            </button>
            <button
              onClick={sendAll}
              disabled={sending}
              className="w-full py-2.5 text-white rounded text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: brand.accentColor }}
            >
              {sending ? 'Sending...' : 'Send to all subscribers'}
            </button>
            {status && (
              <div
                className={`mt-3 p-3 rounded text-xs ${
                  status.toLowerCase().includes('error') || status.toLowerCase().includes('fail')
                    ? 'bg-red-50 text-red-700'
                    : 'bg-green-50 text-green-700'
                }`}
              >
                {status}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
