import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateUser } from "@/hooks/use-user"
import { getErrorMessage } from "@/lib/api"
import type { AssignableRole } from "@/types/auth"
import { Loader2, Plus } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

type Values = {
  name: string
  email: string
  role: AssignableRole
  password: string
}

/** Admins may only create members, so they get no role picker. */
export function CreateMemberDialog({ canCreateAdmin }: { canCreateAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const createUser = useCreateUser()

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    defaultValues: { name: "", email: "", role: "member", password: "" },
  })

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const onSubmit = async (values: Values) => {
    try {
      const { user } = await createUser.mutateAsync({
        ...values,
        name: values.name.trim(),
      })
      toast.success(
        `${user.name} added.`
      )
      onOpenChange(false)
    } catch (e) {
      setError("root", { message: getErrorMessage(e) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Add member
      </DialogTrigger>
      <DialogContent className="sm:max-w-md mt-5">
        <form
          className="space-y-5"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
          </DialogHeader>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              className="mt-2 h-9"
              placeholder="Sujan Thapa"
              {...register("name", { required: "Name is required." })}
            />
            {errors.name && (
              <p className="mt-1.5 text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              className="mt-2 h-9"
              placeholder="example@xyz.com"
              {...register("email", { required: "Email is required." })}
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {canCreateAdmin && (
            <div>
              <Label htmlFor="role">Role</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => v && field.onChange(v)}
                  >
                    <SelectTrigger id="role" className="mt-2 w-full h-9">
                      <SelectValue className="capitalize" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div>
            <Label htmlFor="password">Temporary password</Label>
            <Input
              id="password"
              type="text"
              autoComplete="off"
              className="mt-2 font-mono h-9"
              placeholder="*********"
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Add member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
