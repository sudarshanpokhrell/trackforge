import { ChangePasswordForm } from "@/components/change-password-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUpdateMe, useUser } from "@/hooks/use-auth"
import { getErrorMessage } from "@/lib/api"
import { createFileRoute } from "@tanstack/react-router"
import { Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

export const Route = createFileRoute("/_authed/profile")({
  component: ProfilePage,
})

function ProfilePage() {
  const user = useUser()!
  const updateMe = useUpdateMe()

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<{ name: string }>({ values: { name: user.name } })

  const onSubmit = async (values: { name: string }) => {
    try {
      const { user: updated } = await updateMe.mutateAsync({ name: values.name.trim() })
      reset({ name: updated.name })
      toast.success("Profile updated.")
    } catch (error) {
      setError("name", { message: getErrorMessage(error) })
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 py-4">
      <div className="space-y-1">
        <h1 className="text-headline">Profile</h1>
        <p className="text-sm text-muted-foreground">Your account details and password.</p>
      </div>

      <section className="space-y-5">
        <h2 className="border-b pb-2 text-eyebrow text-ink-subtle">Account</h2>

        <dl className="grid grid-cols-[8rem_1fr] gap-y-3 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd>{user.email}</dd>
          <dt className="text-muted-foreground">Role</dt>
          <dd>
            <Badge variant="secondary" className="capitalize">
              {user.role}
            </Badge>
          </dd>
        </dl>

        <form className="flex items-end gap-3" noValidate onSubmit={handleSubmit(onSubmit)}>
          <div className="flex-1">
            <Label htmlFor="name">Name</Label>
            <Input
              aria-invalid={errors.name ? true : undefined}
              autoComplete="name"
              className="mt-2 h-9"
              id="name"
              {...register("name", {
                required: "Name is required.",
                validate: (v) => v.trim() !== "" || "Name is required.",
              })}
            />
          </div>
          <Button className="h-9" disabled={!isDirty || isSubmitting} type="submit">
            {isSubmitting && <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </form>
        {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
      </section>

      <section className="space-y-5">
        <h2 className="border-b pb-2 text-eyebrow text-ink-subtle">Password</h2>
        <ChangePasswordForm
          className="max-w-sm space-y-5"
          onSuccess={() => {
            toast.success("Password changed.")
          }}
        />
      </section>
    </div>
  )
}
