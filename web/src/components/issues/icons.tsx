import {
  AlertCircleIcon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  CircleDashedIcon,
  CircleIcon,
  FullSignalIcon,
  LowSignalIcon,
  MediumSignalIcon,
  MinusSignIcon,
  Timer02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { cn } from '@/lib/utils'
import type { Status, Priority } from './types'


const statusConfig: Record<Status, { icon: IconSvgElement; className: string }> = {
  backlog: { icon: CircleDashedIcon, className: 'text-muted-foreground/50' },
  todo: { icon: CircleIcon, className: 'text-muted-foreground' },
  'in-progress': { icon: Timer02Icon, className: 'text-amber-400' },
  done: { icon: CheckmarkCircle02Icon, className: 'text-success' },
  cancelled: { icon: CancelCircleIcon, className: 'text-muted-foreground/60' },
}

export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const { icon, className: colorCls } = statusConfig[status] ?? statusConfig.backlog
  return <HugeiconsIcon icon={icon} className={cn('size-4 shrink-0', colorCls, className)} />
}


const priorityConfig: Record<Priority, { icon: IconSvgElement; className: string }> = {
  'no-priority': { icon: MinusSignIcon, className: 'text-gray-500' },
  low: { icon: LowSignalIcon, className: 'text-gray-500' },
  medium: { icon: MediumSignalIcon, className: 'text-gray-500' },
  high: { icon: FullSignalIcon, className: 'text-gray-500' },
  urgent: { icon: AlertCircleIcon, className: 'text-gray-500' },
}

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const { icon, className: colorCls } = priorityConfig[priority] ?? priorityConfig['no-priority']
  return <HugeiconsIcon icon={icon} className={cn('size-4 shrink-0', colorCls, className)} />
}
