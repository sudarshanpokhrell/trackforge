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
  LabelSummary,
} from '@/types/issues'
