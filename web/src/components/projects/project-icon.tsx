import { cn } from "@/lib/utils"
import { CubeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

/**
 * A project's emoji, or the generic project icon when it has none. Size it with
 * `className` (e.g. `size-4 text-sm`); it applies to either.
 */
export function ProjectIcon({
  emoji,
  className,
}: {
  emoji?: string
  className?: string
}) {
  if (!emoji) return <HugeiconsIcon icon={CubeIcon} className={className} />

  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center leading-none", className)}
    >
      {emoji}
    </span>
  )
}
