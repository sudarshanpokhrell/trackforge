import { useState } from 'react'
import { Add01Icon, ArrowDown01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { cn } from '@/lib/utils'
import { StatusIcon } from './icons'
import { IssueRow } from './IssueRow'
import { NewIssueDialog } from './NewIssueDialog'
import { STATUS_LABELS } from './types'
import type { Issue, Status } from './types'

interface IssueGroupProps {
  status: Status
  issues: Issue[]
  showProject?: boolean
  /** When given, the header's plus adds an issue with this group's status. */
  projectId?: number
}

export function IssueGroup({ status, issues, showProject, projectId }: IssueGroupProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div>
      {/* Group header */}
      <div className="group/header flex h-9 items-center gap-2 border-b border-border/60 bg-surface-1 px-4 transition-colors select-none">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed
            ? <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
            : <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />}
        </button>
        <StatusIcon status={status} />
        <span className="text-sm font-medium">{STATUS_LABELS[status]}</span>
        <span className="text-sm text-muted-foreground">{issues.length}</span>
        {projectId !== undefined && (
          <NewIssueDialog
            projectId={projectId}
            defaultStatus={status}
            trigger={
              <button
                aria-label={`Add issue to ${STATUS_LABELS[status]}`}
                title="Add issue"
                className={cn(
                  'ml-auto rounded p-0.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground',
                  'opacity-0 group-hover/header:opacity-100 focus-visible:opacity-100'
                )}
              />
            }
          >
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
          </NewIssueDialog>
        )}
      </div>

      {!collapsed && issues.map((issue) => (
        <IssueRow
          key={issue.id}
          issue={issue}
          showProject={showProject}
        />
      ))}
    </div>
  )
}
