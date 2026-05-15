import { Suspense } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role = 'read_only'
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()
    if (profile?.role) role = profile.role
  }

  return (
    <div className="flex h-full">
      <Suspense>
        <Sidebar userRole={role} />
      </Suspense>
      <main className="flex-1 overflow-auto bg-slate-50">
        {children}
      </main>
    </div>
  )
}
