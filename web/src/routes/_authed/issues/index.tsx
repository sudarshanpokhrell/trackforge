import { createFileRoute } from '@tanstack/react-router'
import { Ticket } from 'lucide-react'

export const Route = createFileRoute('/_authed/issues/')({
  component: IssuesPage,
})

function IssuesPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center">
      <div className="rounded-full bg-muted p-4">
        <Ticket className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">My Issues</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        This feature is coming soon! You will be able to see all your assigned issues across all projects here.
      </p>
    </div>
  )
}
