import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trash2 } from "lucide-react"
import { PRIORITY_LABELS, STATUS_LABELS } from "@/types/issues"
import { useQuery } from "@tanstack/react-query"
import { issueQuery, useDeleteIssue } from "@/hooks/use-issues"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { IssueLabels } from "@/components/labels/issue-labels"

export const Route = createFileRoute("/_authed/issues/$issueId")({
  component: IssueDetailPage,
})

function IssueDetailPage() {
  const { issueId } = Route.useParams()
  const navigate = useNavigate()
  
  const { data: issue, isPending, error } = useQuery(issueQuery(Number(issueId)))
  
  // Create a separate component/hook call to avoid calling useDeleteIssue conditionally.
  // Actually we can just call it unconditionally and rely on issue to be loaded before calling mutate.
  // Wait, useDeleteIssue needs projectId. But issue.project_id might be undefined initially.
  // We can pass a dummy project id like 0 and provide the real one when deleting.
  // Actually, useDeleteIssue returns a mutation function. We can just wait for issue to load.
  // We can pass 0 initially.
  
  const { mutateAsync: deleteIssue, isPending: isDeleting } = useDeleteIssue(issue?.project_id || 0)

  if (isPending) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Issue not found
      </div>
    )
  }

  const isHighPriority = issue.priority === "urgent" || issue.priority === "high"

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this issue?")) return
    try {
      await deleteIssue(issue.id)
      toast.success("Issue deleted successfully")
      navigate({ to: "/projects/$projectId/issues", params: { projectId: issue.project_id.toString() } })
    } catch (err) {
      toast.error("Failed to delete issue")
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
          <Trash2 className="mr-1 size-4" />
          Delete
        </Button>
      </div>
      <h1 className="text-headline">{issue.title}</h1>
      <div className="flex gap-4">
        <span className="text-sm text-muted-foreground flex gap-2 items-center">
          Status: <Badge variant="outline">{STATUS_LABELS[issue.status]}</Badge>
        </span>
        <span className="text-sm text-muted-foreground flex gap-2 items-center">
          Priority:{" "}
          <Badge variant={isHighPriority ? "destructive" : "secondary"}>
            {PRIORITY_LABELS[issue.priority]}
          </Badge>
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Labels: <IssueLabels issue={issue} />
      </div>
    </div>
  )
}
