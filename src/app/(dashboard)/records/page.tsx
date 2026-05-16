import { createClient } from '@/lib/supabase/server'
import { AppUser } from '@/lib/types'
import { RecordsList } from './RecordsList'

export interface RecordRow {
  org_id: string
  doc_id: string | null
  name: string | null
  products: string | null
  product_description: string | null
  dpa_date: string | null
  current_status: string | null
  published: boolean | null
  needs_review: boolean | null
  last_checked: string | null
}

interface Props {
  searchParams: Promise<{ filter?: string }>
}

export default async function RecordsPage({ searchParams }: Props) {
  const { filter: rawFilter } = await searchParams
  const filter = rawFilter ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: appUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user!.id)
    .single() as { data: Pick<AppUser, 'role'> | null }

  const canWrite = appUser?.role === 'admin' || appUser?.role === 'authorised'

  // Requested tab — show analysis queue
  if (filter === 'requested') {
    const { data: queue } = await supabase
      .from('analysis_queue')
      .select('id, company_name, company_url, analysis_type, status, created_at')
      .order('created_at', { ascending: false })

    return (
      <RecordsList
        records={[]}
        filter="requested"
        canWrite={canWrite}
        queue={queue ?? []}
      />
    )
  }

  // Main records query — includes products, product_description, last change date
  const { data: orgs } = await supabase
    .from('org_entity')
    .select(`
      id, name, published, products, product_description,
      document (
        id, dpa_date, current_status,
        changes ( needs_review, date_of_review )
      )
    `)
    .order('name', { ascending: true })

  const rows: RecordRow[] = (orgs ?? []).flatMap(org => {
    const docs = Array.isArray(org.document)
      ? org.document
      : org.document ? [org.document] : []

    if (!docs.length) {
      return [{
        org_id: org.id, doc_id: null,
        name: org.name, products: org.products,
        product_description: org.product_description,
        dpa_date: null, current_status: null,
        published: org.published, needs_review: null, last_checked: null,
      }]
    }

    return docs.map(doc => {
      const changes = Array.isArray(doc.changes)
        ? doc.changes
        : doc.changes ? [doc.changes] : []

      const sorted = [...changes].sort((a, b) =>
        new Date(b.date_of_review ?? 0).getTime() - new Date(a.date_of_review ?? 0).getTime()
      )
      const latest = sorted[0]

      return {
        org_id: org.id,
        doc_id: doc.id,
        name: org.name,
        products: org.products,
        product_description: org.product_description,
        dpa_date: doc.dpa_date,
        current_status: doc.current_status,
        published: org.published,
        needs_review: latest?.needs_review ?? null,
        last_checked: latest?.date_of_review ?? null,
      }
    })
  })

  const filtered = filter === 'review'
    ? rows.filter(r => r.needs_review)
    : filter === 'live'
    ? rows.filter(r => r.published)
    : rows

  const TITLES: Record<string, string> = {
    live: 'Live Records',
    review: 'For Review',
  }

  return (
    <RecordsList
      records={filtered}
      filter={filter}
      canWrite={canWrite}
      title={TITLES[filter ?? ''] ?? 'All Records'}
    />
  )
}
