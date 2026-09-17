import { Link } from "@tanstack/react-router"
import { format } from "date-fns"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"
import { IssueLabels } from "@/components/labels/issue-labels"
import { ProjectIcon } from "@/components/projects/project-icon"
import { useAddAssignee, useRemoveAssignee, useUpdateIssue } from "@/hooks/use-issues"
import { getErrorMessage } from "@/lib/api"
import { PRIORITY_LABELS, STATUS_LABELS, type Issue } from "@/types/issues"
import type { ProjectDetails } from "@/types/projects"
import { PriorityIcon, StatusIcon } from "../icons"
import { AssigneePopover, PriorityPopover, StatusPopover } from "../popovers"
import { SprintPicker } from "./sprint-picker"
import { UserAvatar } from "./user-avatar"

const onError = { onError: (e: unknown) => toast.error(getErrorMessage(e)) }

export function IssueProperties({ issue, project }: { issue: Issue; project?: ProjectDetails }) {
  const updateIssue = useUpdateIssue(issue)
  const addAssignee = useAddAssignee(issue)
  const removeAssignee = useRemoveAssignee(issue)

  const author = project?.members.find((m) => m.user_id === issue.author_id)

  return (
    <aside className="flex flex-col gap-1 text-sm">
      <Property label="Status">
        <StatusPopover
          current={issue.status}
          onChange={(status) => updateIssue.mutate({ status }, onError)}
        >
          <span className={valueButton}>
            <StatusIcon status={issue.status} />
            {STATUS_LABELS[issue.status]}
          </span>
        </StatusPopover>
      </Property>

      <Property label="Priority">
        <PriorityPopover
          current={issue.priority}
          onChange={(priority) => updateIssue.mutate({ priority }, onError)}
        >
          <span className={valueButton}>
            <PriorityIcon priority={issue.priority} />
            {PRIORITY_LABELS[issue.priority]}
          </span>
        </PriorityPopover>
      </Property>

      <Property label="Assignees" align="start">
        <div className="flex min-w-0 flex-col gap-1">
          {issue.assignees.map((assignee) => (
            <span key={assignee.id} className="group/assignee flex items-center gap-2 px-1.5 py-1">
              <UserAvatar name={assignee.name} />
              <span className="min-w-0 flex-1 truncate">{assignee.name}</span>
              <button
                type="button"
                aria-label={`Unassign ${assignee.name}`}
                onClick={() => removeAssignee.mutate(assignee.id, onError)}
                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover/assignee:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          <AssigneePopover
            current={issue.assignees[0]?.id}
            onChange={(id) => {
              if (!id) {
                issue.assignees.forEach((a) => removeAssignee.mutate(a.id, onError))
              } else if (issue.assignees.some((a) => a.id === id)) {
                removeAssignee.mutate(id, onError)
              } else {
                addAssignee.mutate(id, onError)
              }
            }}
          >
            <span className={`${valueButton} text-muted-foreground`}>
              <Plus className="size-4" />
              {issue.assignees.length === 0 ? "Assign" : "Add assignee"}
            </span>
          </AssigneePopover>
        </div>
      </Property>

      <Property label="Labels" align="start">
        <div className="px-1 py-0.5">
          <IssueLabels issue={issue} />
        </div>
      </Property>

      {/* Hidden when sprints are off, unless the issue is still in an old one. */}
      {(project?.cycles_enabled || issue.cycle_id !== null) && (
        <Property label="Sprint">
          <SprintPicker issue={issue} enabled={project?.cycles_enabled ?? false} />
        </Property>
      )}

      <div className="my-3" />

      <Property label="Project">
        {project ? (
          <Link
            to="/projects/$projectId"
            params={{ projectId: String(project.id) }}
            className={valueButton}
          >
            <ProjectIcon emoji={project.emoji} className="size-4 text-sm text-muted-foreground" />
            <span className="truncate">{project.name}</span>
          </Link>
        ) : (
          <span className="px-1.5 text-muted-foreground">—</span>
        )}
      </Property>

      <Property label="Created by">
        <span className="flex min-w-0 items-center gap-2 px-1.5 py-1">
          {author ? (
            <>
              <UserAvatar name={author.name} />
              <span className="truncate">{author.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Unknown user</span>
          )}
        </span>
      </Property>

      <Property label="Created">
        <span className="px-1.5 py-1 text-muted-foreground">
          {format(new Date(issue.created_at), "d MMM yyyy")}
        </span>
      </Property>

      <Property label="Updated">
        <span className="px-1.5 py-1 text-muted-foreground">
          {format(new Date(issue.updated_at), "d MMM yyyy")}
        </span>
      </Property>
    </aside>
  )
}

const valueButton =
  "flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted"

function Property({
  label,
  align = "center",
  children,
}: {
  label: string
  align?: "center" | "start"
  children: React.ReactNode
}) {
  return (
    <div className={`flex gap-3 ${align === "start" ? "items-start" : "items-center"}`}>
      <span className="w-24 shrink-0 py-1 text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
