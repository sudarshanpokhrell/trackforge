import { GripVertical, UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusIcon, PriorityIcon } from './icons'
import { StatusPopover, PriorityPopover, AssigneePopover } from './popovers'
import { MOCK_ASSIGNEES } from './types'
import type { Issue, Status, Priority } from './types'
import { useState } from 'react'

interface IssueRowProps {
  issue: Issue
  showProject?: boolean
  onUpdate: (id: string, changes: Partial<Issue>) => void
}

export function IssueRow({ issue, showProject, onUpdate }: IssueRowProps) {
  const [hovered, setHovered] = useState(false)

  const assignee = MOCK_ASSIGNEES.find((a) => a.id === issue.assignee)

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
        onChange={(p: Priority) => onUpdate(issue.id, { priority: p })}
      >
        <span className="flex items-center p-0.5 rounded hover:bg-muted transition-colors">
          <PriorityIcon priority={issue.priority} />
        </span>
      </PriorityPopover>

      <span className="w-14 shrink-0 text-[14px] text-muted-foreground/60 font-mono">
        {issue.id}
      </span>

      <StatusPopover
        current={issue.status}
        onChange={(s: Status) => onUpdate(issue.id, { status: s })}
      >
        <span className="flex items-center p-0.5 rounded hover:bg-muted transition-colors">
          <StatusIcon status={issue.status} />
        </span>
      </StatusPopover>

      <span className="flex-1 truncate text-sm">{issue.title}</span>

      {issue.label && (
        <span className="flex items-center gap-1.5 rounded-full border border-border/50 px-2 py-0.5 text-xs text-muted-foreground shrink-0">
          <span className={cn('size-1.5 rounded-full', issue.labelColor)} />
          {issue.label}
        </span>
      )}

      {showProject && issue.project && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <span className="size-2 rounded-sm bg-primary/70" />
          {issue.project}
        </span>
      )}

      <AssigneePopover
        current={issue.assignee}
        onChange={(id) => onUpdate(issue.id, { assignee: id })}
      >
        <span className="flex items-center rounded hover:bg-muted transition-colors p-0.5">
          {assignee ? (
            <div
              className={cn(
                'size-5 rounded-full flex items-center justify-center text-[9px] font-bold',
                assignee.color
              )}
            >
              {assignee.initials}
            </div>
          ) : (
            <div className="size-5 rounded-full border border-dashed border-border/80 flex items-center justify-center hover:border-muted-foreground/50 transition-colors">
              <UserCircle2 className="size-3.5 text-muted-foreground/40" />
            </div>
          )}
        </span>
      </AssigneePopover>

      <span className="w-12 shrink-0 text-right text-xs text-muted-foreground/60">
        {issue.date}
      </span>
    </div>
  )
}
