import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { UserRoleSelect } from './UserRoleSelect'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: self } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user!.id)
    .single()

  if (self?.role !== 'admin') notFound()

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">User management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage user roles and access levels. New sign-ups appear as Pending.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {!users?.length && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                  No users found
                </td>
              </tr>
            )}
            {users?.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })
                    : '—'}
                </td>
                <td className="px-6 py-4">
                  <UserRoleSelect userId={u.id} currentRole={u.role} selfAuthId={user!.id} userAuthId={u.auth_id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
