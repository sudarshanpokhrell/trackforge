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
import type { ProjectMember, ProjectRole } from "@/types/projects"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

export function AddMemberDialog({
  projectId,
  members,
}: {
  projectId: number
  members: ProjectMember[]
}) {
  const [open, setOpen] = useState(false)
  // null, not "", so the trigger shows its placeholder while nothing is picked.
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<ProjectRole>("contributor")
  const [error, setError] = useState<string | null>(null)

  const { data: users, isPending } = useQuery(usersQuery)
  const addMember = useAddProjectMember(projectId)

  // A deactivated user can't be added (the server returns 422), and anyone
  // already on the project would only collide.
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
          <button
            aria-label="Add member"
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          />
        }
      >
        <Plus className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="mt-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label htmlFor="member">Person</Label>
            <Select value={userId} onValueChange={(v) => v && setUserId(v)}>
              <SelectTrigger id="member" className="mt-2 h-9 w-full">
                {/* The value is a user id, so it has to be mapped back to a name;
                    left alone, the trigger would show a raw UUID. */}
                <SelectValue
                  placeholder={
                    isPending
                      ? "Loading…"
                      : candidates.length === 0
                        ? "Everyone is already a member"
                        : "Select a person"
                  }
                >
                  {(value: string | null) => {
                    const user = candidates.find((u) => u.id === value)
                    return user ? `${user.name} · ${user.email}` : null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {candidates.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} · {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="member-role">Project role</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger id="member-role" className="mt-2 h-9 w-full">
                <SelectValue className="capitalize" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contributor">Contributor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              {role === "admin"
                ? "Admins also edit the project and manage its members."
                : "Contributors work on issues and comments, and can be assigned."}
            </p>
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
            {addMember.isPending && <Loader2 className="animate-spin" />}
            Add member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
