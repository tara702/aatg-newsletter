import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBrand, BRANDS } from '@/lib/brands'

export default async function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ brand: string }>
}) {
  const { brand: slug } = await params
  const brand = getBrand(slug)
  if (!brand) notFound()

  const base = `/dashboard/${brand.slug}`

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <Link href="/dashboard" className="text-[10px] uppercase tracking-wide text-gray-400 hover:text-gray-600">
            ← All brands
          </Link>
          <div className="flex items-center gap-2 mt-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: brand.accentColor }}
            >
              {brand.initial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 leading-none truncate">{brand.name}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{brand.domain}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3">
          {[
            { href: base, label: 'Overview', icon: '📊' },
            { href: `${base}/compose`, label: 'Compose', icon: '✏️' },
            { href: `${base}/broadcasts`, label: 'Broadcasts', icon: '📨' },
            { href: `${base}/subscribers`, label: 'Subscribers', icon: '👥' },
          ].map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 mb-0.5 transition-colors"
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 px-3 mb-2">Switch brand</p>
          <div className="space-y-0.5 max-h-40 overflow-auto">
            {BRANDS.map(b => (
              <Link
                key={b.slug}
                href={`/dashboard/${b.slug}`}
                className={`block px-3 py-1.5 rounded text-xs truncate ${
                  b.slug === brand.slug
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                {b.name}
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
