import { useState } from 'react'
import { cn } from '@/lib/utils'
import { IssueGroup } from './IssueGroup'
import { STATUS_ORDER } from './types'
import type { Issue, Tab } from './types'

interface IssueListProps {
  initialIssues: Issue[]
  showProject?: boolean
}

export function IssueList({ initialIssues, showProject }: IssueListProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues)
  const [tab, setTab] = useState<Tab>('all')

  const handleUpdate = (id: string, changes: Partial<Issue>) => {
    setIssues((prev) =>
      prev.map((issue) => (issue.id === id ? { ...issue, ...changes } : issue))
    )
  }

  const visible =
    tab === 'all'
      ? issues
      : tab === 'active'
        ? issues.filter((i) => i.status === 'in-progress' || i.status === 'todo')
        : issues.filter((i) => i.status === 'backlog')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'backlog', label: 'Backlog' },
    { key: 'all', label: 'All issues' },
  ]

  return (
    <div className="flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border/60 pb-2 mb-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded px-3 py-1 text-sm transition-colors',
              tab === key
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {STATUS_ORDER.map((status) => {
          const group = visible.filter((i) => i.status === status)
          if (group.length === 0) return null
          return (
            <IssueGroup
              key={status}
              status={status}
              issues={group}
              showProject={showProject}
              onUpdate={handleUpdate}
            />
          )
        })}
        {visible.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No issues in this view.
          </div>
        )}
      </div>
    </div>
  )
}
