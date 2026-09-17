import { cn } from "@/lib/utils"

/** A person's initial in a small circle. */
export function UserAvatar({ name, className }: { name?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[9px] font-semibold text-ink-muted ring-1 ring-hairline-strong",
        className
      )}
    >
      {name ? name[0].toUpperCase() : "?"}
    </span>
  )
}
