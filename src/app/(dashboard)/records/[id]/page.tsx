import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppUser } from '@/lib/types'
import { RecordEditor } from './RecordEditor'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RecordPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [appUserResult, docResult, changesResult] = await Promise.all([
    supabase.from('users').select('role').eq('auth_id', user!.id).single(),
    supabase.from('document').select(`*, org_entity (*)`).eq('id', id).single(),
    supabase.from('changes').select('*').eq('doc_id', id).order('date_of_review', { ascending: false }).limit(20),
  ])

  const appUser = appUserResult.data as Pick<AppUser, 'role'> | null
  const doc = docResult.data
  const rawChanges = changesResult.data ?? []

  if (!doc) notFound()

  // Resolve changed_by UUIDs → first names from the users table.
  // changed_by stores the Supabase auth user.id, which maps to users.auth_id.
  const humanIds = [...new Set(
    rawChanges
      .map(c => c.changed_by)
      .filter((id): id is string => !!id && id !== 'system')
  )]

  const userNames: Record<string, string> = {}
  if (humanIds.length > 0) {
    const { data: usersData } = await supabase
      .from('users')
      .select('auth_id, first_name')
      .in('auth_id', humanIds)
    for (const u of usersData ?? []) {
      if (u.auth_id) userNames[u.auth_id] = u.first_name ?? 'User'
    }
  }

  // Annotate each change with a resolved display name.
  const changes = rawChanges.map(c => ({
    ...c,
    changed_by_name:
      !c.changed_by || c.changed_by === 'system'
        ? 'System'
        : (userNames[c.changed_by] ?? 'User'),
  }))

  const org = Array.isArray(doc.org_entity) ? doc.org_entity[0] : doc.org_entity
  const canEdit = appUser?.role === 'admin' || appUser?.role === 'authorised'
  const needsReview = changes[0]?.needs_review ?? false

  return (
    <RecordEditor
      doc={doc}
      org={org}
      changes={changes}
      canEdit={canEdit}
      userRole={appUser?.role ?? 'read_only'}
      needsReview={needsReview}
    />
  )
}
