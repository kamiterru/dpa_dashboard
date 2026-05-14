'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createRecord } from '@/app/actions/records'

export default function NewRecordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    legal_name: '',
    url_link: '',
    products: '',
    product_description: '',
    location: '',
  })

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await createRecord({
      name: form.name,
      legal_name: form.legal_name || undefined,
      url_link: form.url_link || undefined,
      products: form.products || undefined,
      product_description: form.product_description || undefined,
      location: form.location ? form.location.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push(`/records/${result.docId}`)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/records" className="text-sm text-slate-500 hover:text-slate-700">
          ← Records
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-semibold text-slate-900">New record</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <p className="text-sm text-slate-500 mb-6">
          Enter the organisation details. Once saved, you can request an AI analysis to populate the
          DPA fields automatically.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Display name *" required>
            <input
              type="text"
              required
              value={form.name}
              onChange={set('name')}
              className="input"
              placeholder="e.g. Dropbox"
            />
          </Field>
          <Field label="Legal name">
            <input
              type="text"
              value={form.legal_name}
              onChange={set('legal_name')}
              className="input"
              placeholder="e.g. Dropbox, Inc."
            />
          </Field>
          <Field label="DPA / privacy URL">
            <input
              type="url"
              value={form.url_link}
              onChange={set('url_link')}
              className="input"
              placeholder="https://..."
            />
          </Field>
          <Field label="Product name">
            <input
              type="text"
              value={form.products}
              onChange={set('products')}
              className="input"
              placeholder="e.g. Cloud Storage"
            />
          </Field>
          <Field label="Product description">
            <textarea
              value={form.product_description}
              onChange={set('product_description')}
              rows={2}
              className="input resize-none"
              placeholder="One sentence describing what the product does"
            />
          </Field>
          <Field label="Location(s)" hint="Comma-separated, e.g. US, Ireland">
            <input
              type="text"
              value={form.location}
              onChange={set('location')}
              className="input"
              placeholder="US, Ireland"
            />
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Creating…' : 'Create record'}
            </button>
            <Link
              href="/records"
              className="rounded-lg px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {hint && <span className="ml-1 font-normal text-slate-400">({hint})</span>}
      </label>
      {children}
    </div>
  )
}
