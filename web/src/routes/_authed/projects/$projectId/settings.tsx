import { ProjectNotFound } from "@/components/projects/project-not-found"
import { DeleteProjectSection } from "@/components/projects/settings/delete-project-section"
import { LabelsSettings } from "@/components/projects/settings/labels-settings"
import { MembersSettings } from "@/components/projects/settings/members-settings"
import { OverviewSettings } from "@/components/projects/settings/overview-settings"
import { SprintsSettings } from "@/components/projects/settings/sprints-settings"
import { Skeleton } from "@/components/ui/skeleton"
import { TabBar, type TabBarItem } from "@/components/ui/tab-bar"
import { projectQuery } from "@/hooks/use-projects"
import { getErrorMessage, isApiError } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

export const Route = createFileRoute("/_authed/projects/$projectId/settings")({
  component: RouteComponent,
})

type Tab = "overview" | "labels" | "members" | "sprints"

const tabs: TabBarItem<Tab>[] = [
  { value: "overview", label: "Overview" },
  { value: "labels", label: "Labels" },
  { value: "members", label: "Members" },
  { value: "sprints", label: "Sprints" },
]

function RouteComponent() {
  const { projectId } = Route.useParams()
  const id = Number(projectId)
  const [tab, setTab] = useState<Tab>("overview")

  const {
    data: project,
    isPending,
    error,
  } = useQuery({
    ...projectQuery(id),
    enabled: Number.isInteger(id) && id > 0,
  })

  if (!Number.isInteger(id) || id <= 0) return <ProjectNotFound />

  if (isPending) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-40 w-full" />
      </main>
    )
  }

  if (error) {
    return isApiError(error, 404) ? (
      <ProjectNotFound />
    ) : (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-lg font-medium">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {getErrorMessage(error)}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex h-full max-w-5xl flex-col gap-10 px-6 py-8">
      <TabBar
        aria-label="Project settings"
        tabs={tabs}
        value={tab}
        onValueChange={setTab}
        className="border-b border-border pb-3"
      />

      {tab === "overview" && (
        <div className="flex flex-col gap-6">
          <OverviewSettings key={project.version} project={project} />
          {project.my_access.can_manage && <DeleteProjectSection project={project} />}
        </div>
      )}
      {tab === "labels" && <LabelsSettings projectId={id} canManage={project.my_access.can_manage} />}
      {tab === "members" && <MembersSettings project={project} />}
      {tab === "sprints" && <SprintsSettings />}
    </main>
  )
}
