'use client'

import { use, useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getBrand } from '@/lib/brands'

interface Stats {
  subscribers: { total: number; active: number; unsubscribed: number; bounced: number }
  recentBroadcasts: any[]
  dailyGrowth: any[]
  topSources: { url: string; count: number }[]
}

export default function BrandOverviewPage({
  params,
}: {
  params: Promise<{ brand: string }>
}) {
  const { brand: slug } = use(params)
  const brand = getBrand(slug)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/${slug}/stats`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Failed to load stats')
        setStats(data)
        setError('')
      })
      .catch((err: Error) => {
        setStats(null)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [slug])

  if (!brand) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Overview</h1>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4 max-w-xl">
          <p className="font-medium mb-1">Couldn’t load brand data</p>
          <p className="text-xs mb-2">{error}</p>
          <p className="text-xs">
            Make sure you’ve run the multi-brand SQL in <code className="bg-amber-100 px-1 rounded">supabase-schema.sql</code> so tables like{' '}
            <code className="bg-amber-100 px-1 rounded">{brand.tablePrefix}_subscribers</code> exist.
          </p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">{brand.name} Newsletter Analytics</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Subscribers', value: stats.subscribers.total.toLocaleString(), color: 'text-green-700' },
          { label: 'Active', value: stats.subscribers.active.toLocaleString(), color: 'text-blue-600' },
          { label: 'Unsubscribed', value: stats.subscribers.unsubscribed.toLocaleString(), color: 'text-orange-500' },
          { label: 'Bounced', value: stats.subscribers.bounced.toLocaleString(), color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Subscriber Growth (30 days)</h2>
          {stats.dailyGrowth?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.dailyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke={brand.accentColor} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No growth data yet — subscribers will appear here
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Sign-up Sources</h2>
          {stats.topSources?.length > 0 ? (
            <div className="space-y-2">
              {stats.topSources.map(({ url, count }) => (
                <div key={url} className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 truncate max-w-[160px]" title={url}>
                    {url.replace(`https://www.${brand.domain}`, '').replace(`https://${brand.domain}`, '')}
                  </p>
                  <span className="text-xs font-semibold text-gray-800 ml-2">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No source data yet</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Recent Broadcasts</h2>
          <a href={`/dashboard/${slug}/compose`} className="text-xs font-medium hover:underline" style={{ color: brand.accentColor }}>
            + New broadcast
          </a>
        </div>
        {stats.recentBroadcasts?.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Subject</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Sent to</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Open rate</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Click rate</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentBroadcasts.map(b => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-800 font-medium">{b.subject}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{b.recipient_count?.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-green-700 font-medium">{b.openRate}%</td>
                  <td className="px-5 py-3 text-right text-blue-600 font-medium">{b.clickRate}%</td>
                  <td className="px-5 py-3 text-right text-gray-400">{new Date(b.sent_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center text-gray-400 text-sm">
            No broadcasts sent yet.{' '}
            <a href={`/dashboard/${slug}/compose`} className="hover:underline" style={{ color: brand.accentColor }}>
              Create your first one →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
