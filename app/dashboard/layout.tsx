import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-600 rounded-full flex items-center justify-center text-white text-xs font-bold">D</div>
            <div>
              <p className="text-xs font-semibold text-gray-900 leading-none">Doggo Digest Newsletter</p>
              <p className="text-xs text-gray-400 mt-0.5">doggodigest.com</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3">
          {[
            { href: '/dashboard', label: 'Overview', icon: '📊' },
            { href: '/dashboard/compose', label: 'Compose', icon: '✏️' },
            { href: '/dashboard/broadcasts', label: 'Broadcasts', icon: '📨' },
            { href: '/dashboard/subscribers', label: 'Subscribers', icon: '👥' },
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
          <p className="text-xs text-gray-400 px-3">Doggo Digest</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
