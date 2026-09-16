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
    </div>
  )
}
