import { Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import { StatusIcon, PriorityIcon } from './icons'
import {
  STATUS_ORDER,
  STATUS_LABELS,
  PRIORITY_ORDER,
  PRIORITY_LABELS,
  type Status,
  type Priority,
} from './types'
import { useQuery } from '@tanstack/react-query'
import { usersQuery } from '@/hooks/use-user'

interface StatusPopoverProps {
  current: Status
  onChange: (status: Status) => void
  children: React.ReactNode
}

export function StatusPopover({ current, onChange, children }: StatusPopoverProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Set status</DropdownMenuLabel>
          {STATUS_ORDER.map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={(e) => { e.stopPropagation(); onChange(s) }}
              className="gap-4"
            >
              <StatusIcon status={s} />
              <span className="flex-1">{STATUS_LABELS[s]}</span>
              {current === s && <Check className="size-3.5 text-muted-foreground" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface PriorityPopoverProps {
  current: Priority
  onChange: (priority: Priority) => void
  children: React.ReactNode
}

export function PriorityPopover({ current, onChange, children }: PriorityPopoverProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Set priority</DropdownMenuLabel>
          {PRIORITY_ORDER.map((p) => (
            <DropdownMenuItem
              key={p}
              onClick={(e) => { e.stopPropagation(); onChange(p) }}
              className="gap-4"
            >
              <PriorityIcon priority={p} />
              <span className="flex-1">{PRIORITY_LABELS[p]}</span>
              {current === p && <Check className="size-3.5 text-muted-foreground" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface AssigneePopoverProps {
  current?: string
  onChange: (assigneeId: string | undefined) => void
  children: React.ReactNode
}

export function AssigneePopover({ current, onChange, children }: AssigneePopoverProps) {
  const { data: users = [] } = useQuery(usersQuery)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Assign to</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onChange(undefined) }}
            className="gap-3"
          >
            <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground">
              ?
            </div>
            <span className="flex-1">No assignee</span>
            {!current && <Check className="size-3.5 text-muted-foreground" />}
          </DropdownMenuItem>
          {users.map((a) => (
            <DropdownMenuItem
              key={a.id}
              onClick={(e) => { e.stopPropagation(); onChange(a.id) }}
              className="gap-4"
            >
              <div className="size-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground border border-black/50">
                {a.name ? a.name[0].toUpperCase() : '?'}
              </div>
              <span className="flex-1">{a.name}</span>
              {current === a.id && <Check className="size-3.5 text-muted-foreground" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
