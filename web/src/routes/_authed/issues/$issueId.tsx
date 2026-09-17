import { IssueDetail } from "@/components/issues/detail/issue-detail"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

export const Route = createFileRoute("/_authed/issues/$issueId")({
  component: IssueDetailPage,
})

function IssueDetailPage() {
  const { issueId } = Route.useParams()
  const navigate = useNavigate()

  return (
    <IssueDetail
      issueId={Number(issueId)}
      variant="page"
      onDeleted={(issue) =>
        navigate({
          to: "/projects/$projectId/issues",
          params: { projectId: String(issue.project_id) },
          replace: true,
        })
      }
    />
  )
}
