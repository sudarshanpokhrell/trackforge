import { Tabs } from "@base-ui/react/tabs"
import { cn } from "@/lib/utils"

export type TabBarItem<T extends string> = {
  value: T
  label: React.ReactNode
}

export function TabBar<T extends string>({
  tabs,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: {
  tabs: TabBarItem<T>[]
  value: T
  onValueChange: (value: T) => void
  className?: string
  "aria-label"?: string
}) {
  return (
    <Tabs.Root value={value} onValueChange={(next) => onValueChange(next as T)}>
      <Tabs.List
        aria-label={ariaLabel}
        className={cn("flex items-center gap-1", className)}
      >
        {tabs.map((tab) => (
          <Tabs.Tab
            key={tab.value}
            value={tab.value}
            className="cursor-pointer rounded-full px-3.5 py-1 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-active:bg-surface-2 data-active:font-medium data-active:text-foreground data-active:ring-1 data-active:ring-border"
          >
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.Root>
  )
}
