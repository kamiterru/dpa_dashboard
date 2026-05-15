import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_PATHS = ['/login', '/signup', '/forgot-password']
// These pages are always accessible — no dashboard access needed
const OPEN_PATHS = ['/login', '/signup', '/forgot-password', '/pending', '/archived', '/auth']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isAuthPath = AUTH_PATHS.some(p => pathname.startsWith(p))
  const isOpenPath = OPEN_PATHS.some(p => pathname.startsWith(p))

  // Unauthenticated: only allow open paths
  if (!user && !isOpenPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    // Logged-in users leaving auth pages go to records
    if (isAuthPath) {
      return NextResponse.redirect(new URL('/records', request.url))
    }

    // Check role for dashboard access
    if (!isOpenPath) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single()

      const role = profile?.role

      if (role === 'pending') {
        return NextResponse.redirect(new URL('/pending', request.url))
      }
      if (role === 'archived') {
        return NextResponse.redirect(new URL('/archived', request.url))
      }
    }

    // Prevent active users from accessing status pages
    if (pathname.startsWith('/pending') || pathname.startsWith('/archived')) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single()

      const role = profile?.role
      if (role && !['pending', 'archived'].includes(role)) {
        return NextResponse.redirect(new URL('/records', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
