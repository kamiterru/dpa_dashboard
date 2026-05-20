'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createAndQueueRecord } from '@/app/actions/records'

export default function NewRecordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await createAndQueueRecord(name.trim(), url.trim() || undefined)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push(`/records/${result.docId}`)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-6 text-[12px] text-[#64748b] tracking-[0.4px]">
        <Link href="/records" className="flex items-center gap-2 hover:text-slate-700">
          <span className="material-symbols-outlined icon-xs">arrow_left_alt</span>
          Records
        </Link>
        <span className="text-[#c7cdd6]">/</span>
        <span>New record</span>
      </div>

      <div className="bg-white rounded-xl px-6 py-8">
        <h1 className="font-poppins font-semibold text-[32px] leading-7 text-black mb-2">
          New record
        </h1>
        <p className="text-sm text-[#64748b] mb-8">
          Enter the company details below. An AI analysis will be queued immediately and you will
          receive an email when it is complete.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#45556c] mb-1">
              Company name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="input text-sm"
              placeholder="e.g. Dropbox"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#45556c] mb-1">
              DPA URL
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="input text-sm"
              placeholder="https://..."
            />
            <p className="mt-1.5 text-xs text-[#94a3b8]">
              A URL is not needed, but it will make the analysis process quicker.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2 justify-end">
            <Link
              href="/records"
              className="flex items-center justify-center rounded-[8px] px-5 py-2 font-poppins font-semibold text-[14px] leading-5 text-[#1e293b] border-2 border-[#1e293b] hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex items-center justify-center bg-[#2c53ab] rounded-[8px] px-5 py-2 font-poppins font-semibold text-[14px] leading-5 text-white disabled:opacity-50 transition-opacity hover:bg-[#1e3f8a]"
            >
              {loading ? 'Creating…' : 'Create record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
