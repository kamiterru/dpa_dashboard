'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'All Records', href: '/records', filter: null },
  { label: 'Live Records', href: '/records?filter=live', filter: 'live' },
  { label: 'For Review', href: '/records?filter=review', filter: 'review' },
  { label: 'Requested', href: '/records?filter=requested', filter: 'requested' },
]

export function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentFilter = searchParams.get('filter')
  const router = useRouter()
  const isAdmin = userRole === 'admin'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(item: typeof NAV_ITEMS[0]) {
    if (item.filter === null) {
      return pathname === '/records' && !currentFilter
    }
    return pathname === '/records' && currentFilter === item.filter
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-slate-100">
      <div className="px-6 py-5 border-b border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">DPA Dashboard</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Records
        </p>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive(item)
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Admin
            </p>
            <Link
              href="/admin/users"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith('/admin/users')
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              User management
            </Link>
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-left"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
