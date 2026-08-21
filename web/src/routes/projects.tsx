import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search } from "lucide-react"

const mockProjects = [
  { id: 1, name: "TrackForge Dashboard", status: "Active", members: 4 },
  { id: 2, name: "API Gateway", status: "Planning", members: 2 },
]

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
})

function ProjectsPage() {
  const [search, setSearch] = useState("")
  const filtered = mockProjects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <Button size="sm">
          <Plus className="mr-1 size-4" />
          New project
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">
          <div className="col-span-6">Name</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-3">Members</div>
        </div>
        {filtered.map((project) => (
          <div
            key={project.id}
            className="grid grid-cols-12 gap-4 border-b px-4 py-3 text-sm last:border-0 hover:bg-muted/30"
          >
            <div className="col-span-6">{project.name}</div>
            <div className="col-span-3">
              <Badge variant="outline">{project.status}</Badge>
            </div>
            <div className="col-span-3">{project.members}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-6 text-center text-muted-foreground">
            No projects found
          </div>
        )}
      </div>
    </div>
  )
}
