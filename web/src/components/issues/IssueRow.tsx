import { UserCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { StatusIcon, PriorityIcon } from './icons'
import { StatusPopover, PriorityPopover, AssigneePopover } from './popovers'
import type { Issue, Status, Priority } from './types'
import { useUpdateIssue, useAddAssignee, useRemoveAssignee } from '@/hooks/use-issues'
import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { IssueLabels } from '@/components/labels/issue-labels'

interface IssueRowProps {
  issue: Issue
  showProject?: boolean
}

export function IssueRow({ issue, showProject }: IssueRowProps) {
  const { mutate: updateIssue } = useUpdateIssue(issue)

  return (
    <div className="group/row flex h-12 items-center gap-3 border-b border-border/60 px-5 text-sm transition-colors hover:bg-surface-1">
      <PriorityPopover
        current={issue.priority}
        onChange={(p: Priority) => updateIssue({ priority: p })}
      >
        <span className="flex items-center rounded p-0.5 transition-colors hover:bg-muted">
          <PriorityIcon priority={issue.priority} />
        </span>
      </PriorityPopover>

      <StatusPopover
        current={issue.status}
        onChange={(s: Status) => updateIssue({ status: s })}
      >
        <span className="flex items-center rounded p-0.5 transition-colors hover:bg-muted">
          <StatusIcon status={issue.status} />
        </span>
      </StatusPopover>

      <Link
        to="/projects/$projectId/issues"
        params={{ projectId: String(issue.project_id) }}
        // Opens the issue in the side peek; ⌘-click still gives a real URL.
        search={(prev) => ({ ...prev, issue: issue.id })}
        className="min-w-0 flex-1 truncate text-foreground hover:underline"
      >
        {issue.title}
      </Link>

      {showProject && issue.project_id && (
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <span className="size-2 rounded-xs bg-ink-tertiary" />
          Project {issue.project_id}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-3">
        <IssueLabels issue={issue} compact />
        <IssueAssignee issue={issue} />
        <span className="w-12 text-right text-xs text-muted-foreground">
          {format(new Date(issue.created_at), 'MMM d')}
        </span>
      </div>
    </div>
  )
}

/** The issue's first assignee as an avatar that opens the assignee picker. */
export function IssueAssignee({ issue }: { issue: Issue }) {
  const { mutate: addAssignee } = useAddAssignee(issue)
  const { mutate: removeAssignee } = useRemoveAssignee(issue)
  const assignee = issue.assignees?.[0]

  return (
    <AssigneePopover
      current={assignee?.id}
      onChange={(id) => {
        if (assignee && !id) {
          removeAssignee(assignee.id)
        } else if (id) {
          addAssignee(id)
        }
      }}
    >
      <span
        title={assignee?.name ?? 'Unassigned'}
        className="flex items-center rounded p-0.5 transition-colors hover:bg-muted"
      >
        {assignee ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-surface-3 text-[9px] font-bold text-ink-muted ring-1 ring-hairline-strong">
            {assignee.name ? assignee.name[0].toUpperCase() : '?'}
          </span>
        ) : (
          <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-border/80">
            <HugeiconsIcon icon={UserCircleIcon} className="size-3.5 text-muted-foreground/40" />
          </span>
        )}
      </span>
    </AssigneePopover>
  )
}
