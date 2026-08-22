export type Priority = 'no-priority' | 'urgent' | 'high' | 'medium' | 'low'
export type Status = 'in-progress' | 'todo' | 'done' | 'backlog' | 'cancelled' | 'duplicate'
export type Tab = 'active' | 'backlog' | 'all'

export interface Issue {
  id: string
  title: string
  status: Status
  priority: Priority
  label?: string
  labelColor?: string
  date: string
  project?: string
  assignee?: string
}

export const STATUS_ORDER: Status[] = [
  'in-progress',
  'todo',
  'done',
  'backlog',
  'cancelled',
  'duplicate',
]

export const STATUS_LABELS: Record<Status, string> = {
  'in-progress': 'In Progress',
  'todo': 'Todo',
  'done': 'Done',
  'backlog': 'Backlog',
  'cancelled': 'Cancelled',
  'duplicate': 'Duplicate',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  'no-priority': 'No Priority',
  'urgent': 'Urgent',
  'high': 'High',
  'medium': 'Medium',
  'low': 'Low',
}

export const PRIORITY_ORDER: Priority[] = [
  'no-priority',
  'urgent',
  'high',
  'medium',
  'low',
]

export const MOCK_ASSIGNEES = [
  { id: 'alice', name: 'Alice', initials: 'A', color: 'bg-gradient-to-b from-zinc-600 to-zinc-800 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-black/50' },
  { id: 'bob', name: 'Bob', initials: 'B', color: 'bg-gradient-to-b from-slate-600 to-slate-800 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-black/50' },
  { id: 'carol', name: 'Carol', initials: 'C', color: 'bg-gradient-to-b from-neutral-600 to-neutral-800 text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-black/50' },
  { id: 'dave', name: 'Dave', initials: 'D', color: 'bg-gradient-to-b from-stone-600 to-stone-800 text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-black/50' },
  { id: 'eve', name: 'Eve', initials: 'E', color: 'bg-gradient-to-b from-gray-600 to-gray-800 text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-black/50' },
]

export const ALL_LABELS = [
  { name: 'Bug', color: 'bg-red-500' },
  { name: 'Feature', color: 'bg-blue-500' },
  { name: 'Improvement', color: 'bg-emerald-500' },
  { name: 'Design', color: 'bg-purple-500' },
]
