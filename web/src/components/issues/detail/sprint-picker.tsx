import { SprintStatusBadge } from "@/components/sprints/sprint-status"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cyclesQuery } from "@/hooks/use-cycles"
import { useUpdateIssue } from "@/hooks/use-issues"
import { getErrorMessage } from "@/lib/api"
import type { Issue } from "@/types/issues"
import { useQuery } from "@tanstack/react-query"
import { Check, IterationCcw } from "lucide-react"
import { toast } from "sonner"

/**
 * The issue's sprint, and a menu to move it. Only open sprints are offered, and
 * an issue in a completed sprint stays put: completed sprints are read-only.
 */
export function SprintPicker({ issue, enabled }: { issue: Issue; enabled: boolean }) {
  const { data: sprints = [] } = useQuery(cyclesQuery(issue.project_id))
  const updateIssue = useUpdateIssue(issue)

  const current = sprints.find((s) => s.id === issue.cycle_id)
  const open = sprints
    .filter((s) => s.status !== "completed")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  const label = (
    <span className="flex min-w-0 items-center gap-2">
      <IterationCcw className="size-4 shrink-0 text-muted-foreground" />
      <span className={current ? "truncate" : "text-muted-foreground"}>{current?.name ?? "No sprint"}</span>
    </span>
  )

  if (!enabled || current?.status === "completed") {
    return (
      <span className="flex min-w-0 items-center gap-2 px-1.5 py-1">
        {label}
        {current?.status === "completed" && <SprintStatusBadge status="completed" />}
      </span>
    )
  }

  const move = (cycleId: number | null) => {
    if (cycleId === issue.cycle_id) return
    updateIssue.mutate({ cycle_id: cycleId }, { onError: (e) => toast.error(getErrorMessage(e)) })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 transition-colors outline-none hover:bg-muted data-popup-open:bg-muted">
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Move to sprint</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => move(null)} className="gap-3">
            <span className="flex-1">No sprint</span>
            {issue.cycle_id === null && <Check className="size-3.5 text-muted-foreground" />}
          </DropdownMenuItem>
          {open.map((sprint) => (
            <DropdownMenuItem key={sprint.id} onClick={() => move(sprint.id)} className="gap-3">
              <span className="min-w-0 flex-1 truncate">{sprint.name}</span>
              <SprintStatusBadge status={sprint.status} />
              {issue.cycle_id === sprint.id && <Check className="size-3.5 text-muted-foreground" />}
            </DropdownMenuItem>
          ))}
          {open.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No open sprints.</p>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
