import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search } from 'lucide-react'

const mockIssues = [
  { id: 'SRS-1', title: 'Get familiar with Linear', status: 'Todo', priority: 'Medium' },
  { id: 'SRS-4', title: 'Set up your teams', status: 'Todo', priority: 'Low' },
  { id: 'SRS-2', title: 'Connect your tools', status: 'In Progress', priority: 'High' },
  { id: 'SRS-3', title: 'Import your data', status: 'Done', priority: 'Medium' },
]

export const Route = createFileRoute('/issues')({
  component: IssuesPage,
})

function IssuesPage() {
  const [search, setSearch] = useState('')
  const filtered = mockIssues.filter(issue =>
    issue.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Issues</h1>
        <Button size="sm" className="cursor-pointer">
          <Plus className="mr-1 size-4" />
          New issue
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search issues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">Filter</Button>
        <Button variant="outline" size="sm">Sort</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">
          <div className="col-span-1">ID</div>
          <div className="col-span-7">Title</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Priority</div>
        </div>
        {filtered.map((issue) => (
          <div key={issue.id} className="grid grid-cols-12 gap-4 border-b px-4 py-3 text-sm last:border-0 hover:bg-muted/30">
            <div className="col-span-1 font-mono text-xs">{issue.id}</div>
            <div className="col-span-7">{issue.title}</div>
            <div className="col-span-2">
              <Badge variant="outline">{issue.status}</Badge>
            </div>
            <div className="col-span-2">
              <Badge variant={issue.priority === 'High' ? 'destructive' : 'secondary'}>
                {issue.priority}
              </Badge>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-6 text-center text-muted-foreground">No issues found</div>
        )}
      </div>
    </div>
  )
}