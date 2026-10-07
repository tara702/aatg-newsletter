'use client'

import { useEffect, useState } from 'react'

interface Article {
  id: number
  title: string
  excerpt: string
  url: string
  imageUrl?: string | null
}

function defaultSubject() {
  return `The Animal Digest — ${new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`
}

export default function ComposePage() {
  const [subject, setSubject] = useState(defaultSubject)
  const [preheader, setPreheader] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticles, setSelectedArticles] = useState<Article[]>([])
  const [loadingArticles, setLoadingArticles] = useState(true)
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadArticles = async () => {
      setLoadingArticles(true)
      try {
        const res = await fetch('/api/rss')
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
  }, [])

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
            <a href="${a.url}" style="background:#2d5a27;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px">Read More →</a>
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

  const saveDraft = async () => {
    const res = await fetch('/api/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        preheader,
        contentHtml: buildDigestHtml(),
        contentType: 'digest',
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
    if (selectedArticles.length === 0) return setStatus('Select at least one article')
    setSending(true)
    try {
      const draft = await saveDraft()
      const res = await fetch('/api/broadcasts/send', {
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
    if (!subject || selectedArticles.length === 0) return setStatus('Subject and at least one article required')
    if (!confirm('Send to all active subscribers?')) return
    setSending(true)
    try {
      const draft = await saveDraft()
      const res = await fetch('/api/broadcasts/send', {
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
        <h1 className="text-2xl font-semibold text-gray-900">The Animal Digest</h1>
        <p className="text-sm text-gray-500 mt-1">
          Build a digest from the latest posts on{' '}
          <a
            href="https://www.animalsaroundtheglobe.com/"
            target="_blank"
            rel="noreferrer"
            className="text-green-700 hover:underline"
          >
            animalsaroundtheglobe.com
          </a>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Subject line *</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="The Animal Digest — October 7, 2026"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Preheader (preview text)</label>
              <input
                value={preheader}
                onChange={e => setPreheader(e.target.value)}
                placeholder="This week's best animal stories..."
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-gray-600">
                Latest articles from RSS (deselect any to exclude)
              </label>
              {!loadingArticles && articles.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedArticles(
                      selectedArticles.length === articles.length ? [] : articles
                    )
                  }
                  className="text-xs text-green-700 font-medium hover:underline"
                >
                  {selectedArticles.length === articles.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            {loadingArticles ? (
              <p className="text-sm text-gray-400">Loading articles from Animals Around The Globe...</p>
            ) : articles.length === 0 ? (
              <p className="text-sm text-gray-400">No articles found in the RSS feed.</p>
            ) : (
              <div className="space-y-2">
                {articles.map(a => {
                  const selected = selectedArticles.some(s => s.id === a.id)
                  return (
                    <div
                      key={a.id}
                      onClick={() => toggleArticle(a)}
                      className={`p-3 rounded border cursor-pointer transition-colors ${
                        selected
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {a.imageUrl && (
                          <img
                            src={a.imageUrl}
                            alt=""
                            className="w-12 h-12 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">{a.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{a.excerpt}</p>
                        </div>
                        <div
                          className={`ml-auto w-4 h-4 rounded-full border flex-shrink-0 mt-0.5 ${
                            selected ? 'bg-green-600 border-green-600' : 'border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {selectedArticles.length > 0 && (
              <p className="text-xs text-green-700 mt-3 font-medium">
                {selectedArticles.length} article{selectedArticles.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
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
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>

            <button
              onClick={sendTest}
              disabled={sending}
              className="w-full py-2 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 mb-3 disabled:opacity-50 transition-colors"
            >
              {sending ? 'Sending...' : '📩 Send test email'}
            </button>

            <button
              onClick={sendAll}
              disabled={sending}
              className="w-full py-2.5 bg-green-700 text-white rounded text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
            >
              {sending ? 'Sending...' : '🚀 Send to all subscribers'}
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

            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-600 mb-2">Checklist</h3>
              {[
                { label: 'Subject line', done: subject.length > 0 },
                { label: 'Articles selected', done: selectedArticles.length > 0 },
                { label: 'Test sent', done: false },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-xs ${
                      done ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    {done && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className={`text-xs ${done ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
