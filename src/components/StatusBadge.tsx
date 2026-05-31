interface Props {
  status: string | null
}

// Colours taken directly from status_pill Figma component
const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  // Current status values
  'GDPR Addressed':  { bg: '#cdfbdd', color: '#166534', label: 'GDPR Addressed' },
  'Data Use Review': { bg: '#ede9fe', color: '#6d28d9', label: 'Data Use Review' },
  'Needs Review':    { bg: '#fef3c7', color: '#d97706', label: 'Needs Review' },
  'Gaps Identified': { bg: '#ffd7d7', color: '#dd2222', label: 'Gaps Identified' },
  'Not Assessed':    { bg: '#efefef', color: '#536072', label: 'Not assessed' },
  Failed:            { bg: '#ffd7d7', color: '#dd2222', label: 'Failed' },
  // Legacy aliases (existing DB records)
  Compliant:         { bg: '#cdfbdd', color: '#166534', label: 'GDPR Addressed' },
  Complies:          { bg: '#cdfbdd', color: '#166534', label: 'GDPR Addressed' },
  'Not Compliant':   { bg: '#ffd7d7', color: '#dd2222', label: 'Gaps Identified' },
  'Not Complies':    { bg: '#ffd7d7', color: '#dd2222', label: 'Gaps Identified' },
  Unclear:           { bg: '#fef3c7', color: '#d97706', label: 'Needs Review' },
}

const DEFAULT_STYLE = { bg: '#efefef', color: '#536072', label: 'Not assessed' }

export function StatusBadge({ status }: Props) {
  const s = STATUS_STYLES[status ?? ''] ?? DEFAULT_STYLE
  return (
    <span
      className="inline-flex items-center px-3 py-1 text-xs font-semibold font-inter"
      style={{
        backgroundColor: s.bg,
        color: s.color,
        borderRadius: '6px',
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  )
}
