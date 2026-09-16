import { useState } from 'react'
import { TabBar, type TabBarItem } from '@/components/ui/tab-bar'
import { IssueGroup } from './IssueGroup'
import { STATUS_ORDER } from './types'
import type { Issue, Tab } from './types'

interface IssueListProps {
  issues: Issue[]
  showProject?: boolean
}

export function IssueList({ issues, showProject }: IssueListProps) {
  const [tab, setTab] = useState<Tab>('all')

  const visible =
    tab === 'all'
      ? issues
      : tab === 'active'
        ? issues.filter((i) => i.status === 'in-progress' || i.status === 'todo')
        : issues.filter((i) => i.status === 'backlog')

  const tabs: TabBarItem<Tab>[] = [
    { value: 'active', label: 'Active' },
    { value: 'backlog', label: 'Backlog' },
    { value: 'all', label: 'All issues' },
  ]

  return (
    <div className="flex flex-col">
      <TabBar
        aria-label="Issue views"
        tabs={tabs}
        value={tab}
        onValueChange={setTab}
        className="border-b border-border pb-3"
      />

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
