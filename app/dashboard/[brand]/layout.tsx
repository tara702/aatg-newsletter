import Link from 'next/link'
import Image from 'next/image'
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
    <div className="min-h-screen flex" style={{ background: `linear-gradient(180deg, ${brand.softColor} 0%, #f8fafc 220px)` }}>
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-200" style={{ backgroundColor: brand.softColor }}>
          <Link href="/dashboard" className="text-[10px] uppercase tracking-wide text-gray-500 hover:text-gray-700">
            ← AMG Newsletter Hub
          </Link>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-9 h-9 rounded-full bg-white border border-gray-100 overflow-hidden shadow-sm flex-shrink-0">
              <Image src={brand.logoPath} alt={brand.name} width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 leading-none truncate">{brand.name}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">{brand.domain}</p>
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
          <div className="space-y-0.5 max-h-48 overflow-auto">
            {BRANDS.map(b => (
              <Link
                key={b.slug}
                href={`/dashboard/${b.slug}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs truncate ${
                  b.slug === brand.slug
                    ? 'font-medium text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
                style={b.slug === brand.slug ? { backgroundColor: b.softColor } : undefined}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: b.accentColor }}
                />
                <span className="truncate">{b.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
