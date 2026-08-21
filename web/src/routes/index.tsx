import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import axios from "axios"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/")({
  component: HomeComponent,
})

function HomeComponent() {
  const [data, setData] = React.useState<Record<string, unknown> | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const checkHealth = async () => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const response = await axios.get("/api/v1/health")
      setData(response.data)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unknown error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Health Check</h1>
          <p className="text-sm text-muted-foreground">
            Click the button  to fetch <code>/api/v1/health</code>
          </p>
        </div>

        <Button onClick={checkHealth} disabled={loading} className="cursor-pointer">
          {loading ? "Checking..." : "Check Backend Health"}
        </Button>

        {data && (
          <div className="rounded-lg">
            <h2 className="font-semibold text-primary text-sm mb-2">
              Success Response:
            </h2>
            <pre className="font-mono text-sm overflow-x-auto p-3 rounded">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <h2 className="font-semibold text-sm mb-1">Error:</h2>
            <p className="text-sm ">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
