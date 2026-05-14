import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/StatusBadge'
import { AppUser } from '@/lib/types'

type Filter = 'live' | 'review' | 'requested' | null

interface Props {
  searchParams: Promise<{ filter?: string }>
}

export default async function RecordsPage({ searchParams }: Props) {
  const { filter: rawFilter } = await searchParams
  const filter = (rawFilter as Filter) ?? null

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: appUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user!.id)
    .single() as { data: Pick<AppUser, 'role'> | null }

  const canWrite = appUser?.role === 'admin' || appUser?.role === 'authorised'

  // For "requested" filter, query analysis_queue
  if (filter === 'requested') {
    const { data: queue } = await supabase
      .from('analysis_queue')
      .select('id, company_name, company_url, analysis_type, status, created_at')
      .order('created_at', { ascending: false })

    return (
      <PageWrapper title="Requested" canWrite={canWrite} filter={filter}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>Company</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Requested</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {!queue?.length && (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">No requests pending</td></tr>
            )}
            {queue?.map(row => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {row.company_name}
                  {row.company_url && (
                    <span className="ml-2 text-xs text-slate-400">{row.company_url}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 capitalize">{row.analysis_type?.replace('_', ' ')}</td>
                <td className="px-6 py-4"><StatusBadge status={row.status} /></td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PageWrapper>
    )
  }

  // Build query for main record views
  let query = supabase
    .from('org_entity')
    .select(`
      id,
      name,
      slug,
      published,
      document (
        id,
        dpa_date,
        current_status,
        changes (
          needs_review,
          date_of_review
        )
      )
    `)
    .order('name', { ascending: true })

  if (filter === 'live') {
    query = query.eq('published', true)
  }

  const { data: orgs, error } = await query

  // Build flat list with latest change info
  type Row = {
    org_id: string
    name: string | null
    slug: string | null
    published: boolean | null
    doc_id: string | null
    dpa_date: string | null
    current_status: string | null
    needs_review: boolean | null
  }

  const rows: Row[] = (orgs ?? []).flatMap(org => {
    const docs = Array.isArray(org.document) ? org.document : org.document ? [org.document] : []
    if (!docs.length) {
      return [{ org_id: org.id, name: org.name, slug: org.slug, published: org.published, doc_id: null, dpa_date: null, current_status: null, needs_review: null }]
    }
    return docs.map(doc => {
      const changes = Array.isArray(doc.changes) ? doc.changes : doc.changes ? [doc.changes] : []
      const latest = changes.sort((a, b) =>
        new Date(b.date_of_review ?? 0).getTime() - new Date(a.date_of_review ?? 0).getTime()
      )[0]
      return {
        org_id: org.id,
        name: org.name,
        slug: org.slug,
        published: org.published,
        doc_id: doc.id,
        dpa_date: doc.dpa_date,
        current_status: doc.current_status,
        needs_review: latest?.needs_review ?? null,
      }
    })
  })

  const filtered = filter === 'review' ? rows.filter(r => r.needs_review) : rows

  const TITLES: Record<string, string> = {
    live: 'Live Records',
    review: 'For Review',
  }

  return (
    <PageWrapper title={TITLES[filter ?? ''] ?? 'All Records'} canWrite={canWrite} filter={filter}>
      {error && (
        <div className="px-6 py-4 text-sm text-red-600 bg-red-50">{error.message}</div>
      )}
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <Th>Name</Th>
            <Th>DPA Date</Th>
            <Th>Status</Th>
            <Th>Published</Th>
            <Th><span className="sr-only">Actions</span></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {!filtered.length && (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                No records found
              </td>
            </tr>
          )}
          {filtered.map(row => (
            <tr key={row.org_id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 text-sm font-medium text-slate-900">
                {row.name ?? '—'}
                {row.needs_review && (
                  <span className="ml-2 text-xs text-amber-600 font-normal">⚠ Review needed</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">
                {row.dpa_date ? new Date(row.dpa_date).toLocaleDateString('en-GB') : '—'}
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={row.current_status} />
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">
                {row.published ? (
                  <span className="text-green-600 font-medium">Live</span>
                ) : (
                  <span className="text-slate-400">Draft</span>
                )}
              </td>
              <td className="px-6 py-4 text-right text-sm">
                {row.doc_id && (
                  <Link
                    href={`/records/${row.doc_id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View →
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageWrapper>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  )
}

function PageWrapper({
  title,
  canWrite,
  filter,
  children,
}: {
  title: string
  canWrite: boolean
  filter: Filter
  children: React.ReactNode
}) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {canWrite && filter !== 'requested' && (
          <Link
            href="/records/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            + New record
          </Link>
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {children}
      </div>
    </div>
  )
}
