interface Props {
  status: string | null
}

const STATUS_STYLES: Record<string, string> = {
  Compliant: 'bg-green-100 text-green-800',
  Complies: 'bg-green-100 text-green-800',
  'Not Compliant': 'bg-red-100 text-red-800',
  'Not Complies': 'bg-red-100 text-red-800',
  Unclear: 'bg-amber-100 text-amber-800',
  'Not Assessed': 'bg-slate-100 text-slate-600',
  Failed: 'bg-red-200 text-red-900',
}

export function StatusBadge({ status }: Props) {
  const label = status ?? 'Not Assessed'
  const styles = STATUS_STYLES[label] ?? 'bg-slate-100 text-slate-600'

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {label}
    </span>
  )
}
