'use client'

import Image from 'next/image'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useNavGuard } from '@/components/NavigationGuardProvider'

const NAV_ITEMS = [
  { label: 'All Records', href: '/records', filter: null },
  { label: 'Live Records', href: '/records?filter=live', filter: 'live' },
  { label: 'For Review', href: '/records?filter=review', filter: 'review' },
  { label: 'Requested', href: '/records?filter=requested', filter: 'requested' },
]

// Guard-aware navigation link — checks for unsaved changes before navigating
function NavLink({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className: string
}) {
  const { requestNavigation } = useNavGuard()
  const router = useRouter()

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    requestNavigation(() => router.push(href))
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}

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

  function isActive(item: (typeof NAV_ITEMS)[0]) {
    if (item.filter === null) return pathname === '/records' && !currentFilter
    return pathname === '/records' && currentFilter === item.filter
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-[#0f172a] text-slate-100 flex-shrink-0">

      {/* Logo / brand */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Image src="/logo-mark.svg" alt="Logo" width={28} height={25} className="flex-shrink-0" />
          <p className="font-poppins text-base font-semibold text-slate-400 tracking-wide">
            DPA Dashboard
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 py-1 font-poppins text-xs font-semibold uppercase tracking-widest text-[#64748b]">
          Records
        </p>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.label}
            href={item.href}
            className={`flex items-center rounded-lg px-3 py-2 font-poppins text-sm font-medium transition-colors ${
              isActive(item)
                ? 'bg-[#334155] text-white'
                : 'text-[#cbd5e1] hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Admin
            </p>
            <NavLink
              href="/admin/users"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith('/admin/users')
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              User management
            </NavLink>
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleSignOut}
          className="w-full rounded-lg px-3 py-2 font-poppins text-sm font-semibold text-[#0f172a] bg-[#b2f9fb] hover:bg-[#9ff0f2] transition-colors text-center"
        >
          Sign Out
        </button>
      </div>
    </aside>
  )
}
