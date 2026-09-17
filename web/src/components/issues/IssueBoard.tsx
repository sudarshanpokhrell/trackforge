import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useUpdateIssue } from '@/hooks/use-issues'
import { IssueLabels } from '@/components/labels/issue-labels'
import { PriorityIcon, StatusIcon } from './icons'
import { PriorityPopover } from './popovers'
import { IssueAssignee } from './IssueRow'
import { NewIssueDialog } from './NewIssueDialog'
import { STATUS_LABELS } from './types'
import type { Issue, Priority, Status } from './types'

interface IssueBoardProps {
  issues: Issue[]
  statuses: Status[]
  projectId?: number
}


export function IssueBoard({ issues, statuses, projectId }: IssueBoardProps) {
  const dropStatus = useRef<Status | null>(null)
  const [overStatus, setOverStatus] = useState<Status | null>(null)

  return (
    <div className="flex min-h-0 flex-1 items-start gap-4 overflow-x-auto pb-2">
      {statuses.map((status) => {
        const column = issues.filter((i) => i.status === status)

        return (
          <section
            key={status}
            aria-label={STATUS_LABELS[status]}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (overStatus !== status) setOverStatus(status)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStatus(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              dropStatus.current = status
              setOverStatus(null)
            }}
            className={cn(
              'flex max-h-full w-72 shrink-0 flex-col rounded-xl border border-border bg-surface-1 transition-colors',
              overStatus === status && 'border-hairline-strong bg-surface-2'
            )}
          >
            <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
              <StatusIcon status={status} />
              <span className="text-sm font-medium text-foreground">{STATUS_LABELS[status]}</span>
              <span className="ml-auto rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">
                {column.length}
              </span>
            </header>

            <div className="flex min-h-24 flex-col gap-2 overflow-y-auto p-2">
              {column.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onDragEnd={() => {
                    const target = dropStatus.current
                    dropStatus.current = null
                    setOverStatus(null)
                    return target
                  }}
                />
              ))}
              {column.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                  {projectId !== undefined && (
                    <NewIssueDialog
                      projectId={projectId}
                      defaultStatus={status}
                      trigger={<Button variant="ghost" size="sm" />}
                    >
                      <Plus />
                      Add issue
                    </NewIssueDialog>
                  )}
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function IssueCard({
  issue,
  onDragEnd,
}: {
  issue: Issue
  onDragEnd: () => Status | null
}) {
  const { mutate: updateIssue } = useUpdateIssue(issue)
  const [dragging, setDragging] = useState(false)

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(issue.id))
        setDragging(true)
      }}
      onDragEnd={() => {
        setDragging(false)
        const target = onDragEnd()
        if (target && target !== issue.status) updateIssue({ status: target })
      }}
      className={cn(
        'group/row flex cursor-grab flex-col gap-3 rounded-lg border border-border bg-card p-3 shadow-xs transition-[opacity,border-color] hover:border-hairline-strong active:cursor-grabbing',
        dragging && 'opacity-40'
      )}
    >
      <Link
        to="/projects/$projectId/issues"
        params={{ projectId: String(issue.project_id) }}
        search={(prev) => ({ ...prev, issue: issue.id })}
        draggable={false}
        className="line-clamp-2 text-sm text-foreground hover:underline"
      >
        {issue.title}
      </Link>

      <div className="flex items-center gap-2">
        <PriorityPopover
          current={issue.priority}
          onChange={(p: Priority) => updateIssue({ priority: p })}
        >
          <span className="flex items-center rounded p-0.5 transition-colors hover:bg-muted">
            <PriorityIcon priority={issue.priority} />
          </span>
        </PriorityPopover>
        <div className="min-w-0 flex-1">
          <IssueLabels issue={issue} compact />
        </div>
        <IssueAssignee issue={issue} />
      </div>
    </article>
  )
}
