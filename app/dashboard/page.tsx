'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Stats {
  subscribers: { total: number; active: number; unsubscribed: number; bounced: number }
  recentBroadcasts: any[]
  dailyGrowth: any[]
  topSources: { url: string; count: number }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  )

  if (!stats) return null

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Doggo Digest Newsletter Analytics</p>
      </div>

      {/* Stat Cards */}
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
        {/* Growth Chart */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Subscriber Growth (30 days)</h2>
          {stats.dailyGrowth?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.dailyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2d5a27" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No growth data yet — subscribers will appear here
            </div>
          )}
        </div>

        {/* Top Sources */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Sign-up Sources</h2>
          {stats.topSources?.length > 0 ? (
            <div className="space-y-2">
              {stats.topSources.map(({ url, count }) => (
                <div key={url} className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 truncate max-w-[160px]" title={url}>
                    {url.replace('https://doggodigest.com', '')}
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

      {/* Recent Broadcasts */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Recent Broadcasts</h2>
          <a href="/dashboard/compose" className="text-xs text-green-700 font-medium hover:underline">+ New broadcast</a>
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
            No broadcasts sent yet. <a href="/dashboard/compose" className="text-green-700 hover:underline">Create your first one →</a>
          </div>
        )}
      </div>
    </div>
  )
}
