import { UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusIcon, PriorityIcon } from './icons'
import { StatusPopover, PriorityPopover, AssigneePopover } from './popovers'
import type { Issue, Status, Priority } from './types'
import { useState } from 'react'
import { useUpdateIssue, useAddAssignee, useRemoveAssignee } from '@/hooks/use-issues'
import { useQuery } from '@tanstack/react-query'
import { usersQuery } from '@/hooks/use-user'
import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'

interface IssueRowProps {
  issue: Issue
  showProject?: boolean
}

export function IssueRow({ issue, showProject }: IssueRowProps) {
  const [hovered, setHovered] = useState(false)
  const { mutate: updateIssue } = useUpdateIssue(issue)
  const { mutate: addAssignee } = useAddAssignee(issue)
  const { mutate: removeAssignee } = useRemoveAssignee(issue)
  
  const { data: users = [] } = useQuery(usersQuery)

  const assignee = issue.assignees?.[0]
  const assigneeUser = assignee ? users.find((u) => u.id === assignee.id) : null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group/row flex items-center gap-2 border-b border-border/30 px-4 py-[7px] text-base transition-colors hover:bg-muted/30 cursor-default"
    >
      <div className="w-4 shrink-0 flex items-center justify-center">
        <div
          className={cn(
            'size-4 rounded border transition-all',
            hovered ? 'opacity-100 border-border' : 'opacity-0 border-transparent'
          )}
        />
      </div>

      <PriorityPopover
        current={issue.priority}
        onChange={(p: Priority) => updateIssue({ priority: p })}
      >
        <button className="flex items-center p-0.5 rounded hover:bg-muted transition-colors cursor-pointer outline-none">
          <PriorityIcon priority={issue.priority} />
        </button>
      </PriorityPopover>

      <span className="w-14 shrink-0 text-[14px] text-muted-foreground/60 font-mono">
        {issue.id}
      </span>

      <StatusPopover
        current={issue.status}
        onChange={(s: Status) => updateIssue({ status: s })}
      >
        <button className="flex items-center p-0.5 rounded hover:bg-muted transition-colors cursor-pointer outline-none">
          <StatusIcon status={issue.status} />
        </button>
      </StatusPopover>

      <Link 
        to="/issues/$issueId"
        params={{ issueId: issue.id.toString() }}
        className="flex-1 truncate text-sm hover:underline"
      >
        {issue.title}
      </Link>

      {showProject && issue.project_id && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <span className="size-2 rounded-sm bg-primary/70" />
          Project {issue.project_id}
        </span>
      )}

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
        <button className="flex items-center rounded hover:bg-muted transition-colors p-0.5 cursor-pointer outline-none">
          {assigneeUser ? (
            <div className="size-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground border border-black/50">
              {assigneeUser.name ? assigneeUser.name[0].toUpperCase() : '?'}
            </div>
          ) : (
            <div className="size-5 rounded-full border border-dashed border-border/80 flex items-center justify-center hover:border-muted-foreground/50 transition-colors">
              <UserCircle2 className="size-3.5 text-muted-foreground/40" />
            </div>
          )}
        </button>
      </AssigneePopover>

      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground/60">
        {format(new Date(issue.created_at), 'MMM d')}
      </span>
    </div>
  )
}
