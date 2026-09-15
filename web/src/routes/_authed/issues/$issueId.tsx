import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import { globalIssues, projectIssues } from "@/components/issues/data"
import { PRIORITY_LABELS, STATUS_LABELS } from "@/components/issues/types"

const allIssues = [...globalIssues, ...Object.values(projectIssues).flat()]

export const Route = createFileRoute("/_authed/issues/$issueId")({
  component: IssueDetailPage,
})

function IssueDetailPage() {
  const { issueId } = Route.useParams()
  const issue = allIssues.find((i) => i.id === issueId)

  if (!issue) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Issue not found
      </div>
    )
  }

  const isHighPriority = issue.priority === "urgent" || issue.priority === "high"

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
        <ArrowLeft className="mr-1 size-4" />
        Back
      </Button>
      <h1 className="text-2xl font-bold">{issue.title}</h1>
      <div className="flex gap-4">
        <span className="text-sm text-muted-foreground">
          Status: <Badge variant="outline">{STATUS_LABELS[issue.status]}</Badge>
        </span>
        <span className="text-sm text-muted-foreground">
          Priority:{" "}
          <Badge variant={isHighPriority ? "destructive" : "secondary"}>
            {PRIORITY_LABELS[issue.priority]}
          </Badge>
        </span>
      </div>
    </div>
  )
}
