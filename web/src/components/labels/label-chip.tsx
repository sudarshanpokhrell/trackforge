import { cn } from '@/lib/utils'
import { Tag01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
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

/** A tag in the label's color on a faint wash of the same color. */
export function LabelIcon({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', className)}
      // Label colors are 6-digit hex, so a two-digit suffix sets the alpha.
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <HugeiconsIcon icon={Tag01Icon} className="size-3.5" />
    </span>
  )
}
