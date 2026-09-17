import { useState } from "react"
import { KanbanIcon, ListViewIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { TabBar, type TabBarItem } from "@/components/ui/tab-bar"
import { cn } from "@/lib/utils"
import { IssueBoard } from "./IssueBoard"
import { IssueGroup } from "./IssueGroup"
import { STATUS_ORDER } from "./types"
import type { Issue, Status, Tab } from "./types"

type View = "list" | "board"

const VIEW_KEY = "trackforge:issues-view"

const tabs: TabBarItem<Tab>[] = [
  { value: "all", label: "All issues" },
  { value: "active", label: "Active" },
  { value: "backlog", label: "Backlog" },
]

const TAB_STATUSES: Record<Tab, Status[]> = {
  active: ["in-progress", "todo"],
  backlog: ["backlog"],
  all: STATUS_ORDER,
}

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "board" ? "board" : "list"
  } catch {
    return "list"
  }
}

interface IssueListProps {
  issues: Issue[]
  showProject?: boolean
  projectId?: number
  actions?: React.ReactNode
}

export function IssueList({
  issues,
  showProject,
  projectId,
  actions,
}: IssueListProps) {
  const [tab, setTab] = useState<Tab>("all")
  const [view, setView] = useState<View>(readView)

  const changeView = (next: View) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Not remembered; the view still switches.
    }
  }

  const statuses = TAB_STATUSES[tab]
  const visible = issues.filter((i) => statuses.includes(i.status))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <TabBar
          aria-label="Issue views"
          tabs={tabs}
          value={tab}
          onValueChange={setTab}
        />
        <div className="flex items-center gap-2">
          <ViewToggle value={view} onChange={changeView} />
          {actions}
        </div>
      </div>

      {view === "board" ? (
        <IssueBoard
          issues={visible}
          statuses={statuses}
          projectId={projectId}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {STATUS_ORDER.map((status) => {
            const group = visible.filter((i) => i.status === status)
            if (group.length === 0) return null
            return (
              <IssueGroup
                key={status}
                status={status}
                issues={group}
                showProject={showProject}
                projectId={projectId}
              />
            )
          })}
          {visible.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No issues in this view.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ViewToggle({
  value,
  onChange,
}: {
  value: View
  onChange: (view: View) => void
}) {
  const options = [
    { value: "list" as const, label: "List view", icon: ListViewIcon },
    { value: "board" as const, label: "Board view", icon: KanbanIcon },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Layout"
      className="flex items-center rounded-lg border border-border p-0.5"
    >
      {options.map(({ value: option, label, icon }) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          aria-label={label}
          title={label}
          onClick={() => onChange(option)}
          className={cn(
            "flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground",
            value === option && "bg-surface-2 text-foreground"
          )}
        >
          <HugeiconsIcon icon={icon} className="size-4" />
        </button>
      ))}
    </div>
  )
}
