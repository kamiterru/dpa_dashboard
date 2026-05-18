'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/StatusBadge'
import { saveRecord, requestAnalysis } from '@/app/actions/records'
import type { UserRole } from '@/lib/types'

// ─── Types ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

interface Props {
  doc: AnyRecord
  org: AnyRecord
  changes: AnyRecord[]
  canEdit: boolean
  userRole: UserRole
  needsReview: boolean
}

interface FieldDef {
  key: string
  label: string
  type: string
  options?: string[]
  hint?: string
}

// 'source' tells the read view which data object to read from
interface ReadFieldDef extends FieldDef {
  source?: 'org' | 'doc'
}

// ─── Edit-view field definitions ─────────────────────────────────────────────

const ORG_FIELDS: FieldDef[] = [
  { key: 'name',                label: 'Display name',          type: 'text' },
  { key: 'legal_name',          label: 'Legal name',            type: 'text' },
  { key: 'url_link',            label: 'DPA / Privacy URL',     type: 'url' },
  { key: 'products',            label: 'Product name',          type: 'text' },
  { key: 'product_description', label: 'Product description',   type: 'textarea' },
  { key: 'data_types',          label: 'Data types processed',  type: 'textarea' },
  { key: 'location',            label: 'HQ Location',           type: 'text' },
  { key: 'include_entity',      label: 'DPA covers subsidiaries?', type: 'boolean' },
]

const DOC_SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'DPA Overview',
    fields: [
      { key: 'dpa_date',             label: 'Date of DPA',                type: 'date' },
      { key: 'dpa_date_notes',       label: 'Date – Additional Notes',    type: 'textarea' },
      { key: 'jurisdiction_summary', label: 'Covered Jurisdictions',      type: 'textarea' },
      { key: 'current_status',       label: 'Status',                     type: 'select', options: ['Compliant', 'Not Compliant', 'Unclear', 'Not Assessed', 'Failed'] },
    ],
  },
  {
    title: 'Data Storage & Transfers',
    fields: [
      { key: 'data_held_explicit',  label: 'Location of Data:',                    type: 'textarea' },
      { key: 'data_held_summary',   label: 'Data Location Details:',               type: 'textarea' },
      { key: 'transfer_out_choice', label: 'Transfers outside EEA / UK allowed?',  type: 'select', options: ['Yes', 'No', 'With consent'] },
      { key: 'SSC_in_place',        label: 'Are SCCs in place?',                   type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'SSC_summary',         label: 'SCC Summary',                          type: 'textarea' },
    ],
  },
  {
    title: 'Security & Sub-processors',
    fields: [
      { key: 'tech_measures',            label: 'Details of technical/security measures', type: 'textarea' },
      { key: 'tech_measure_contractual', label: 'Are measures contractually binding?',    type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'tech_measure_details',     label: 'Contractual measures details',           type: 'textarea' },
      { key: 'sub_processor_auth',       label: 'Sub-processor authorisation',            type: 'select', options: ['General', 'Specific', 'Unclear'] },
      { key: 'sub_auth_details',         label: 'Sub-processor details',                  type: 'textarea' },
      { key: 'flowdown',                 label: 'Do obligations flow to sub-processors?', type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'flowdown_details',         label: 'Flowdown details',                       type: 'textarea' },
    ],
  },
  {
    title: 'Rights & Obligations',
    fields: [
      { key: 'process_on_instruction',    label: 'Process data on instructions only',    type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'instruction_details',       label: 'Data instructions details',            type: 'textarea' },
      { key: 'rights_assistance',         label: 'Assistance with data subject rights',  type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'rights_assistance_details', label: 'Rights assistance details',            type: 'textarea' },
      { key: 'staff_conf',                label: 'Staff confidentiality obligations',    type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'staff_conf_details',        label: 'Confidentiality details',              type: 'textarea' },
      { key: 'data_breach_notice',        label: 'Data breach notice',                   type: 'textarea' },
      { key: 'data_termination',          label: 'Data on termination',                  type: 'textarea' },
    ],
  },
  {
    title: 'Audit & Governance',
    fields: [
      { key: 'audit_rights_type',    label: 'Audit rights',                    type: 'select', options: ['Yes', 'No', 'Unclear', 'Structured'] },
      { key: 'audit_rights_summary', label: 'Audit rights summary',            type: 'textarea' },
      { key: 'assistance',           label: 'DPIA assistance',                 type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'assistance_details',   label: 'DPIA assistance details',         type: 'textarea' },
      { key: 'dpa_incorp',           label: 'DPA incorporated into contract',  type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'dpa_incorp_details',   label: 'Incorporation details',           type: 'textarea' },
    ],
  },
]

// ─── Read-view field definitions ─────────────────────────────────────────────
// Matches Figma node 430:1276 (record_view_read_record) exactly.
// source: 'org' reads from the org object; default ('doc') reads from doc.

const READ_ORG_FIELDS: ReadFieldDef[] = [
  { key: 'legal_name',          label: 'Legal Name',           type: 'text',     source: 'org' },
  { key: 'products',            label: 'Product Name',         type: 'text',     source: 'org' },
  { key: 'product_description', label: 'Product Description',  type: 'textarea', source: 'org' },
  { key: 'data_types',          label: 'Data Types Processed', type: 'textarea', source: 'org' },
  { key: 'location',            label: 'HQ Location',          type: 'text',     source: 'org' },
]

const READ_DOC_SECTIONS: { title: string; fields: ReadFieldDef[] }[] = [
  {
    title: 'DPA Overview',
    fields: [
      { key: 'dpa_date',             label: 'Date of DPA',              type: 'date' },
      { key: 'dpa_date_notes',       label: 'Date - Additional Notes',  type: 'textarea' },
      // include_entity and url_link sourced from org but displayed in this section per Figma
      { key: 'include_entity',       label: 'DPA Covers subsidiaries?', type: 'boolean',  source: 'org' },
      { key: 'jurisdiction_summary', label: 'Covered Jurisdictions',    type: 'textarea' },
      { key: 'url_link',             label: 'DPA URL',                  type: 'url',      source: 'org' },
      // current_status is NOT a field row — shown only in the header status chip
    ],
  },
  {
    title: 'Data Storage & Transfers',
    fields: [
      { key: 'data_held_explicit',  label: 'Location of Data:',                    type: 'text' },
      { key: 'data_held_summary',   label: 'Data Location Details:',               type: 'textarea' },
      { key: 'transfer_out_choice', label: 'Transfers outside EEA / UK allowed?',  type: 'select' },
      { key: 'SSC_in_place',        label: 'Are SCCs in place?',                   type: 'select' },
      { key: 'SSC_summary',         label: 'SCC Summary',                          type: 'textarea' },
    ],
  },
  {
    title: 'Security & Sub-processors',
    fields: [
      { key: 'tech_measures',            label: 'Details of technical/security measures', type: 'textarea' },
      { key: 'tech_measure_contractual', label: 'Are measures contractually binding?',    type: 'select' },
      { key: 'tech_measure_details',     label: 'Contractual measures details',           type: 'textarea' },
      { key: 'sub_processor_auth',       label: 'Sub-processor authorisation',            type: 'select' },
      { key: 'sub_auth_details',         label: 'Sub-processor details',                  type: 'textarea' },
      { key: 'flowdown',                 label: 'Do obligations flow to sub-processors?', type: 'select' },
      { key: 'flowdown_details',         label: 'Flowdown details',                       type: 'textarea' },
    ],
  },
  {
    title: 'Rights & Obligations',
    fields: [
      { key: 'process_on_instruction',    label: 'Process data on instructions only',   type: 'select' },
      { key: 'instruction_details',       label: 'Data instructions details',           type: 'textarea' },
      { key: 'rights_assistance',         label: 'Assistance with data subject rights', type: 'select' },
      { key: 'rights_assistance_details', label: 'Rights assistance details',           type: 'textarea' },
      { key: 'staff_conf',                label: 'Staff confidentiality obligations',   type: 'select' },
      { key: 'staff_conf_details',        label: 'Confidentiality details',             type: 'textarea' },
      { key: 'data_breach_notice',        label: 'Data breach notice',                  type: 'textarea' },
      { key: 'data_termination',          label: 'Data on termination',                 type: 'textarea' },
    ],
  },
  {
    title: 'Audit & Governance',
    fields: [
      { key: 'audit_rights_type',    label: 'Audit rights',                   type: 'select' },
      { key: 'audit_rights_summary', label: 'Audit rights summary',           type: 'textarea' },
      { key: 'assistance',           label: 'DPIA assistance',                type: 'select' },
      { key: 'assistance_details',   label: 'DPIA assistance details',        type: 'textarea' },
      { key: 'dpa_incorp',           label: 'DPA incorporated into contract', type: 'select' },
      { key: 'dpa_incorp_details',   label: 'Incorporation details',          type: 'textarea' },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Renders a read-only value.
// Boolean true/false and select Yes/No → filled check_circle / cancel icons at 16px.
function ReadValue({ value, type }: { value: unknown; type: string }) {
  // Boolean fields
  if (type === 'boolean') {
    if (value === true)
      return <span className="material-symbols-outlined icon-filled icon-sm text-green-600">check_circle</span>
    if (value === false)
      return <span className="material-symbols-outlined icon-filled icon-sm text-red-500">cancel</span>
    return <span className="text-slate-300">—</span>
  }

  const str = formatDisplayValue(value)

  // Yes / No select values → icons
  if (str === 'Yes')
    return <span className="material-symbols-outlined icon-filled icon-sm text-green-600">check_circle</span>
  if (str === 'No')
    return <span className="material-symbols-outlined icon-filled icon-sm text-red-500">cancel</span>

  if (!str) return <span className="text-slate-300">—</span>

  if (type === 'url') {
    return (
      <a href={str} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
        {str}
      </a>
    )
  }

  return <span className="break-words">{str}</span>
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RecordEditor({ doc, org, changes, canEdit, needsReview }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)

  // Edit-mode state
  const [orgState, setOrgState] = useState<AnyRecord>({ ...org })
  const [docState, setDocState] = useState<AnyRecord>({ ...doc })
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [analysisUrl, setAnalysisUrl] = useState(org?.url_link ?? '')
  const [analysisQueued, setAnalysisQueued] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  function updateOrg(key: string, value: unknown) {
    setOrgState(s => ({ ...s, [key]: value }))
    setIsDirty(true)
  }

  function updateDoc(key: string, value: unknown) {
    setDocState(s => ({ ...s, [key]: value }))
    setIsDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)

    const orgChanges: AnyRecord = {}
    const docChanges: AnyRecord = {}
    const changedLabels: string[] = []

    ORG_FIELDS.forEach(({ key }) => {
      if (JSON.stringify(orgState[key]) !== JSON.stringify(org[key])) {
        orgChanges[key] = orgState[key]
        changedLabels.push(key)
      }
    })

    DOC_SECTIONS.forEach(section =>
      section.fields.forEach(({ key }) => {
        if (JSON.stringify(docState[key]) !== JSON.stringify(doc[key])) {
          docChanges[key] = docState[key]
          changedLabels.push(key)
        }
      })
    )

    const summary = changedLabels.length
      ? `Updated fields: ${changedLabels.join(', ')}`
      : 'No field changes detected'

    const result = await saveRecord(org.id, doc.id, orgChanges, docChanges, summary)
    setSaving(false)

    if (result.error) {
      setSaveError(result.error)
    } else {
      setIsDirty(false)
      router.refresh()
      setIsEditing(false)
    }
  }

  async function handleRequestAnalysis() {
    setAnalysisLoading(true)
    setAnalysisError(null)
    const result = await requestAnalysis(org.name ?? '', analysisUrl, 'reanalyse')
    setAnalysisLoading(false)
    if (result.error) {
      setAnalysisError(result.error)
    } else {
      setAnalysisQueued(true)
    }
  }

  // ── Edit view ──────────────────────────────────────────────────────────────

  if (isEditing && canEdit) {
    return (
      <div className="p-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-[12px] text-[#64748b] tracking-[0.4px]">
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-2 hover:text-slate-700"
          >
            <span className="material-symbols-outlined icon-xs">arrow_left_alt</span>
            Records
          </button>
          <span className="text-[#c7cdd6]">/</span>
          <span>{orgState.name}</span>
        </div>

        {/* Header card */}
        <div className="bg-white rounded-xl p-6 flex items-start justify-between mb-4">
          <h1 className="font-poppins font-semibold text-[32px] leading-7 text-black">
            {orgState.name}
          </h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={docState.current_status} />
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>

        {saveError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{saveError}</div>
        )}

        <div className="flex flex-col gap-4">
          <EditSection title="Organisation">
            {ORG_FIELDS.map(field => (
              <EditFieldRow
                key={field.key}
                field={field}
                value={orgState[field.key]}
                onChange={v => updateOrg(field.key, v)}
              />
            ))}
          </EditSection>

          {DOC_SECTIONS.map(section => (
            <EditSection key={section.title} title={section.title}>
              {section.fields.map(field => (
                <EditFieldRow
                  key={field.key}
                  field={field}
                  value={docState[field.key]}
                  onChange={v => updateDoc(field.key, v)}
                />
              ))}
            </EditSection>
          ))}

          <EditSection title="AI Analysis">
            <div className="py-3 space-y-3">
              <p className="text-sm text-slate-500">
                Queue a re-analysis of this DPA. The analysis will be run against the live document at the URL below.
              </p>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">DPA URL</label>
                  <input
                    type="url"
                    value={analysisUrl}
                    onChange={e => setAnalysisUrl(e.target.value)}
                    className="input"
                    placeholder="https://..."
                  />
                </div>
                <button
                  onClick={handleRequestAnalysis}
                  disabled={analysisLoading || analysisQueued}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50 transition-colors"
                >
                  {analysisLoading ? 'Queuing…' : analysisQueued ? 'Queued ✓' : 'Request analysis'}
                </button>
              </div>
              {analysisError && <p className="text-sm text-red-600">{analysisError}</p>}
            </div>
          </EditSection>

          <ChangeHistory changes={changes} />
        </div>
      </div>
    )
  }

  // ── Read view (default for all users) ─────────────────────────────────────

  const lastReviewed = changes[0]?.date_of_review
    ? formatDate(changes[0].date_of_review)
    : null

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb — sits above all cards, matches Figma breadcrumbs node */}
      <div className="flex items-center gap-2 mb-6 text-[12px] text-[#64748b] tracking-[0.2px]">
        <Link href="/records" className="flex items-center gap-2 hover:text-slate-700">
          {/* arrow_left_alt at 12×12px per Figma */}
          <span className="material-symbols-outlined icon-xs">arrow_left_alt</span>
          Records
        </Link>
        <span className="text-[#c7cdd6]">/</span>
        <span>{org.name}</span>
      </div>

      {/* All cards in a 16px-gap column */}
      <div className="flex flex-col gap-4">

        {/* Header card — bg-white rounded-[12px] p-[24px] per Figma company_main_information */}
        <div className="bg-white rounded-xl p-6 flex items-start justify-between">
          <div className="flex flex-col gap-3">
            {/* Poppins SemiBold 32px text-black per Figma dashboard_title style */}
            <h1 className="font-poppins font-semibold text-[32px] leading-7 text-black">
              {org.name}
            </h1>
            {lastReviewed && (
              /* Inter Medium 14px #475569 tracking-[1px] per Figma normal_emphasis style */
              <p className="text-sm font-medium text-[#475569] tracking-[1px]">
                Last Reviewed: {lastReviewed}
              </p>
            )}
          </div>

          {/* Status cluster: flag (16px) | chip | edit pencil (16px) */}
          <div className="flex items-center gap-3">
            {needsReview && (
              <span
                className="material-symbols-outlined icon-filled icon-sm text-red-500"
                title="Needs review"
              >
                flag
              </span>
            )}
            <StatusBadge status={doc.current_status} />
            {canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center hover:opacity-70 transition-opacity text-slate-400"
                title="Edit record"
              >
                <span className="material-symbols-outlined icon-sm">edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Organisation card */}
        <ReadSection title="Organisation">
          {READ_ORG_FIELDS.map(field => (
            <ReadFieldRow key={field.key} field={field} org={org} doc={doc} />
          ))}
        </ReadSection>

        {/* DPA document sections */}
        {READ_DOC_SECTIONS.map(section => (
          <ReadSection key={section.title} title={section.title}>
            {section.fields.map(field => (
              <ReadFieldRow key={field.key} field={field} org={org} doc={doc} />
            ))}
          </ReadSection>
        ))}

        <ChangeHistory changes={changes} />
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

// Read section card: bg-white rounded-[12px] px-[24px] py-[12px], no border, no shadow
function ReadSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl px-6 py-3">
      {/* Poppins SemiBold 14px, border-b 1.4px #eff2f5 per Figma sidebar_selected style */}
      <div
        className="pt-3 pb-4 flex items-center"
        style={{ borderBottom: '1.4px solid #eff2f5' }}
      >
        <h2 className="font-poppins font-semibold text-[16px] leading-5 text-[#0f172a] uppercase tracking-[0.2px]">
          {title}
        </h2>
      </div>
      {/* gap-[4px] between rows per Figma */}
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  )
}

// Edit section card: same visual treatment as read, used in the edit view
function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl px-6 py-3">
      <div
        className="pt-3 pb-4 flex items-center"
        style={{ borderBottom: '1.4px solid #eff2f5' }}
      >
        <h2 className="font-poppins font-semibold text-[16px] leading-5 text-[#0f172a] uppercase tracking-[0.2px]">
          {title}
        </h2>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

// Read field row: flex gap-[56px], label w-[272px] text-[#64748b] tracking-[0.4px],
// value flex-1 text-[#0f172a] — per Figma field row nodes
function ReadFieldRow({
  field,
  org,
  doc,
}: {
  field: ReadFieldDef
  org: AnyRecord
  doc: AnyRecord
}) {
  const value = field.source === 'org' ? org[field.key] : doc[field.key]
  return (
    <div className="flex items-start gap-14 py-3">
      <dt className="text-sm text-[#64748b] w-[272px] shrink-0 leading-4">
        {field.label}
      </dt>
      <dd className="flex-1 text-sm text-[#0f172a] leading-4">
        <ReadValue value={value} type={field.type} />
      </dd>
    </div>
  )
}

function EditFieldRow({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const displayValue = value === null || value === undefined ? '' : String(value)

  return (
    <div className="grid grid-cols-3 gap-4 items-start py-2">
      <label className="text-sm font-medium text-slate-600 pt-2">
        {field.label}
        {field.hint && <span className="block text-xs text-slate-400 font-normal">{field.hint}</span>}
      </label>
      <div className="col-span-2">
        {field.type === 'textarea' ? (
          <textarea
            value={displayValue}
            onChange={e => onChange(e.target.value)}
            rows={3}
            className="input resize-y text-sm"
          />
        ) : field.type === 'select' ? (
          <select
            value={displayValue}
            onChange={e => onChange(e.target.value)}
            className="input text-sm"
          >
            <option value="">— select —</option>
            {field.options?.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        ) : field.type === 'boolean' ? (
          <select
            value={value === true ? 'true' : value === false ? 'false' : ''}
            onChange={e => onChange(e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}
            className="input text-sm"
          >
            <option value="">— select —</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        ) : (
          <input
            type={field.type}
            value={displayValue}
            onChange={e => onChange(e.target.value)}
            className="input text-sm"
          />
        )}
      </div>
    </div>
  )
}

function ChangeHistory({ changes }: { changes: AnyRecord[] }) {
  return (
    <ReadSection title="Change history">
      {changes.length === 0 ? (
        <p className="text-[12px] text-slate-400 py-3">No changes recorded yet.</p>
      ) : (
        <>
          {changes.map(change => (
            // 3-column row: date | summary | user — no dividers between rows per Figma
            <div key={change.id} className="flex items-center gap-14 py-3">
              {/* Date — Inter SemiBold 12px #0f172a tracking-[0.2px] w-[180px] */}
              <p className="text-[12px] font-semibold text-[#0f172a] tracking-[0.2px] w-[180px] shrink-0">
                {change.date_of_review
                  ? new Date(change.date_of_review).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })
                  : '—'}
              </p>
              {/* Summary — Inter Regular 12px #0f172a tracking-[0.4px], flex-1 to fill available space */}
              <p className="text-[12px] text-[#0f172a] tracking-[0.4px] flex-1">
                {change.summary_changes ?? '—'}
              </p>
              {/* User — Inter Regular 12px #64748b, auto width */}
              <p className="text-[12px] text-[#64748b] whitespace-nowrap">
                {change.changed_by_name}
              </p>
            </div>
          ))}
        </>
      )}
    </ReadSection>
  )
}
