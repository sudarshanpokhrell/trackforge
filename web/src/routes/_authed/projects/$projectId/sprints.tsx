import { ProjectNotFound } from "@/components/projects/project-not-found"
import { SprintsView } from "@/components/sprints/sprints-view"
import { Skeleton } from "@/components/ui/skeleton"
import { projectQuery } from "@/hooks/use-projects"
import { getErrorMessage, isApiError } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authed/projects/$projectId/sprints")({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  const id = Number(projectId)
  const valid = Number.isInteger(id) && id > 0
  const { data: project, isPending, error } = useQuery({ ...projectQuery(id), enabled: valid })

  if (!valid) return <ProjectNotFound />

  if (isPending) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </main>
    )
  }

  if (error) {
    return isApiError(error, 404) ? (
      <ProjectNotFound />
    ) : (
      <main className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h1 className="text-lg font-medium">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col px-6 py-8">
      <SprintsView project={project} />
    </main>
  )
}
