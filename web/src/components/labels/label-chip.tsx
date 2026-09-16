import { cn } from '@/lib/utils'
import type { LabelSummary } from '@/types/issues'

export function LabelDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('size-2 shrink-0 rounded-full', className)}
      style={{ backgroundColor: color }}
    />
  )
}

export function LabelChip({ label, className }: { label: LabelSummary; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-40 shrink-0 items-center gap-1.5 rounded-full border border-border px-2 text-xs text-ink-muted',
        className
      )}
      title={label.name}
    >
      <LabelDot color={label.color} />
      <span className="truncate">{label.name}</span>
    </span>
  )
}
