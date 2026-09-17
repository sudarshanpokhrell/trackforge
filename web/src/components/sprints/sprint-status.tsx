import { fromApiDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { Cycle, CycleStatus } from "@/types/cycles"
import { format } from "date-fns"

const STATUS: Record<CycleStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-primary/12 text-primary" },
  upcoming: { label: "Upcoming", className: "bg-foreground/8 text-muted-foreground" },
  overdue: { label: "Overdue", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  completed: { label: "Completed", className: "bg-success/12 text-success" },
}

export function SprintStatusBadge({ status, className }: { status: CycleStatus; className?: string }) {
  const { label, className: tone } = STATUS[status]
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-medium",
        tone,
        className
      )}
    >
      {label}
    </span>
  )
}

/** "1 Sep – 14 Sep 2026", with the year once when both dates share it. */
export function formatSprintDates(sprint: Pick<Cycle, "start_date" | "end_date">) {
  const start = fromApiDate(sprint.start_date)
  const end = fromApiDate(sprint.end_date)
  if (!start || !end) return ""
  const sameYear = start.getFullYear() === end.getFullYear()
  return `${format(start, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`
}

/** Done out of all issues, leaving cancelled ones out of the total. */
export function sprintProgress(sprint: Pick<Cycle, "issue_counts">) {
  const counts = sprint.issue_counts
  const all = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0)
  const total = all - (counts.cancelled ?? 0)
  const done = counts.done ?? 0
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}

/** Open means not done and not cancelled: what completing a sprint moves on. */
export function openIssueCount(sprint: Pick<Cycle, "issue_counts">) {
  const counts = sprint.issue_counts
  const all = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0)
  return all - (counts.done ?? 0) - (counts.cancelled ?? 0)
}

export function SprintProgress({ sprint }: { sprint: Pick<Cycle, "issue_counts"> }) {
  const { done, total, percent } = sprintProgress(sprint)

  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Sprint progress"
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/8"
      >
        <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {total === 0 ? "No issues" : `${done} of ${total} done · ${percent}%`}
      </span>
    </div>
  )
}
