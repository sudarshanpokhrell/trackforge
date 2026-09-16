export type Tab = 'active' | 'backlog' | 'all'

export {
  STATUS_ORDER,
  STATUS_LABELS,
  PRIORITY_ORDER,
  PRIORITY_LABELS,
} from '@/types/issues'

export type {
  Issue,
  IssueStatus as Status,
  IssuePriority as Priority,
  Assignee,
} from '@/types/issues'

// Keep ALL_LABELS as UI placeholder until labels feature is built in backend
export const ALL_LABELS = [
  { name: 'Bug', color: 'bg-red-500' },
  { name: 'Feature', color: 'bg-blue-500' },
  { name: 'Improvement', color: 'bg-emerald-500' },
  { name: 'Design', color: 'bg-purple-500' },
]
