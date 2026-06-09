'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/broadcasts')
      .then(r => r.json())
      .then(data => { setBroadcasts(data); setLoading(false) })
  }, [])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Broadcasts</h1>
          <p className="text-sm text-gray-500 mt-1">All sent and draft newsletters</p>
        </div>
        <Link href="/dashboard/compose"
          className="px-4 py-2 bg-green-700 text-white text-sm rounded font-medium hover:bg-green-800 transition-colors">
          + New broadcast
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading...</div>
        ) : broadcasts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 text-sm mb-3">No broadcasts yet</p>
            <Link href="/dashboard/compose" className="text-green-700 text-sm hover:underline">Create your first newsletter →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Subject</th>
                <th className="text-center px-5 py-3 text-xs text-gray-500 font-medium">Status</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Recipients</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Type</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map(b => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-800 font-medium">{b.subject}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      b.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">{b.recipient_count?.toLocaleString() || '—'}</td>
                  <td className="px-5 py-3 text-right text-gray-400 capitalize">{b.content_type}</td>
                  <td className="px-5 py-3 text-right text-gray-400">
                    {b.sent_at ? new Date(b.sent_at).toLocaleDateString() : new Date(b.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
