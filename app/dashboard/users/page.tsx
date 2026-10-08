'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BRANDS } from '@/lib/brands'

interface HubUser {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'editor'
  is_active: boolean
  brandSlugs: string[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<HubUser[]>([])
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'editor'>('editor')
  const [brandSlugs, setBrandSlugs] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = () =>
    fetch('/api/users')
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Failed to load users')
        setUsers(data.users || [])
        setError('')
      })
      .catch((e: Error) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const toggleBrand = (slug: string) => {
    setBrandSlugs(prev => (prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]))
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password, role, brandSlugs }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) return setError(data.error || 'Failed to create user')
    setEmail('')
    setName('')
    setPassword('')
    setRole('editor')
    setBrandSlugs([])
    load()
  }

  const removeUser = async (id: string) => {
    if (!confirm('Remove this user?')) return
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600">
              ← AMG Newsletter Hub
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 mt-1">Users & access</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}

        <form onSubmit={createUser} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Add user</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              required
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Temporary password"
              type="password"
              required
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value as 'admin' | 'editor')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="editor">Editor (selected brands)</option>
              <option value="admin">Admin (all brands)</option>
            </select>
          </div>

          {role === 'editor' && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Brand access</p>
              <div className="flex flex-wrap gap-2">
                {BRANDS.map(b => (
                  <button
                    key={b.slug}
                    type="button"
                    onClick={() => toggleBrand(b.slug)}
                    className={`text-xs px-3 py-1.5 rounded-full border ${
                      brandSlugs.includes(b.slug)
                        ? 'text-white border-transparent'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                    style={brandSlugs.includes(b.slug) ? { backgroundColor: b.accentColor } : undefined}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            disabled={saving}
            className="px-4 py-2 bg-emerald-800 text-white text-sm rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add user'}
          </button>
        </form>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">User</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Role</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Brands</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name || u.email}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{u.role}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {u.role === 'admin' ? 'All brands' : u.brandSlugs.join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeUser(u.id)} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No hub users yet. You can still sign in with the master dashboard password.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
