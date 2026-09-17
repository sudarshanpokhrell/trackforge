import { DeleteDialog } from "@/components/delete-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cyclesQuery, useDeleteCycle } from "@/hooks/use-cycles"
import { getErrorMessage } from "@/lib/api"
import type { Cycle } from "@/types/cycles"
import type { ProjectDetails } from "@/types/projects"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { CircleCheck, IterationCcw, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CompleteSprintDialog } from "./complete-sprint-dialog"
import { SprintDialog } from "./sprint-dialog"
import { formatSprintDates, SprintProgress, SprintStatusBadge } from "./sprint-status"

/** A project's sprints: current, upcoming and completed, each with progress. */
export function SprintsView({ project }: { project: ProjectDetails }) {
  const [creating, setCreating] = useState(false)
  const { data: sprints, isPending, error } = useQuery(cyclesQuery(project.id))

  if (!project.cycles_enabled) {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <IterationCcw className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Sprints are turned off</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {project.my_access.can_manage
              ? "Turn them on in this project's settings to plan work in time-boxed iterations."
              : "A project admin can turn them on in this project's settings."}
          </p>
          {project.my_access.can_manage && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              nativeButton={false}
              render={
                <Link
                  to="/projects/$projectId/settings"
                  params={{ projectId: String(project.id) }}
                  search={{ tab: "sprints" }}
                />
              }
            >
              Open settings
            </Button>
          )}
        </div>
      </div>
    )
  }

  const all = sprints ?? []
  const byStart = (a: Cycle, b: Cycle) => a.start_date.localeCompare(b.start_date)
  const current = all.filter((s) => s.status === "active" || s.status === "overdue").sort(byStart)
  const upcoming = all.filter((s) => s.status === "upcoming").sort(byStart)
  // The server lists latest first, which is the order completed sprints read best in.
  const completed = all.filter((s) => s.status === "completed")

  return (
    <div className="flex flex-col gap-8">
      <Header
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus />
            New sprint
          </Button>
        }
      />

      {isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      ) : all.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground">No sprints yet</p>
          <p className="text-sm text-muted-foreground">Create one to start planning.</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setCreating(true)}>
            <Plus />
            New sprint
          </Button>
        </div>
      ) : (
        <>
          <SprintGroup title="Current" sprints={current} all={all} projectId={project.id} />
          <SprintGroup title="Upcoming" sprints={upcoming} all={all} projectId={project.id} />
          <SprintGroup title="Completed" sprints={completed} all={all} projectId={project.id} />
        </>
      )}

      <SprintDialog projectId={project.id} sprints={all} open={creating} onOpenChange={setCreating} />
    </div>
  )
}

function Header({ action }: { action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Sprints</h1>
        <p className="text-sm text-muted-foreground">Plan and track work in time-boxed iterations.</p>
      </div>
      {action}
    </div>
  )
}

function SprintGroup({
  title,
  sprints,
  all,
  projectId,
}: {
  title: string
  sprints: Cycle[]
  all: Cycle[]
  projectId: number
}) {
  if (sprints.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
        {title}
        <span className="text-xs text-muted-foreground tabular-nums">{sprints.length}</span>
      </h2>
      <ul className="flex flex-col gap-3">
        {sprints.map((sprint) => (
          <SprintCard key={sprint.id} sprint={sprint} all={all} projectId={projectId} />
        ))}
      </ul>
    </section>
  )
}

function SprintCard({ sprint, all, projectId }: { sprint: Cycle; all: Cycle[]; projectId: number }) {
  const [editing, setEditing] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const deleteSprint = useDeleteCycle(projectId)
  const open = sprint.status !== "completed"

  const onDelete = async () => {
    try {
      await deleteSprint.mutateAsync(sprint.id)
      toast.success(`${sprint.name} deleted.`)
      setDeleting(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            to="/projects/$projectId/issues"
            params={{ projectId: String(projectId) }}
            search={{ sprint: sprint.id }}
            className="truncate text-sm font-medium text-foreground hover:underline"
          >
            {sprint.name}
          </Link>
          <SprintStatusBadge status={sprint.status} />
          <span className="text-xs text-muted-foreground">{formatSprintDates(sprint)}</span>
        </div>

        {/* Overdue sprints get the nudge the plan asks for: a visible way to finish them. */}
        {sprint.status === "overdue" && (
          <Button size="sm" variant="outline" onClick={() => setCompleting(true)}>
            Complete
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Manage ${sprint.name}`}
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {open && (
              <>
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCompleting(true)}>
                  <CircleCheck className="size-4" />
                  Complete sprint
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sprint.description && (
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{sprint.description}</p>
      )}

      <SprintProgress sprint={sprint} />

      {open && (
        <>
          <SprintDialog
            projectId={projectId}
            sprints={all}
            sprint={sprint}
            open={editing}
            onOpenChange={setEditing}
          />
          <CompleteSprintDialog
            projectId={projectId}
            sprint={sprint}
            sprints={all}
            open={completing}
            onOpenChange={setCompleting}
          />
        </>
      )}
      <DeleteDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${sprint.name}?`}
        description="Its issues stay, with no sprint."
        onConfirm={onDelete}
        pending={deleteSprint.isPending}
      />
    </li>
  )
}
