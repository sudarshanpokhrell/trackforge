import { createFileRoute } from '@tanstack/react-router'
import { Users, GitBranch, Clock, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/workspace')({
  component: WorkspacePage,
})

function WorkspacePage() {
  return (
    <div className="space-y-6">
      {/* Workspace header with gradient */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 via-primary/5 to-background p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
        <p className="text-sm text-muted-foreground">Manage your team and project settings</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">5 members</span>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">12 projects</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Updated 2h ago</span>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="default">Invite members</Button>
          <Button size="sm" variant="outline">
            <Settings className="mr-1 size-3" />
            Settings
          </Button>
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Recent activity</h2>
        </div>
        <div className="divide-y">
          {[
            { user: 'Alice', action: 'created issue SRS-12', time: '2h ago' },
            { user: 'Bob', action: 'commented on SRS-9', time: '4h ago' },
            { user: 'Charlie', action: 'closed issue SRS-7', time: '6h ago' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                <span className="font-medium">{item.user}</span> {item.action}
              </span>
              <span className="text-xs text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}