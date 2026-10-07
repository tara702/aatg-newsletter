'use client'

import { use, useEffect, useState } from 'react'
import { getBrand } from '@/lib/brands'

export default function SubscribersPage({
  params,
}: {
  params: Promise<{ brand: string }>
}) {
  const { brand: slug } = use(params)
  const brand = getBrand(slug)
  const [data, setData] = useState<any>(null)
  const [status, setStatus] = useState('active')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch(`/api/${slug}/subscribers?status=${status}&page=${page}&limit=50`)
      .then(r => r.json())
      .then(setData)
  }, [slug, status, page])

  if (!brand) return null

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Subscribers</h1>
          <p className="text-sm text-gray-500 mt-1">
            {brand.name} — {data?.total?.toLocaleString() || 0} total
          </p>
        </div>
        <div className="flex gap-2">
          {['active', 'unsubscribed', 'bounced'].map(s => (
            <button
              key={s}
              onClick={() => {
                setStatus(s)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                status === s ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              style={status === s ? { backgroundColor: brand.accentColor } : undefined}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Email</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Name</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Source</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Campaign</th>
              <th className="text-center px-5 py-3 text-xs text-gray-500 font-medium">Engagement</th>
              <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {data?.subscribers?.map((sub: any) => (
              <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-800 font-medium">{sub.email}</td>
                <td className="px-5 py-3 text-gray-600">{sub.first_name || '—'}</td>
                <td className="px-5 py-3 text-gray-500 text-xs max-w-[160px] truncate" title={sub.source_url}>
                  {sub.source_url
                    ? sub.source_url
                        .replace(`https://www.${brand.domain}`, '')
                        .replace(`https://${brand.domain}`, '')
                    : '—'}
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{sub.utm_campaign || '—'}</td>
                <td className="px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-3 rounded-sm ${
                          i < (sub.engagement_score || 5) ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-right text-gray-400 text-xs">
                  {new Date(sub.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data?.total > 50 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, data.total)} of {data.total.toLocaleString()}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                disabled={page * 50 >= data.total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
