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
import { createFileRoute, useNavigate } from "@tanstack/react-router"

type Tab = "overview" | "labels" | "members" | "sprints"

const tabs: TabBarItem<Tab>[] = [
  { value: "overview", label: "Overview" },
  { value: "labels", label: "Labels" },
  { value: "members", label: "Members" },
  { value: "sprints", label: "Sprints" },
]

export const Route = createFileRoute("/_authed/projects/$projectId/settings")({
  // Optional, so links here needn't pass it. An unknown ?tab= is dropped rather
  // than matching no panel and leaving the page blank.
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => ({
    tab: tabs.find((t) => t.value === search.tab)?.value,
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  const id = Number(projectId)

  const { tab = "overview" } = Route.useSearch()
  const navigate = useNavigate()

  const {
    data: project,
    isPending,
    error,
  } = useQuery({
    ...projectQuery(id),
    enabled: Number.isInteger(id) && id > 0,
  })

  const handleTabChange = (next: Tab) => {
    navigate({ to: ".", search: (prev) => ({ ...prev, tab: next }) })
  }

  if (!Number.isInteger(id) || id <= 0) return <ProjectNotFound />

  if (isPending) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-10">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-40 w-full" />
      </main>
    )
  }

  if (error) {
    return isApiError(error, 404) ? (
      <ProjectNotFound />
    ) : (
      <main className="mx-auto max-w-3xl px-8 py-16 text-center">
        <h1 className="text-lg font-medium">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {getErrorMessage(error)}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex h-full max-w-6xl flex-col gap-10 px-8 py-10">
      <TabBar
        aria-label="Project settings"
        tabs={tabs}
        value={tab}
        onValueChange={handleTabChange}
        className="border-b border-border pb-3"
      />

      {tab === "overview" && (
        <div className="flex flex-col gap-6">
          <OverviewSettings key={project.version} project={project} />
          {project.my_access.can_manage && (
            <DeleteProjectSection project={project} />
          )}
        </div>
      )}
      {tab === "labels" && (
        <LabelsSettings
          projectId={id}
          canManage={project.my_access.can_manage}
        />
      )}
      {tab === "members" && <MembersSettings project={project} />}
      {tab === "sprints" && <SprintsSettings project={project} />}
    </main>
  )
}
