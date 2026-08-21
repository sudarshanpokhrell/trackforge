import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { mainNav, teamNav, tryNav, type NavItem } from '@/lib/navigation'
import { useState } from 'react'

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = item.children && item.children.length > 0

  if (hasChildren) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          className={cn(
            buttonVariants({
              variant: "ghost",
              className: "w-full justify-start gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
            }),
            depth > 0 && "pl-6"
          )}
        >
          {item.icon && <item.icon className="size-4 shrink-0" />}
          <span className="flex-1 text-left">{item.title}</span>
          {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5">
          {item.children?.map((child) => (
            <NavItemComponent key={child.title} item={child} depth={depth + 1} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <Link to={item.href || '/'} className="block">
      {({ isActive }) => (
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-2 px-3 py-2 text-sm font-medium',
            isActive
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            depth > 0 && 'pl-6'
          )}
        >
          {item.icon && <item.icon className="size-4 shrink-0" />}
          <span>{item.title}</span>
        </Button>
      )}
    </Link>
  )
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-background p-4">
      <div className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Linear
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {mainNav.map((item) => (
          <NavItemComponent key={item.title} item={item} />
        ))}
        <div className="my-4 border-t" />
        <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your teams
        </div>
        {teamNav.map((item) => (
          <NavItemComponent key={item.title} item={item} />
        ))}
        <div className="my-4 border-t" />
        <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Try
        </div>
        {tryNav.map((item) => (
          <NavItemComponent key={item.title} item={item} />
        ))}
      </nav>
    </aside>
  )
}