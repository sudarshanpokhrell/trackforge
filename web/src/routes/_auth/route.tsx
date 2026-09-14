import { meQueryOptions } from '@/providers/auth-provider'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions)
    if (user) throw redirect({ to: '/' })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet/>
}
