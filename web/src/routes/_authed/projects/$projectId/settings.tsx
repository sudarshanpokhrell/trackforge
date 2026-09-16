import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/projects/$projectId/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authed/projects/$projectId/settings"!</div>
}
