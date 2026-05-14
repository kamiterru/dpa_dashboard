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
  const changes = changesResult.data

  if (!doc) notFound()

  const org = Array.isArray(doc.org_entity) ? doc.org_entity[0] : doc.org_entity
  const canEdit = appUser?.role === 'admin' || appUser?.role === 'authorised'

  return (
    <RecordEditor
      doc={doc}
      org={org}
      changes={changes ?? []}
      canEdit={canEdit}
      userRole={appUser?.role ?? 'read_only'}
    />
  )
}
