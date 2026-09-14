import { AppSidebar } from "@/components/sidebar/sidebar"
import { useLogout } from "@/hooks/auth"
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { useEffect } from "react"

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } })
    }
    return { user: context.user } // narrows User | null → User for child routes
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const {user} = Route.useRouteContext()
  const logout = useLogout()

  return (
    <div className="flex flex-1 overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
