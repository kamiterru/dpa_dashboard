'use client'

import { useState } from 'react'
import { updateUserRole } from '@/app/actions/users'

const ROLES = [
  { value: 'pending', label: 'Pending' },
  { value: 'read_only', label: 'Read only' },
  { value: 'authorised', label: 'Authorised' },
  { value: 'admin', label: 'Admin' },
  { value: 'archived', label: 'Archived' },
]

const ROLE_STYLES: Record<string, string> = {
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
  read_only: 'text-slate-700 bg-slate-50 border-slate-200',
  authorised: 'text-blue-700 bg-blue-50 border-blue-200',
  admin: 'text-purple-700 bg-purple-50 border-purple-200',
  archived: 'text-red-700 bg-red-50 border-red-200',
}

interface Props {
  userId: string
  currentRole: string
  selfAuthId: string
  userAuthId: string | null
}

export function UserRoleSelect({ userId, currentRole, selfAuthId, userAuthId }: Props) {
  const [role, setRole] = useState(currentRole)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSelf = selfAuthId === userAuthId

  async function handleChange(newRole: string) {
    setSaving(true)
    setError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateUserRole(userId, newRole as any)
    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      setRole(newRole)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={e => handleChange(e.target.value)}
        disabled={saving || isSelf}
        className={`rounded-lg border px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${ROLE_STYLES[role] ?? 'text-slate-700 bg-white border-slate-200'}`}
      >
        {ROLES.map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      {saving && <span className="text-xs text-slate-400">Saving…</span>}
      {isSelf && <span className="text-xs text-slate-400">(you)</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
