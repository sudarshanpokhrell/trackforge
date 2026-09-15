import LoginForm from "@/components/login-form"
import { setupQuery } from "@/hooks/auth"
import { createFileRoute, redirect } from "@tanstack/react-router"

type LoginSearch = {
  redirect?: string
}

export const Route = createFileRoute("/_auth/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ context }) => {
    const { setup_required } = await context.queryClient.ensureQueryData(setupQuery)
    if (setup_required) throw redirect({ to: "/setup", replace: true })
  },
  component: LoginPage,
})

function LoginPage() {
  return (
        <LoginForm />
  )
}
