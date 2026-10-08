'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BRANDS, type BrandSlug } from '@/lib/brands'
import type { HubSession } from '@/lib/auth'

export default function BrandPickerPage() {
  const [user, setUser] = useState<HubSession | null>(null)

  useEffect(() => {
    fetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setUser(data?.user || null))
      .catch(() => setUser(null))
  }, [])

  const brands = useMemo(() => {
    if (!user) return BRANDS
    if (user.role === 'admin' || user.brandSlugs === '*') return BRANDS
    return BRANDS.filter(b => user.brandSlugs.includes(b.slug as BrandSlug))
  }, [user])

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-800 rounded-xl flex items-center justify-center text-white text-xs font-bold">
              AMG
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">AMG Newsletter Hub</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {user ? `Signed in as ${user.name}` : 'Choose a brand to manage'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'admin' && (
              <>
                <Link
                  href="/dashboard/schedules"
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Schedules
                </Link>
                <Link
                  href="/dashboard/users"
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Users
                </Link>
              </>
            )}
            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Brands</h1>
        <p className="text-sm text-gray-500 mb-8">
          Each brand has its own dashboard, subscriber list, broadcasts, RSS digest, and optional AI compose.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map(brand => (
            <Link
              key={brand.slug}
              href={`/dashboard/${brand.slug}`}
              className="group block rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all bg-white"
            >
              <div className="h-2" style={{ backgroundColor: brand.accentColor }} />
              <div className="p-5" style={{ background: `linear-gradient(180deg, ${brand.softColor} 0%, #ffffff 70%)` }}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-white border border-gray-100 overflow-hidden flex-shrink-0 shadow-sm">
                    <Image
                      src={brand.logoPath}
                      alt={brand.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:underline">{brand.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{brand.domain}</p>
                    <p className="text-xs mt-3 font-medium" style={{ color: brand.accentColor }}>
                      {brand.digestName}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {!brands.length && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4">
            You don’t have access to any brands yet. Ask an AMG admin to grant access.
          </p>
        )}
      </main>
    </div>
  )
}
