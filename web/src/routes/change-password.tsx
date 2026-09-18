import { ChangePasswordForm } from "@/components/change-password-form"
import { meQuery, useLogout, useUser } from "@/hooks/use-auth"
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
  const user = useUser()

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="mx-auto w-full max-w-110 space-y-6 rounded-2xl border bg-card p-8 shadow-[inset_0_1px_0_0_var(--edge-highlight)]">
        <div className="space-y-2 text-center">
          <img src="/logo.svg" alt="TrackForge" className="mx-auto mb-5 size-10" />
          <h1 className="text-balance text-headline">Choose a new password</h1>
          <p className="text-pretty text-body-sm text-ink-subtle">
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

        <p className="text-center text-body-sm text-ink-subtle">
          Signed in as <span className="text-foreground">{user?.email}</span>.{" "}
          <button
            className="text-primary-ink hover:underline disabled:pointer-events-none disabled:opacity-50"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            type="button"
          >
            Log out
          </button>
        </p>
      </div>
    </div>
  )
}
