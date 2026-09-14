import { AppSidebar } from "@/components/sidebar/sidebar"
import { meQuery } from "@/hooks/auth"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.query(meQuery)
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } })
    }
    return { user } 
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <div className="flex flex-1 overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
