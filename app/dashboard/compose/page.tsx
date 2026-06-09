'use client'

import { useState } from 'react'

interface Article {
  id: number; title: string; excerpt: string; url: string; imageUrl?: string
}

export default function ComposePage() {
  const [mode, setMode] = useState<'custom' | 'digest'>('custom')
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [content, setContent] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticles, setSelectedArticles] = useState<Article[]>([])
  const [loadingArticles, setLoadingArticles] = useState(false)
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)

  const loadArticles = async () => {
    setLoadingArticles(true)
    const res = await fetch('/api/wordpress')
    const data = await res.json()
    setArticles(data)
    setLoadingArticles(false)
  }

  const saveDraft = async () => {
    const finalContent = mode === 'digest'
      ? selectedArticles.map(a => `
          <div style="margin-bottom:32px">
            ${a.imageUrl ? `<img src="${a.imageUrl}" style="width:100%;max-height:200px;object-fit:cover;border-radius:6px;margin-bottom:12px" />` : ''}
            <h2 style="margin:0 0 8px;font-size:20px"><a href="${a.url}" style="color:#1a1a1a;text-decoration:none">${a.title}</a></h2>
            <p style="margin:0 0 12px;color:#555">${a.excerpt}</p>
            <a href="${a.url}" style="background:#2d5a27;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:13px">Read More →</a>
          </div>`).join('<hr style="border:none;border-top:1px solid #e8e8e4;margin:0 0 32px" />')
      : content

    const res = await fetch('/api/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, preheader, contentHtml: finalContent, contentType: mode }),
    })
    return await res.json()
  }

  const sendTest = async () => {
    if (!testEmail || !subject) return setStatus('Subject and test email required')
    setSending(true)
    const draft = await saveDraft()
    const res = await fetch('/api/broadcasts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcastId: draft.id, testEmail }),
    })
    const data = await res.json()
    setStatus(data.message || data.error)
    setSending(false)
  }

  const sendAll = async () => {
    if (!subject || (!content && selectedArticles.length === 0)) return setStatus('Subject and content required')
    if (!confirm('Send to all active subscribers?')) return
    setSending(true)
    const draft = await saveDraft()
    const res = await fetch('/api/broadcasts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broadcastId: draft.id }),
    })
    const data = await res.json()
    setStatus(data.message || data.error)
    setSending(false)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Compose Newsletter</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Editor */}
        <div className="col-span-2 space-y-4">
          {/* Mode Toggle */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-3">
            <button onClick={() => setMode('custom')}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${mode === 'custom' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              ✏️ Write custom email
            </button>
            <button onClick={() => { setMode('digest'); loadArticles() }}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${mode === 'digest' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              📰 Article digest
            </button>
          </div>

          {/* Subject + Preheader */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Subject line *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="e.g. The dog breeds vets secretly love 🐾"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Preheader (preview text)</label>
              <input value={preheader} onChange={e => setPreheader(e.target.value)}
                placeholder="Short text shown in inbox preview..."
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600" />
            </div>
          </div>

          {/* Content */}
          {mode === 'custom' ? (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <label className="text-xs font-medium text-gray-600 block mb-2">Email content (HTML supported)</label>
              <textarea value={content} onChange={e => setContent(e.target.value)}
                rows={16} placeholder="Write your email content here. You can use basic HTML tags like <h2>, <p>, <strong>, <a>..."
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-green-600 resize-none" />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <label className="text-xs font-medium text-gray-600 block mb-3">Select articles to include</label>
              {loadingArticles ? (
                <p className="text-sm text-gray-400">Loading articles from AATG...</p>
              ) : (
                <div className="space-y-2">
                  {articles.map(a => {
                    const selected = selectedArticles.some(s => s.id === a.id)
                    return (
                      <div key={a.id}
                        onClick={() => setSelectedArticles(prev =>
                          selected ? prev.filter(s => s.id !== a.id) : [...prev, a]
                        )}
                        className={`p-3 rounded border cursor-pointer transition-colors ${selected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-start gap-3">
                          {a.imageUrl && <img src={a.imageUrl} className="w-12 h-12 object-cover rounded flex-shrink-0" />}
                          <div>
                            <p className="text-sm font-medium text-gray-800">{a.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{a.excerpt}</p>
                          </div>
                          <div className={`ml-auto w-4 h-4 rounded-full border flex-shrink-0 mt-0.5 ${selected ? 'bg-green-600 border-green-600' : 'border-gray-300'}`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {selectedArticles.length > 0 && (
                <p className="text-xs text-green-700 mt-3 font-medium">{selectedArticles.length} article{selectedArticles.length > 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}
        </div>

        {/* Send Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Send</h2>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 block mb-1">Test email</label>
              <input value={testEmail} onChange={e => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600" />
            </div>

            <button onClick={sendTest} disabled={sending}
              className="w-full py-2 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 mb-3 disabled:opacity-50 transition-colors">
              {sending ? 'Sending...' : '📩 Send test email'}
            </button>

            <button onClick={sendAll} disabled={sending}
              className="w-full py-2.5 bg-green-700 text-white rounded text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
              {sending ? 'Sending...' : '🚀 Send to all subscribers'}
            </button>

            {status && (
              <div className={`mt-3 p-3 rounded text-xs ${status.includes('error') || status.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {status}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-600 mb-2">Checklist</h3>
              {[
                { label: 'Subject line', done: subject.length > 0 },
                { label: 'Content', done: mode === 'custom' ? content.length > 0 : selectedArticles.length > 0 },
                { label: 'Test sent', done: false },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2 mb-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-xs ${done ? 'bg-green-600' : 'bg-gray-200'}`}>
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
