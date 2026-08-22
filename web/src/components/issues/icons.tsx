import {
  Circle,
  CircleDashed,
  CircleCheck,
  CircleX,
  Copy,
  Timer,
  Minus,
  SignalLow,
  SignalMedium,
  SignalHigh,
  CircleAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Status, Priority } from './types'


const statusConfig: Record<Status, { icon: React.ElementType; className: string }> = {
  backlog: { icon: CircleDashed, className: 'text-muted-foreground/50' },
  todo: { icon: Circle, className: 'text-muted-foreground' },
  'in-progress': { icon: Timer, className: 'text-amber-400' },
  done: { icon: CircleCheck, className: 'text-blue-500' },
  cancelled: { icon: CircleX, className: 'text-muted-foreground/60' },
  duplicate: { icon: Copy, className: 'text-muted-foreground/50' },
}

export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const { icon: Icon, className: colorCls } = statusConfig[status] ?? statusConfig.backlog
  return <Icon className={cn('size-4 shrink-0', colorCls, className)} />
}


const priorityConfig: Record<Priority, { icon: React.ElementType; className: string }> = {
  'no-priority': { icon: Minus, className: 'text-gray-500' },
  low: { icon: SignalLow, className: 'text-gray-500' },
  medium: { icon: SignalMedium, className: 'text-gray-500' },
  high: { icon: SignalHigh, className: 'text-gray-500' },
  urgent: { icon: CircleAlert, className: 'text-gray-500' },
}

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const { icon: Icon, className: colorCls } = priorityConfig[priority] ?? priorityConfig['no-priority']
  return <Icon className={cn('size-4 shrink-0', colorCls, className)} />
}
