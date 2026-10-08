'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Schedule {
  brandSlug: string
  brandName: string
  enabled: boolean
  dayOfWeek: number
  hourUtc: number
  lastSentAt: string | null
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const load = () =>
    fetch('/api/schedules')
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Failed to load')
        setSchedules(data.schedules || [])
      })
      .catch((e: Error) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const save = async (schedule: Schedule) => {
    setStatus('Saving...')
    const res = await fetch('/api/schedules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule),
    })
    const data = await res.json()
    if (!res.ok) {
      setStatus('')
      setError(data.error || 'Save failed')
      return
    }
    setStatus('Saved')
    setError('')
    load()
  }

  const update = (brandSlug: string, patch: Partial<Schedule>) => {
    setSchedules(prev => prev.map(s => (s.brandSlug === brandSlug ? { ...s, ...patch } : s)))
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600">
            ← AMG Newsletter Hub
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">Automated digests</h1>
          <p className="text-sm text-gray-500 mt-1">
            When enabled, the hub curates the latest RSS articles and sends that brand’s digest on the selected weekday
            around 14:00 UTC (Vercel Hobby allows one daily cron).
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}
        {status && <p className="text-xs text-emerald-700">{status}</p>}

        {schedules.map(s => (
          <div key={s.brandSlug} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{s.brandName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Last sent: {s.lastSentAt ? new Date(s.lastSentAt).toLocaleString() : 'Never'}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={e => update(s.brandSlug, { enabled: e.target.checked })}
                />
                Enabled
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Day (UTC)</label>
                <select
                  value={s.dayOfWeek}
                  onChange={e => update(s.brandSlug, { dayOfWeek: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Hour (UTC)</label>
                <select
                  value={s.hourUtc}
                  onChange={e => update(s.brandSlug, { hourUtc: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => save(s)}
              className="px-3 py-1.5 bg-emerald-800 text-white text-xs rounded-lg"
            >
              Save schedule
            </button>
          </div>
        ))}
      </main>
    </div>
  )
}
