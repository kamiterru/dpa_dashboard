'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/StatusBadge'
import { saveRecord, queueAnalysis } from '@/app/actions/records'
import { useNavGuard } from '@/components/NavigationGuardProvider'
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
  isLocked: boolean
  lockAnalysisType: string | null
  lockRequestedByName: string | null
}

interface FieldDef {
  key: string
  label: string
  type: string
  options?: string[]
  hint?: string
  /** For STATUS section fields that live in org_entity rather than document */
  source?: 'org' | 'doc'
}

// 'source' tells the read view which data object to read from
interface ReadFieldDef extends FieldDef {
  source?: 'org' | 'doc'
}

// ─── Status section (top of edit view) ───────────────────────────────────────

const STATUS_FIELDS: FieldDef[] = [
  {
    key: 'current_status',
    label: 'Current Status',
    type: 'select',
    options: ['GDPR Addressed', 'Data Use Review', 'Needs Review', 'Gaps Identified', 'Not Assessed', 'Failed'],
  },
  { key: 'needs_review', label: 'Needs Review', type: 'boolean' },
  // published lives in org_entity — source: 'org' routes it to orgState / updateOrg
  { key: 'published', label: 'Published', type: 'toggle', source: 'org' },
]

// ─── Edit-view field definitions ─────────────────────────────────────────────

const ORG_FIELDS: FieldDef[] = [
  { key: 'name',                label: 'Display name',             type: 'text' },
  { key: 'legal_name',          label: 'Legal name',               type: 'text' },
  { key: 'url_link',            label: 'DPA / Privacy URL',        type: 'url' },
  { key: 'products',            label: 'Product name',             type: 'text' },
  { key: 'product_description', label: 'Product description',      type: 'textarea' },
  { key: 'data_types',          label: 'Data types processed',     type: 'textarea' },
  { key: 'location',            label: 'HQ Location',              type: 'text' },
  { key: 'include_entity',      label: 'DPA covers subsidiaries?', type: 'boolean' },
]

// Summary section — at_a_glance renders full-width with no label column
const SUMMARY_FIELDS: FieldDef[] = [
  { key: 'at_a_glance', label: 'At a glance', type: 'textarea' },
]

// current_status has been moved to STATUS_FIELDS; no longer in DPA Overview
const DOC_SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'DPA Overview',
    fields: [
      { key: 'dpa_date',             label: 'Date of DPA',             type: 'date' },
      { key: 'dpa_date_notes',       label: 'Date – Additional Notes', type: 'textarea' },
      { key: 'jurisdiction_summary', label: 'Covered Jurisdictions',   type: 'textarea' },
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
    title: 'Non-Processor Data Use',
    fields: [
      { key: 'sole_processor',         label: 'Does the company process data solely as a processor?', type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'sole_processor_details', label: 'Details of non-processor data use',                               type: 'textarea' },
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
    title: 'Non-Processor Data Use',
    fields: [
      { key: 'sole_processor',         label: 'Does the company process data solely as a processor?', type: 'select' },
      { key: 'sole_processor_details', label: 'Details of non-processor data use',                               type: 'textarea' },
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

  // Yes / No / Unclear select values → icons
  if (str === 'Yes')
    return <span className="material-symbols-outlined icon-filled icon-sm text-green-600">check_circle</span>
  if (str === 'No')
    return <span className="material-symbols-outlined icon-filled icon-sm text-red-500">cancel</span>
  if (str === 'Unclear')
    return <span className="material-symbols-outlined icon-filled icon-sm" style={{ color: '#F49A33' }}>help</span>

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

export function RecordEditor({ doc, org, changes, canEdit, needsReview, isLocked, lockAnalysisType, lockRequestedByName }: Props) {
  const router = useRouter()
  const { setDirty: setContextDirty, requestNavigation } = useNavGuard()

  const [isEditing, setIsEditing] = useState(false)
  const [orgState, setOrgState] = useState<AnyRecord>({ ...org })
  const [docState, setDocState] = useState<AnyRecord>({
    ...doc,
    // Seed needs_review from doc if present, else fall back to the prop
    needs_review: needsReview, // lives on changes table, seeded from the latest change entry
  })
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [queueing, setQueueing] = useState(false)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [showAnalyseModal, setShowAnalyseModal] = useState(false)
  const [showCheckDateModal, setShowCheckDateModal] = useState(false)

  // ── Browser-level navigation guard (tab close / refresh) ──────────────────
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // ── Dirty-state helpers ───────────────────────────────────────────────────

  function markDirty() {
    setIsDirty(true)
    setContextDirty(true)
  }

  function markClean() {
    setIsDirty(false)
    setContextDirty(false)
  }

  function exitEditMode() {
    setIsEditing(false)
    setOrgState({ ...org })
    setDocState({
      ...doc,
      needs_review: needsReview, // lives on changes table, seeded from the latest change entry
    })
    markClean()
  }

  function updateOrg(key: string, value: unknown) {
    setOrgState(s => ({ ...s, [key]: value }))
    markDirty()
  }

  function updateDoc(key: string, value: unknown) {
    setDocState(s => ({ ...s, [key]: value }))
    markDirty()
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setSaveError(null)

    const orgChanges: AnyRecord = {}
    const docChanges: AnyRecord = {}
    const changedLabels: string[] = []

    // Org-table fields defined in ORG_FIELDS
    ORG_FIELDS.forEach(({ key }) => {
      if (JSON.stringify(orgState[key]) !== JSON.stringify(org[key])) {
        orgChanges[key] = orgState[key]
        changedLabels.push(key)
      }
    })

    // Org-sourced STATUS fields (e.g. published) — not in ORG_FIELDS since
    // they live in the STATUS card, but they do belong to org_entity.
    STATUS_FIELDS.filter(f => f.source === 'org').forEach(({ key }) => {
      if (JSON.stringify(orgState[key]) !== JSON.stringify(org[key])) {
        orgChanges[key] = orgState[key]
        changedLabels.push(key)
      }
    })

    // needs_review lives on the changes table, not the document table.
    // Detect it separately and pass it to saveRecord; never put it in docChanges.
    const needsReviewValue = Boolean(docState.needs_review)
    if (needsReviewValue !== needsReview) {
      changedLabels.push('needs_review')
    }

    // Doc-table fields: STATUS fields that are not needs_review and not org-sourced,
    // plus all the section fields and the summary field.
    ;[
      ...STATUS_FIELDS.filter(f => f.key !== 'needs_review' && f.source !== 'org'),
      ...SUMMARY_FIELDS,
      ...DOC_SECTIONS.flatMap(s => s.fields),
    ].forEach(({ key }) => {
      if (JSON.stringify(docState[key]) !== JSON.stringify(doc[key])) {
        docChanges[key] = docState[key]
        changedLabels.push(key)
      }
    })

    const summary = changedLabels.length
      ? `Updated fields: ${changedLabels.join(', ')}`
      : 'No field changes detected'

    const result = await saveRecord(org.id, doc.id, orgChanges, docChanges, summary, needsReviewValue)
    setSaving(false)

    if (result.error) {
      setSaveError(result.error)
    } else {
      markClean()
      router.refresh()
      setIsEditing(false)
    }
  }

  // ── Queue analysis ────────────────────────────────────────────────────────

  async function handleQueue(analysisType: 'reanalyse' | 'hard_reanalyse') {
    setQueueing(true)
    setQueueError(null)

    // Collect any pending changes to save before queuing
    const orgChanges: AnyRecord = {}
    const docChanges: AnyRecord = {}

    ORG_FIELDS.forEach(({ key }) => {
      if (JSON.stringify(orgState[key]) !== JSON.stringify(org[key])) {
        orgChanges[key] = orgState[key]
      }
    })
    STATUS_FIELDS.filter(f => f.source === 'org').forEach(({ key }) => {
      if (JSON.stringify(orgState[key]) !== JSON.stringify(org[key])) {
        orgChanges[key] = orgState[key]
      }
    })
    ;[
      ...STATUS_FIELDS.filter(f => f.key !== 'needs_review' && f.source !== 'org'),
      ...SUMMARY_FIELDS,
      ...DOC_SECTIONS.flatMap(s => s.fields),
    ].forEach(({ key }) => {
      if (JSON.stringify(docState[key]) !== JSON.stringify(doc[key])) {
        docChanges[key] = docState[key]
      }
    })

    const result = await queueAnalysis(
      org.id,
      doc.id,
      org.name,
      org.url_link ?? '',
      analysisType,
      orgChanges,
      docChanges,
      Boolean(docState.needs_review),
    )

    setQueueing(false)

    if (result.error) {
      setQueueError(result.error)
    } else {
      markClean()
      setIsEditing(false)
      setShowAnalyseModal(false)
      setShowCheckDateModal(false)
      router.refresh()
    }
  }

  // ── Edit view ──────────────────────────────────────────────────────────────

  if (isEditing && canEdit) {
    return (
      <div className="p-8 max-w-4xl">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-[12px] text-[#64748b] tracking-[0.4px]">
          <button
            onClick={() => requestNavigation(() => { markClean(); router.push('/records') })}
            className="flex items-center gap-2 hover:text-slate-700"
          >
            <span className="material-symbols-outlined icon-xs">arrow_left_alt</span>
            Records
          </button>
          <span className="text-[#c7cdd6]">/</span>
          <span>{orgState.name}</span>
        </div>

        {/* Header card */}
        <div className="bg-white rounded-xl px-6 pt-8 pb-6 flex items-center justify-between mb-4">
          <h1 className="font-poppins font-semibold text-[32px] leading-7 text-black">
            {orgState.name}
          </h1>

          {/* Icon-only action buttons — gap-2, rounded-[6px], icon-button (18px).
              flex+items-center on each button prevents the inline descender gap
              that would otherwise add extra space below the icon. */}
          <div className="flex items-center gap-2">
            {/* Cancel — red border, no fill */}
            <button
              onClick={() => requestNavigation(() => exitEditMode())}
              title="Cancel"
              className="flex items-center justify-center border-2 border-[#e08484] rounded-[6px] p-[6px] hover:bg-red-50 transition-colors"
            >
              <span className="material-symbols-outlined icon-button text-[#e08484]">close_small</span>
            </button>

            {/* Check DPA Date — grey fill, event_repeat icon */}
            <button
              onClick={() => setShowCheckDateModal(true)}
              title="Check DPA Date"
              className="flex items-center justify-center bg-[#bac3d1] rounded-[6px] p-[6px] hover:bg-[#a8b3c3] transition-colors"
            >
              <span className="material-symbols-outlined icon-button text-white">event_repeat</span>
            </button>

            {/* Re-analyse — grey fill, autoplay icon */}
            <button
              onClick={() => setShowAnalyseModal(true)}
              title="Re-analyse"
              className="flex items-center justify-center bg-[#bac3d1] rounded-[6px] p-[6px] hover:bg-[#a8b3c3] transition-colors"
            >
              <span className="material-symbols-outlined icon-button text-white">autoplay</span>
            </button>

            {/* Save — blue fill, 40% opacity until dirty */}
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              title={saving ? 'Saving…' : 'Save'}
              className={`flex items-center justify-center bg-[#2c53ab] rounded-[6px] p-[6px] transition-opacity ${
                isDirty ? 'opacity-100 hover:bg-[#1e3f8a]' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined icon-button text-white">save</span>
            </button>
          </div>
        </div>

        {saveError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{saveError}</div>
        )}

        <div className="flex flex-col gap-4">
          {/* Status section — fields may be sourced from doc or org */}
          <EditSection title="Status">
            {STATUS_FIELDS.map(field => (
              <EditFieldRow
                key={field.key}
                field={field}
                value={field.source === 'org' ? orgState[field.key] : docState[field.key]}
                onChange={v =>
                  field.source === 'org'
                    ? updateOrg(field.key, v)
                    : updateDoc(field.key, v)
                }
              />
            ))}
          </EditSection>

          {/* Summary section — full-width, no label column */}
          <EditSection title="Summary">
            <div className="py-2">
              <textarea
                value={docState.at_a_glance ?? ''}
                onChange={e => updateDoc('at_a_glance', e.target.value)}
                rows={5}
                className="input resize-y text-sm w-full"
              />
            </div>
          </EditSection>

          {/* Organisation section */}
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

          {/* DPA content sections */}
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
        </div>

        {queueError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{queueError}</div>
        )}

        {/* ── Re-analyse modal ── */}
        {showAnalyseModal && (
          <ConfirmModal
            title={`Analysis request for ${orgState.name}`}
            onCancel={() => setShowAnalyseModal(false)}
            onConfirm={() => handleQueue('hard_reanalyse')}
            confirming={queueing}
          >
            <p>
              You have requested a re-analysis for this company. By clicking continue, we will
              perform a full analysis for this company which may replace existing wording in
              the analysis.
            </p>
            <p>
              {isDirty ? 'Any unsaved edits will be saved before the analysis begins. ' : ''}
              You will receive an email when the analysis is complete.
            </p>
          </ConfirmModal>
        )}

        {/* ── Check DPA Date modal ── */}
        {showCheckDateModal && (
          <ConfirmModal
            title={`Check Date for ${orgState.name}`}
            onCancel={() => setShowCheckDateModal(false)}
            onConfirm={() => handleQueue('reanalyse')}
            confirming={queueing}
          >
            <p>
              By clicking continue, we will check the date of the DPA for this company – if
              it is different from the date stored, we will re-examine the rest of the DPA.
              This is normally done on a weekly basis anyway, but you can make it happen now
              if you need.
            </p>
            {isDirty && (
              <p>Any unsaved edits will be saved before the check begins.</p>
            )}
          </ConfirmModal>
        )}
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
                onClick={() => { if (!isLocked) setIsEditing(true) }}
                disabled={isLocked}
                className={`flex items-center justify-center transition-opacity ${
                  isLocked
                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                    : 'hover:opacity-70 text-slate-400'
                }`}
                title={isLocked ? 'Record is locked while analysis is in progress' : 'Edit record'}
              >
                <span className="material-symbols-outlined icon-sm">edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Locked banner — shown while an analysis is queued or in progress */}
        {isLocked && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 flex items-start gap-3">
            <span className="material-symbols-outlined icon-filled text-amber-500 shrink-0 mt-0.5" style={{ fontSize: 20 }}>
              lock
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Analysis in progress — editing is locked
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                {lockAnalysisType === 'hard_reanalyse'
                  ? 'A full re-analysis'
                  : 'A DPA date check'}
                {' '}has been queued
                {lockRequestedByName ? ` by ${lockRequestedByName}` : ''}.
                {' '}This record will be unlocked automatically once the analysis completes.
              </p>
            </div>
          </div>
        )}

        {/* Summary card — at_a_glance spans full width, no label column */}
        <ReadSection title="Summary">
          <div className="py-3">
            {doc.at_a_glance
              ? <p className="text-sm text-[#0f172a] leading-6 whitespace-pre-wrap">{doc.at_a_glance}</p>
              : <span className="text-sm text-slate-300">—</span>
            }
          </div>
        </ReadSection>

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
      {/* Poppins SemiBold 16px, border-b 1.4px #eff2f5 per Figma sidebar_selected style */}
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

// Read field row: flex gap-[56px], label w-[272px] text-[#64748b], value flex-1 text-[#0f172a]
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

// Edit field row: 3-column grid, label col 1, input spans col 2-3.
// Selects use appearance-none with a custom keyboard_arrow_down icon inside the box.
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
      <label className="text-sm font-medium text-[#45556c] pt-2">
        {field.label}
        {field.hint && (
          <span className="block text-xs text-slate-400 font-normal">{field.hint}</span>
        )}
      </label>
      {/* Wrapper is always relative so the custom select arrow can be absolutely positioned */}
      <div className="col-span-2 relative">
        {field.type === 'textarea' ? (
          <textarea
            value={displayValue}
            onChange={e => onChange(e.target.value)}
            rows={3}
            className="input resize-y text-sm"
          />
        ) : field.type === 'select' ? (
          <>
            <select
              value={displayValue}
              onChange={e => onChange(e.target.value)}
              className="input text-sm appearance-none pr-9"
            >
              <option value="">— select —</option>
              {field.options?.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <span className="material-symbols-outlined icon-lg absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              keyboard_arrow_down
            </span>
          </>
        ) : field.type === 'boolean' ? (
          <>
            <select
              value={value === true ? 'true' : value === false ? 'false' : ''}
              onChange={e =>
                onChange(
                  e.target.value === 'true'
                    ? true
                    : e.target.value === 'false'
                    ? false
                    : null,
                )
              }
              className="input text-sm appearance-none pr-9"
            >
              <option value="">— select —</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
            <span className="material-symbols-outlined icon-lg absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              keyboard_arrow_down
            </span>
          </>
        ) : field.type === 'toggle' ? (
          /* Toggle switch — ON (blue) when truthy, OFF (grey) when falsy */
          <div className="pt-1">
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(value)}
              onClick={() => onChange(!value)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                value ? 'bg-[#2c53ab]' : 'bg-slate-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                  value ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
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

// Shared confirmation modal — used for Analyse and Check DPA Date prompts
function ConfirmModal({
  title,
  children,
  onCancel,
  onConfirm,
  confirming = false,
}: {
  title: string
  children: React.ReactNode
  onCancel: () => void
  onConfirm: () => void
  confirming?: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-[8px] w-[540px] max-w-[90vw] px-6 py-12 flex flex-col gap-10">
        <div className="flex flex-col gap-[26px]">
          <h2 className="font-poppins font-semibold text-[24px] leading-[28px] text-black">
            {title}
          </h2>
          <div className="space-y-4 text-[16px] text-[#475569] leading-[23px]">
            {children}
          </div>
        </div>
        <div className="flex gap-[14px] items-center justify-end">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="border-2 border-[#1e293b] rounded-[8px] px-4 py-2 font-poppins font-semibold text-[14px] leading-5 text-[#1e293b] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="bg-[#2c53ab] rounded-[8px] px-4 py-2 font-poppins font-semibold text-[14px] leading-5 text-white disabled:opacity-60"
          >
            {confirming ? 'Queuing…' : 'Yes, continue'}
          </button>
        </div>
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
            // 3-column row: date | summary | user — top-aligned so long summaries
            // don't leave the date floating in the middle of the row
            <div key={change.id} className="flex items-start gap-14 py-3">
              {/* Date — Inter SemiBold 12px #0f172a tracking-[0.2px] w-[180px] */}
              <p className="text-[12px] font-semibold text-[#0f172a] tracking-[0.2px] w-[180px] shrink-0">
                {change.date_of_review
                  ? new Date(change.date_of_review).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
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
