import Link from 'next/link'
import { BRANDS } from '@/lib/brands'

export default function BrandPickerPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Newsletter Hub</p>
            <p className="text-xs text-gray-400 mt-0.5">Choose a brand to manage</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Brands</h1>
        <p className="text-sm text-gray-500 mb-8">
          Each brand has its own dashboard, subscriber list, broadcasts, and RSS digest.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BRANDS.map(brand => (
            <Link
              key={brand.slug}
              href={`/dashboard/${brand.slug}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: brand.accentColor }}
                >
                  {brand.initial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{brand.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{brand.domain}</p>
                  <p className="text-xs text-gray-500 mt-3">{brand.digestName}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
