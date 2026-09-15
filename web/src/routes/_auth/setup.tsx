import SetupForm from "@/components/setup-form"
import { setupQuery } from "@/hooks/use-auth"
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/setup")({
  beforeLoad: async ({ context }) => {
    const { setup_required } = await context.queryClient.ensureQueryData(setupQuery)
    if (!setup_required) throw redirect({ to: "/login", replace: true })
  },
  component: SetupPage,
})

function SetupPage() {
  return <SetupForm />
}
