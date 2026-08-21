import { createFileRoute, Link } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { NewIssueDialog } from "@/components/issues/NewIssueDialog"
import { Search, Loader2 } from "lucide-react"
import { issuesApi } from "../services/api"
import type { AxiosResponse, AxiosError } from "axios"

type Issue = {
  id: string
  title: string
  status: string
  priority: string
}

// Mock data fallback (remove when backend is ready)
const mockIssues: Issue[] = [
  {
    id: "SRS-1",
    title: "Get familiar with Linear",
    status: "Todo",
    priority: "Medium",
  },
  { id: "SRS-4", title: "Set up your teams", status: "Todo", priority: "Low" },
  {
    id: "SRS-2",
    title: "Connect your tools",
    status: "In Progress",
    priority: "High",
  },
  {
    id: "SRS-3",
    title: "Import your data",
    status: "Done",
    priority: "Medium",
  },
]

export const Route = createFileRoute("/issues")({
  component: IssuesPage,
})

function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    // Toggle this to use mock data when backend is unavailable
    const USE_MOCK = false

    if (USE_MOCK) {
      setIssues(mockIssues)
      setLoading(false)
      return
    }

    issuesApi
      .getAll()
      .then((response: AxiosResponse) => {
        setIssues(response.data)
        setError(null)
      })
      .catch((err: AxiosError<{ message?: string }>) => {
        // Use optional chaining and fallback message
        setError(
          err.response?.data?.message || err.message || "Failed to fetch issues"
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredIssues = issues.filter((issue) =>
    issue.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Issues</h1>
        <NewIssueDialog
          onSuccess={() => {
            // For now, we'll just log
            console.log("Issue created, refresh list")
          }}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search issues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          Filter
        </Button>
        <Button variant="outline" size="sm">
          Sort
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <p className="text-sm font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && issues.length === 0 && (
        <div className="rounded-lg border bg-card py-12 text-center">
          <p className="text-muted-foreground">
            No issues found. Create your first issue!
          </p>
        </div>
      )}

      {!loading && !error && issues.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-1">ID</div>
            <div className="col-span-7">Title</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Priority</div>
          </div>
          {filteredIssues.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No matching issues
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="grid grid-cols-12 gap-4 border-b px-4 py-3 text-sm last:border-0 hover:bg-muted/30"
              >
                <div className="col-span-1 font-mono text-xs">{issue.id}</div>
                <div className="col-span-7">
                  <Link
                    to="/issues/$issueId"
                    params={{ issueId: issue.id }}
                    className="hover:underline"
                  >
                    {issue.title}
                  </Link>
                </div>
                <div className="col-span-2">
                  <Badge variant="outline">{issue.status}</Badge>
                </div>
                <div className="col-span-2">
                  <Badge
                    variant={
                      issue.priority === "High" ? "destructive" : "secondary"
                    }
                  >
                    {issue.priority}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
