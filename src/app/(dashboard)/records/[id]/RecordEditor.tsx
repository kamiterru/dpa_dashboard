'use client'

import { useState } from 'react'
import Link from 'next/link'
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
}

// ─── Field definitions ───────────────────────────────────────────────────────

const ORG_FIELDS = [
  { key: 'name', label: 'Display name', type: 'text' },
  { key: 'legal_name', label: 'Legal name', type: 'text' },
  { key: 'url_link', label: 'DPA / Privacy URL', type: 'url' },
  { key: 'products', label: 'Product name', type: 'text' },
  { key: 'product_description', label: 'Product description', type: 'textarea' },
  { key: 'data_types', label: 'Data types processed', type: 'textarea' },
  { key: 'location', label: 'Location(s)', type: 'text', hint: 'Comma-separated' },
  { key: 'include_entity', label: 'Includes subsidiaries?', type: 'boolean' },
]

const DOC_SECTIONS = [
  {
    title: 'DPA Overview',
    fields: [
      { key: 'dpa_date', label: 'DPA date', type: 'date' },
      { key: 'dpa_date_notes', label: 'Date notes', type: 'textarea' },
      { key: 'jurisdiction_summary', label: 'Jurisdiction summary', type: 'textarea' },
      { key: 'current_status', label: 'Status', type: 'select', options: ['Compliant', 'Not Compliant', 'Unclear', 'Not Assessed', 'Failed'] },
    ],
  },
  {
    title: 'Data Storage & Transfers',
    fields: [
      { key: 'data_held_summary', label: 'Data held summary', type: 'textarea' },
      { key: 'transfer_out_choice', label: 'Transfer outside EEA/UK', type: 'select', options: ['Yes', 'No', 'With consent'] },
      { key: 'SSC_in_place', label: 'SCCs in place', type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'SSC_summary', label: 'SCCs summary', type: 'textarea' },
    ],
  },
  {
    title: 'Security & Sub-processors',
    fields: [
      { key: 'tech_measures', label: 'Technical measures', type: 'textarea' },
      { key: 'tech_measure_contractual', label: 'Measures contractually binding', type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'tech_measure_details', label: 'Measures details (if Unclear)', type: 'textarea' },
      { key: 'sub_processor_auth', label: 'Sub-processor authorisation', type: 'select', options: ['General', 'Specific', 'Unclear'] },
      { key: 'sub_auth_details', label: 'Sub-processor details', type: 'textarea' },
      { key: 'flowdown', label: 'Obligations flow to sub-processors', type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'flowdown_details', label: 'Flowdown details', type: 'textarea' },
    ],
  },
  {
    title: 'Rights & Obligations',
    fields: [
      { key: 'process_on_instruction', label: 'Process on instruction only', type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'instruction_details', label: 'Instruction details', type: 'textarea' },
      { key: 'rights_assistance', label: 'Data subject rights assistance', type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'rights_assistance_details', label: 'Rights assistance details', type: 'textarea' },
      { key: 'staff_conf', label: 'Staff confidentiality obligations', type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'staff_conf_details', label: 'Staff confidentiality details', type: 'textarea' },
      { key: 'data_breach_notice', label: 'Data breach notice', type: 'textarea' },
      { key: 'data_termination', label: 'Data on termination', type: 'textarea' },
    ],
  },
  {
    title: 'Audit & Governance',
    fields: [
      { key: 'audit_rights_type', label: 'Audit rights', type: 'select', options: ['Yes', 'No', 'Unclear', 'Structured'] },
      { key: 'audit_rights_summary', label: 'Audit rights summary', type: 'textarea' },
      { key: 'assistance', label: 'DPIA assistance', type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'assistance_details', label: 'DPIA assistance details', type: 'textarea' },
      { key: 'dpa_incorp', label: 'DPA incorporated into contract', type: 'select', options: ['Yes', 'No', 'Unclear'] },
      { key: 'dpa_incorp_details', label: 'Incorporation details', type: 'textarea' },
    ],
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function RecordEditor({ doc, org, changes, canEdit }: Props) {
  const [orgState, setOrgState] = useState<AnyRecord>({ ...org })
  const [docState, setDocState] = useState<AnyRecord>({ ...doc })
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [analysisUrl, setAnalysisUrl] = useState(org?.url_link ?? '')
  const [analysisQueued, setAnalysisQueued] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  function updateOrg(key: string, value: unknown) {
    setOrgState(s => ({ ...s, [key]: value }))
    setIsDirty(true)
    setSaveSuccess(false)
  }

  function updateDoc(key: string, value: unknown) {
    setDocState(s => ({ ...s, [key]: value }))
    setIsDirty(true)
    setSaveSuccess(false)
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
      setSaveSuccess(true)
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

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/records" className="text-sm text-slate-500 hover:text-slate-700">
              ← Records
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-500">{orgState.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{orgState.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {orgState.legal_name && `${orgState.legal_name} · `}
            {orgState.products}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={docState.current_status} />
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>
      </div>

      {saveError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{saveError}</div>
      )}
      {saveSuccess && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-2">
          Changes saved successfully.
        </div>
      )}

      {/* Organisation details */}
      <Section title="Organisation">
        <FieldGrid>
          {ORG_FIELDS.map(field => (
            <FieldRow
              key={field.key}
              field={field}
              value={orgState[field.key]}
              canEdit={canEdit}
              onChange={v => updateOrg(field.key, v)}
            />
          ))}
        </FieldGrid>
      </Section>

      {/* DPA document sections */}
      {DOC_SECTIONS.map(section => (
        <Section key={section.title} title={section.title}>
          <FieldGrid>
            {section.fields.map(field => (
              <FieldRow
                key={field.key}
                field={field}
                value={docState[field.key]}
                canEdit={canEdit}
                onChange={v => updateDoc(field.key, v)}
              />
            ))}
          </FieldGrid>
        </Section>
      ))}

      {/* Request analysis */}
      {canEdit && (
        <Section title="AI Analysis">
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Queue a re-analysis of this DPA. The analysis will be picked up and run against the
              live document at the URL below.
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
            {analysisError && (
              <p className="text-sm text-red-600">{analysisError}</p>
            )}
          </div>
        </Section>
      )}

      {/* Change history */}
      <Section title="Change history">
        {changes.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">No changes recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {changes.map(change => (
              <div key={change.id} className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {change.status ?? 'Update'}
                    </span>
                    {change.needs_review && (
                      <span className="text-xs text-amber-600">⚠ Needs review</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {change.date_of_review
                      ? new Date(change.date_of_review).toLocaleString('en-GB', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                    {change.changed_by && (
                      <span className="ml-2 text-slate-400">
                        · {change.changed_by === 'system' ? 'System' : `User ${change.changed_by.slice(0, 8)}…`}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-600">{change.summary_changes}</p>
                {change.needs_review && change.need_review_reason && (
                  <p className="text-xs text-amber-700 mt-1">{change.need_review_reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>
}

interface FieldDef {
  key: string
  label: string
  type: string
  options?: string[]
  hint?: string
}

function FieldRow({
  field,
  value,
  canEdit,
  onChange,
}: {
  field: FieldDef
  value: unknown
  canEdit: boolean
  onChange: (v: unknown) => void
}) {
  const displayValue = value === null || value === undefined ? '' : String(value)

  if (!canEdit) {
    return (
      <div className="grid grid-cols-3 gap-4 items-start">
        <dt className="text-sm font-medium text-slate-500 pt-0.5">{field.label}</dt>
        <dd className="col-span-2 text-sm text-slate-900 break-words">
          {field.type === 'boolean'
            ? value === true ? 'Yes' : value === false ? 'No' : '—'
            : displayValue || <span className="text-slate-300">—</span>}
        </dd>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4 items-start">
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
