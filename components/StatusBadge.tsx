import { Status } from '@/lib/types'

const statusConfig: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
  open: {
    label: 'Open',
    bg: 'bg-epicGreen/20',
    text: 'text-epicGreen',
    dot: 'bg-epicGreen',
  },
  busy: {
    label: 'Druk',
    bg: 'bg-epicGold/20',
    text: 'text-epicGold',
    dot: 'bg-epicGold',
  },
  closed: {
    label: 'Gesloten',
    bg: 'bg-inkBlack/10',
    text: 'text-inkBlack/50',
    dot: 'bg-inkBlack/30',
  },
}

interface StatusBadgeProps {
  status: Status
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border border-inkBlack/20 ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
