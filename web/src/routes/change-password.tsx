import { ChangePasswordForm } from "@/components/change-password-form"
import { Button } from "@/components/ui/button"
import { meQuery, useLogout } from "@/hooks/use-auth"
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"

// Forced screen for users who still have a temporary password. It sits outside
// the _authed layout because every other API call is refused until they change it.
export const Route = createFileRoute("/change-password")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.query(meQuery)
    if (!user) throw redirect({ to: "/login", replace: true })
    if (!user.must_change_password) throw redirect({ to: "/", replace: true })
  },
  component: ChangePasswordPage,
})

function ChangePasswordPage() {
  const router = useRouter()
  const logout = useLogout()

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-balance font-semibold text-3xl">Choose a new password</h1>
          <p className="text-pretty text-muted-foreground">
            You're signed in with a temporary password. Set your own to continue.
          </p>
        </div>

        <ChangePasswordForm
          submitLabel="Set password and continue"
          onSuccess={async () => {
            toast.success("Password changed.")
            await router.navigate({ to: "/", replace: true })
          }}
        />

        <Button
          className="w-full"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
          variant="ghost"
        >
          Log out
        </Button>
      </div>
    </div>
  )
}
