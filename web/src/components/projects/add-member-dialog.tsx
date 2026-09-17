import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAddProjectMember } from "@/hooks/use-projects"
import { usersQuery } from "@/hooks/use-user"
import { getErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ProjectMember, ProjectRole } from "@/types/projects"
import { useQuery } from "@tanstack/react-query"
import { Add01Icon, Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMemo, useState } from "react"
import { toast } from "sonner"


export function AddMemberDialog({
  projectId,
  members,
  trigger,
  children,
}: {
  projectId: number
  members: ProjectMember[]
  trigger?: React.ReactElement
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<ProjectRole>("contributor")
  const [error, setError] = useState<string | null>(null)

  const { data: users, isPending } = useQuery(usersQuery)
  const addMember = useAddProjectMember(projectId)

  const candidates = useMemo(() => {
    const existing = new Set(members.map((m) => m.user_id))
    return (users ?? []).filter((u) => u.is_active && !existing.has(u.id))
  }, [users, members])

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setUserId(null)
      setRole("contributor")
      setError(null)
    }
  }

  const onSubmit = async () => {
    if (!userId) return
    try {
      await addMember.mutateAsync({ userId, role })
      toast.success(
        `${candidates.find((u) => u.id === userId)?.name ?? "Member"} added.`
      )
      onOpenChange(false)
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <button
              aria-label="Add member"
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            />
          )
        }
      >
        {children ?? <HugeiconsIcon icon={Add01Icon} className="size-3.5" />}
      </DialogTrigger>
      <DialogContent className="mt-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label htmlFor="member">Person</Label>
            <div className="mt-2 flex items-center gap-2">
              <Select value={userId} onValueChange={(v) => v && setUserId(v)}>
                <SelectTrigger
                  id="member"
                  className="w-full min-w-0 flex-1 data-[size=default]:h-9"
                >
                  <SelectValue>
                    {(value: string | null) => {
                      const user = candidates.find((u) => u.id === value)
                      if (user) return <PersonOption name={user.name} email={user.email} inline />
                      return isPending
                        ? "Loading…"
                        : candidates.length === 0
                          ? "Everyone is already a member"
                          : "Select a co-worker"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {candidates.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="py-1.5">
                      <PersonOption name={u.name} email={u.email} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={role} onValueChange={(v) => v && setRole(v)}>
                <SelectTrigger
                  aria-label="Project role"
                  className="w-32 shrink-0 data-[size=default]:h-9"
                >
                  <SelectValue className="capitalize" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start">
                  <SelectItem value="contributor">Contributor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!userId || addMember.isPending}
          >
            {addMember.isPending && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />}
            Add member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** `inline` puts the email beside the name, for the one-line select trigger. */
function PersonOption({
  name,
  email,
  inline = false,
}: {
  name: string
  email: string
  inline?: boolean
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[10px] font-medium text-ink-muted ring-1 ring-hairline-strong">
        {name.toUpperCase()[0]}
      </span>
      <span
        className={cn(
          "flex min-w-0 text-left",
          inline ? "items-baseline gap-2" : "flex-col leading-tight"
        )}
      >
        <span className="truncate text-sm text-foreground">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{email}</span>
      </span>
    </span>
  )
}
