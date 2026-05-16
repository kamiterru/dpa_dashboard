'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/StatusBadge'
import type { RecordRow } from './page'

type SortField = 'name' | 'last_checked'
type SortDir = 'asc' | 'desc'

interface QueueRow {
  id: string
  company_name: string
  company_url: string | null
  analysis_type: string | null
  status: string | null
  created_at: string | null
}

interface Props {
  records: RecordRow[]
  filter: string | null
  canWrite: boolean
  title?: string
  queue?: QueueRow[]
}

function fmt(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: SortDir }) {
  return (
    <span className="ml-1 inline-flex flex-col gap-[1px] opacity-60">
      <svg width="8" height="5" viewBox="0 0 8 5" className={active && dir === 'asc' ? 'opacity-100' : 'opacity-30'}>
        <path d="M4 0L8 5H0L4 0Z" fill="currentColor" />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" className={active && dir === 'desc' ? 'opacity-100' : 'opacity-30'}>
        <path d="M4 5L0 0H8L4 5Z" fill="currentColor" />
      </svg>
    </span>
  )
}

function FlagIcon() {
  return (
    <span title="Review Needed" className="cursor-default">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-label="Review Needed">
        <path
          d="M2 1.5V11.5M2 1.5H9.5L7.5 5L9.5 8.5H2"
          stroke="#dd2222"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export function RecordsList({ records, filter, canWrite, title = 'All Records', queue = [] }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const result = q
      ? records.filter(r =>
          r.name?.toLowerCase().includes(q) ||
          r.product_description?.toLowerCase().includes(q) ||
          r.products?.toLowerCase().includes(q)
        )
      : records

    return [...result].sort((a, b) => {
      let valA: string, valB: string
      if (sortField === 'name') {
        valA = a.name?.toLowerCase() ?? ''
        valB = b.name?.toLowerCase() ?? ''
      } else {
        valA = a.last_checked ?? ''
        valB = b.last_checked ?? ''
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [records, search, sortField, sortDir])

  // ── Requested queue view ──────────────────────────────────────────────────
  if (filter === 'requested') {
    return (
      <div className="p-8">
        <PageHeader title="Requested" canWrite={false} />
        <div className="bg-white rounded-[8px] border border-[#e6e8eb] overflow-hidden shadow-sm">
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] border-b border-[#f8fafc] bg-[#f8fafc] px-6 py-3">
            {['COMPANY', 'URL', 'TYPE', 'STATUS', 'REQUESTED'].map(h => (
              <span key={h} className="font-poppins text-xs font-semibold text-[#64748b] uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {!queue.length && <EmptyRow cols={5} />}
          {queue.map(row => (
            <div key={row.id} className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] px-6 py-4 border-b border-[#f8fafc] bg-white">
              <span className="font-inter text-sm font-medium text-[#090909]">{row.company_name}</span>
              <span className="font-inter text-sm text-[#536072] truncate">{row.company_url ?? '—'}</span>
              <span className="font-inter text-sm text-[#536072] capitalize">{row.analysis_type?.replace('_', ' ')}</span>
              <StatusBadge status={row.status} />
              <span className="font-inter text-sm text-[#64748b]">{fmt(row.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Main records view ─────────────────────────────────────────────────────
  return (
    <div className="p-8">
      {/* Header row: title + search + new button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-poppins text-2xl font-semibold text-[#0f172a]">{title}</h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bdbdbe]"
              width="16" height="16" viewBox="0 0 16 16" fill="none"
            >
              <path
                d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12ZM14 14l-3-3"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search"
              className="font-poppins text-sm pl-9 pr-4 py-2 rounded-[8px] border border-[#ecf1f6] bg-[#f8fafc] text-[#0f172a] placeholder:text-[#bdbdbe] focus:outline-none focus:ring-2 focus:ring-[#2b53aa]/30 focus:border-[#2b53aa] w-64 transition-colors"
            />
          </div>
          {/* New record button */}
          {canWrite && (
            <Link
              href="/records/new"
              className="font-poppins text-sm font-semibold text-white bg-[#2b53aa] hover:bg-[#234491] rounded-[8px] px-4 py-2 transition-colors whitespace-nowrap"
            >
              + New record
            </Link>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] border border-[#e6e8eb] overflow-hidden shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-[minmax(160px,_219fr)_minmax(200px,_300fr)_100px_120px_100px_140px] border-b border-[#f8fafc] bg-[#f8fafc] px-6 py-3 items-center">
          {/* NAME — sortable */}
          <button
            onClick={() => toggleSort('name')}
            className="flex items-center font-poppins text-xs font-semibold text-[#64748b] uppercase tracking-wider hover:text-[#0f172a] transition-colors text-left"
          >
            Name
            <SortIcon field="name" active={sortField === 'name'} dir={sortDir} />
          </button>
          <span className="font-poppins text-xs font-semibold text-[#64748b] uppercase tracking-wider">Products</span>
          <span className="font-poppins text-xs font-semibold text-[#64748b] uppercase tracking-wider text-right">DPA Date</span>
          <span className="font-poppins text-xs font-semibold text-[#64748b] uppercase tracking-wider">Status</span>
          <span className="font-poppins text-xs font-semibold text-[#64748b] uppercase tracking-wider text-right">Published</span>
          {/* LAST CHECKED — sortable */}
          <button
            onClick={() => toggleSort('last_checked')}
            className="flex items-center font-poppins text-xs font-semibold text-[#64748b] uppercase tracking-wider hover:text-[#0f172a] transition-colors text-left"
          >
            Last Checked
            <SortIcon field="last_checked" active={sortField === 'last_checked'} dir={sortDir} />
          </button>
        </div>

        {/* Rows */}
        {!filtered.length && <EmptyRow cols={6} message={search ? 'No records match your search' : 'No records found'} />}
        {filtered.map(row => (
          <div
            key={row.org_id}
            onClick={() => row.doc_id && router.push(`/records/${row.doc_id}`)}
            className={`grid grid-cols-[minmax(160px,_219fr)_minmax(200px,_300fr)_100px_120px_100px_140px] px-6 py-4 border-b border-[#f8fafc] bg-white items-center gap-2 transition-colors ${
              row.doc_id ? 'cursor-pointer hover:bg-slate-50' : ''
            }`}
          >
            {/* Name + optional review flag */}
            <div className="flex items-center gap-2 min-w-0">
              {row.needs_review && <FlagIcon />}
              <span className="font-inter text-sm font-medium text-[#090909] truncate">
                {row.name ?? '—'}
              </span>
            </div>

            {/* Product description — truncated */}
            <span className="font-inter text-sm text-[#536072] truncate" title={row.product_description ?? ''}>
              {row.product_description ?? row.products ?? '—'}
            </span>

            {/* DPA date */}
            <span className="font-inter text-sm text-[#536072] text-right">{fmt(row.dpa_date)}</span>

            {/* Status pill */}
            <div><StatusBadge status={row.current_status} /></div>

            {/* Published */}
            <span
              className={`font-inter text-sm font-medium text-right ${row.published ? 'text-[#16a34a]' : 'text-[#64748b] font-light'}`}
            >
              {row.published ? 'Live' : 'Draft'}
            </span>

            {/* Last checked */}
            <span className="font-inter text-sm text-[#64748b]">{fmt(row.last_checked)}</span>
          </div>
        ))}
      </div>

      {/* Result count */}
      {search && (
        <p className="mt-3 font-inter text-xs text-[#64748b]">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
        </p>
      )}
    </div>
  )
}

function PageHeader({ title, canWrite }: { title: string; canWrite: boolean }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="font-poppins text-2xl font-semibold text-[#0f172a]">{title}</h1>
      {canWrite && (
        <Link
          href="/records/new"
          className="font-poppins text-sm font-semibold text-white bg-[#2b53aa] hover:bg-[#234491] rounded-[8px] px-4 py-2 border border-[#b2f9fb] transition-colors"
        >
          + New record
        </Link>
      )}
    </div>
  )
}

function EmptyRow({ cols, message = 'No records found' }: { cols: number; message?: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <span className="font-inter text-sm text-[#64748b]">{message}</span>
    </div>
  )
}
