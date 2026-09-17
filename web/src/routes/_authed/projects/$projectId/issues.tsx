import { IssueList } from "@/components/issues/IssueList"
import { IssueDetail } from "@/components/issues/detail/issue-detail"
import { NewIssueDialog } from "@/components/issues/NewIssueDialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { projectIssuesQuery } from "@/hooks/use-issues"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

export const Route = createFileRoute("/_authed/projects/$projectId/issues")({
  // ?issue=<id> opens that issue in the side peek, so it survives reloads and
  // the back button closes it.
  validateSearch: (search: Record<string, unknown>): { issue?: number } => {
    const issue = Number(search.issue)
    return { issue: Number.isInteger(issue) && issue > 0 ? issue : undefined }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  const { issue: peekId } = Route.useSearch()
  const navigate = useNavigate()
  const pId = Number(projectId)
  const { data: issues, isPending, error } = useQuery(projectIssuesQuery(pId))

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
    <div className="flex h-full flex-col px-6 py-6">
      <IssueList
        issues={issues}
        showProject={false}
        projectId={pId}
        actions={<NewIssueDialog projectId={pId} />}
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
