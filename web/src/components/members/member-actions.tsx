import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useDeactivateUser,
  useMakeSuperadmin,
  useReactivateUser,
  useResetUserPassword,
  useUpdateUser,
} from "@/hooks/use-user"
import { getErrorMessage } from "@/lib/api"
import type { User } from "@/types/auth"
import {
  CrownIcon,
  Key01Icon,
  Loading03Icon,
  MoreHorizontalIcon,
  SecurityCheckIcon,
  UserBlock01Icon,
  UserCheck01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

/**
 * Mirrors the server's rule so the UI only offers what will succeed: the
 * superadmin manages everyone else, an admin manages members only.
 */
export function canManageUser(me: User, target: User) {
  if (me.id === target.id) return false
  if (me.role === "superadmin") return true
  return me.role === "admin" && target.role === "member"
}

export function MemberActions({ me, user }: { me: User; user: User }) {
  const [resetting, setResetting] = useState(false)
  const [transferring, setTransferring] = useState(false)

  const updateUser = useUpdateUser()
  const deactivate = useDeactivateUser()
  const reactivate = useReactivateUser()

  const isSuperadmin = me.role === "superadmin"

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      toast.success(success)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const onDeactivate = async () => {
    try {
      const { orphaned_projects } = await deactivate.mutateAsync(user.id)
      if (orphaned_projects.length > 0) {
        toast.warning(
          `${user.name} deactivated. These projects have no other active admin: ${orphaned_projects
            .map((p) => p.name)
            .join(", ")}.`
        )
      } else {
        toast.success(`${user.name} deactivated.`)
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label={`Manage ${user.name}`} />
          }
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isSuperadmin && user.role === "member" && (
            <DropdownMenuItem
              onClick={() =>
                run(
                  () => updateUser.mutateAsync({ id: user.id, role: "admin" }),
                  `${user.name} is now an admin.`
                )
              }
            >
              <HugeiconsIcon icon={SecurityCheckIcon} className="size-4" />
              Make admin
            </DropdownMenuItem>
          )}
          {isSuperadmin && user.role === "admin" && (
            <DropdownMenuItem
              onClick={() =>
                run(
                  () => updateUser.mutateAsync({ id: user.id, role: "member" }),
                  `${user.name} is now a member.`
                )
              }
            >
              <HugeiconsIcon icon={UserIcon} className="size-4" />
              Make member
            </DropdownMenuItem>
          )}
          {isSuperadmin && user.is_active && (
            <DropdownMenuItem onClick={() => setTransferring(true)}>
              <HugeiconsIcon icon={CrownIcon} className="size-4" />
              Make superadmin
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setResetting(true)}>
            <HugeiconsIcon icon={Key01Icon} className="size-4" />
            Reset password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.is_active ? (
            <DropdownMenuItem variant="destructive" onClick={onDeactivate}>
              <HugeiconsIcon icon={UserBlock01Icon} className="size-4" />
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() =>
                run(() => reactivate.mutateAsync(user.id), `${user.name} reactivated.`)
              }
            >
              <HugeiconsIcon icon={UserCheck01Icon} className="size-4" />
              Reactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ResetPasswordDialog user={user} open={resetting} onOpenChange={setResetting} />
      {isSuperadmin && (
        <MakeSuperadminDialog
          user={user}
          open={transferring}
          onOpenChange={setTransferring}
        />
      )}
    </>
  )
}

function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const resetPassword = useResetUserPassword()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ password: string }>({ defaultValues: { password: "" } })

  const onChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) reset()
  }

  const onSubmit = async ({ password }: { password: string }) => {
    try {
      await resetPassword.mutateAsync({ id: user.id, password })
      toast.success(`${user.name} must set a new password on their next login.`)
      onChange(false)
    } catch (e) {
      setError("root", { message: getErrorMessage(e) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onChange}>
      <DialogContent className="mt-5 sm:max-w-md">
        <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Reset password for {user.name}</DialogTitle>
          </DialogHeader>

          <div>
            <Label htmlFor="reset-password">Temporary password</Label>
            <Input
              id="reset-password"
              type="text"
              autoComplete="off"
              className="mt-2 h-9 font-mono"
              {...register("password", {
                required: "Password is required.",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters.",
                },
              })}
            />
            {errors.password && (
              <p className="mt-1.5 text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-destructive" role="alert">
              {errors.root.message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />}
              Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MakeSuperadminDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const makeSuperadmin = useMakeSuperadmin()

  const onConfirm = async () => {
    try {
      await makeSuperadmin.mutateAsync(user.id)
      toast.success(`${user.name} is now the superadmin. You are an admin.`)
      onOpenChange(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mt-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make {user.name} the superadmin?</DialogTitle>
        </DialogHeader>
        <p className="py-2 text-sm text-muted-foreground">
          There is only one superadmin. You become an admin, and only{" "}
          {user.name} can make you superadmin again.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={makeSuperadmin.isPending}
          >
            {makeSuperadmin.isPending && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />}
            Transfer superadmin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
