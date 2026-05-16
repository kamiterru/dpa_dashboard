interface Props {
  status: string | null
}

// Colours taken directly from status_pill Figma component
const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  Compliant:       { bg: '#cdfbdd', color: '#166534', label: 'Compliant' },
  Complies:        { bg: '#cdfbdd', color: '#166534', label: 'Compliant' },
  'Not Compliant': { bg: '#ffd7d7', color: '#dd2222', label: 'Not compliant' },
  'Not Complies':  { bg: '#ffd7d7', color: '#dd2222', label: 'Not compliant' },
  Unclear:         { bg: '#fef3c7', color: '#d97706', label: 'Unclear' },
  'Not Assessed':  { bg: '#efefef', color: '#536072', label: 'Not assessed' },
  Failed:          { bg: '#ffd7d7', color: '#dd2222', label: 'Failed' },
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
