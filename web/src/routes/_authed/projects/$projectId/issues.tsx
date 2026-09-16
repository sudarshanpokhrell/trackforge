import { IssueList } from "@/components/issues/IssueList"
import { projectIssuesQuery } from "@/hooks/use-issues"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { NewIssueDialog } from "@/components/issues/NewIssueDialog"

export const Route = createFileRoute("/_authed/projects/$projectId/issues")({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  const pId = Number(projectId)
  const { data: issues, isPending, error } = useQuery(projectIssuesQuery(pId))

  if (isPending) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Failed to load issues.
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-headline">Issues</h2>
        <NewIssueDialog projectId={pId} />
      </div>
      <IssueList issues={issues || []} showProject={false} />
    </div>
  )
}
