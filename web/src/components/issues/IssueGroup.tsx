import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusIcon } from './icons'
import { IssueRow } from './IssueRow'
import { STATUS_LABELS } from './types'
import type { Issue, Status } from './types'

interface IssueGroupProps {
  status: Status
  issues: Issue[]
  showProject?: boolean
  onUpdate: (id: string, changes: Partial<Issue>) => void
}

export function IssueGroup({ status, issues, showProject, onUpdate }: IssueGroupProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div>
      {/* Group header */}
      <div className="group/header flex items-center gap-2 px-4 py-2 hover:bg-muted/20 transition-colors select-none">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed
            ? <ChevronRight className="size-3.5" />
            : <ChevronDown className="size-3.5" />}
        </button>
        <StatusIcon status={status} />
        <span className="text-sm font-medium">{STATUS_LABELS[status]}</span>
        <span className="text-sm text-muted-foreground">{issues.length}</span>
        <button className={cn(
          'ml-auto rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-all',
          'opacity-0 group-hover/header:opacity-100'
        )}>
          <Plus className="size-3.5" />
        </button>
      </div>

      {!collapsed && issues.map((issue) => (
        <IssueRow
          key={issue.id}
          issue={issue}
          showProject={showProject}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  )
}
