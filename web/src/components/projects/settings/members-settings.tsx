import { DeleteDialog } from "@/components/delete-dialog"
import { AddMemberDialog } from "@/components/projects/add-member-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRemoveProjectMember, useUpdateProjectMemberRole } from "@/hooks/use-projects"
import { getErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { MoreHorizontal, Plus, UserMinus } from "lucide-react"
import type { ProjectDetails, ProjectMember, ProjectRole } from "@/types/projects"
import { useState } from "react"
import { toast } from "sonner"
import { SettingsHeader } from "./settings-header"

export function MembersSettings({ project }: { project: ProjectDetails }) {
  return (
    <section className="flex flex-col gap-6">
      <SettingsHeader
        title="Members"
        description="People who can see and work on this project, and their roles."
        action={
          project.my_access.can_manage && (
            <AddMemberDialog
              projectId={project.id}
              members={project.members}
              trigger={<Button size="sm" />}
            >
              <Plus />
              Add member
            </AddMemberDialog>
          )
        }
      />

      <MemberList project={project} />
    </section>
  )
}

function MemberList({ project }: { project: ProjectDetails }) {
  const canManage = project.my_access.can_manage

  if (project.members.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
        No members yet.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {project.members.map((member) => (
        <li
          key={member.user_id}
          className="flex items-center gap-3 px-4 py-2.5 text-sm"
        >
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-medium text-ink-muted ring-1 ring-hairline-strong",
              !member.is_active && "opacity-50"
            )}
          >
            {member.name.toUpperCase()[0]}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span
              className={cn(
                "truncate text-foreground",
                !member.is_active && "text-muted-foreground line-through"
              )}
            >
              {member.name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {member.email}
            </span>
          </div>
          {!member.is_active && (
            <Badge variant="destructive" className="shrink-0">
              Deactivated
            </Badge>
          )}
          <Badge variant="secondary" className="shrink-0 capitalize">
            {member.role}
          </Badge>
          {canManage && <MemberActions projectId={project.id} member={member} />}
        </li>
      ))}
    </ul>
  )
}

function MemberActions({ projectId, member }: { projectId: number; member: ProjectMember }) {
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const updateRole = useUpdateProjectMemberRole(projectId)
  const removeMember = useRemoveProjectMember(projectId)

  const onChangeRole = async (role: ProjectRole) => {
    if (role === member.role) return

    try {
      await updateRole.mutateAsync({ userId: member.user_id, role })
      toast.success(`${member.name} is now a project ${role}.`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const onRemove = async () => {
    try {
      await removeMember.mutateAsync(member.user_id)
      toast.success(`${member.name} removed from the project.`)
      setConfirmingRemove(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Manage ${member.name}`}
          disabled={updateRole.isPending || removeMember.isPending}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none data-popup-open:bg-muted/50 data-popup-open:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Role</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={member.role}
              onValueChange={(role: ProjectRole) => onChangeRole(role)}
            >
              <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="contributor">Contributor</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmingRemove(true)}>
            <UserMinus className="size-4" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteDialog
        open={confirmingRemove}
        onOpenChange={setConfirmingRemove}
        title={`Remove ${member.name} from the project?`}
        description="They lose access to it and are unassigned from its issues."
        confirmLabel="Remove"
        onConfirm={onRemove}
        pending={removeMember.isPending}
      />
    </>
  )
}
