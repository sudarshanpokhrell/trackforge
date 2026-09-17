import { IssueList } from "@/components/issues/IssueList"
import { IssueDetail } from "@/components/issues/detail/issue-detail"
import { NewIssueDialog } from "@/components/issues/NewIssueDialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { cyclesQuery } from "@/hooks/use-cycles"
import { projectIssuesQuery } from "@/hooks/use-issues"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { IterationCcw, X } from "lucide-react"

export const Route = createFileRoute("/_authed/projects/$projectId/issues")({
  // ?issue=<id> opens that issue in the side peek, so it survives reloads and
  // the back button closes it. ?sprint=<id> shows only that sprint's issues.
  validateSearch: (search: Record<string, unknown>): { issue?: number; sprint?: number } => ({
    issue: positiveId(search.issue),
    sprint: positiveId(search.sprint),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  const { issue: peekId, sprint: sprintId } = Route.useSearch()
  const navigate = useNavigate()
  const pId = Number(projectId)
  const { data: issues, isPending, error } = useQuery(projectIssuesQuery(pId))
  const { data: sprints } = useQuery({ ...cyclesQuery(pId), enabled: sprintId !== undefined })
  const sprint = sprints?.find((s) => s.id === sprintId)

  const closePeek = () =>
    navigate({ to: ".", search: (prev) => ({ ...prev, issue: undefined }) })

  if (isPending) {
    return (
      <div className="flex flex-col gap-4 px-6 py-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-6 py-6 text-sm text-destructive">
        Failed to load issues.
      </div>
    )
  }

  return (
    <div className="flex h-full  flex-col px-6 py-6">
      <IssueList
        issues={sprintId === undefined ? issues : issues.filter((i) => i.cycle_id === sprintId)}
        showProject={false}
        projectId={pId}
        actions={
          <>
            {sprintId !== undefined && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border pr-1 pl-2.5 text-sm">
                <IterationCcw className="size-3.5 text-muted-foreground" />
                <span className="max-w-40 truncate">{sprint?.name ?? "Sprint"}</span>
                <button
                  type="button"
                  aria-label="Show all issues"
                  title="Show all issues"
                  onClick={() => navigate({ to: ".", search: (prev) => ({ ...prev, sprint: undefined }) })}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            )}
            <NewIssueDialog projectId={pId} />
          </>
        }
      />

      <Sheet open={peekId !== undefined} onOpenChange={(open) => !open && closePeek()}>
        <SheetContent
          aria-label="Issue"
          showCloseButton={false}
          className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
        >
          {peekId !== undefined && (
            <IssueDetail
              issueId={peekId}
              variant="peek"
              onClose={closePeek}
              onDeleted={closePeek}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function positiveId(value: unknown) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : undefined
}
