import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2 } from "lucide-react"
import { issuesApi } from "../services/api"
import type { AxiosResponse, AxiosError } from "axios"

type Issue = {
  id: string
  title: string
  status: string
  priority: string
  description?: string
}

export const Route = createFileRoute("/issues/$issueId")({
  component: IssueDetailPage,
})

function IssueDetailPage() {
  const { issueId } = Route.useParams()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    issuesApi
      .getOne(issueId)
      .then((response: AxiosResponse) => {
        setIssue(response.data)
        setError(null)
      })
      .catch((err: AxiosError<{ message?: string }>) => {
        setError(
          err.response?.data?.message || err.message || "Failed to fetch issue"
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }, [issueId])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <p className="text-sm font-medium">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Issue not found
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
        <ArrowLeft className="mr-1 size-4" />
        Back
      </Button>
      <h1 className="text-2xl font-bold">{issue.title}</h1>
      <div className="flex gap-4">
        <span className="text-sm text-muted-foreground">
          Status: <Badge variant="outline">{issue.status}</Badge>
        </span>
        <span className="text-sm text-muted-foreground">
          Priority:{" "}
          <Badge
            variant={issue.priority === "High" ? "destructive" : "secondary"}
          >
            {issue.priority}
          </Badge>
        </span>
      </div>
      {issue.description && <p className="text-sm">{issue.description}</p>}
    </div>
  )
}
