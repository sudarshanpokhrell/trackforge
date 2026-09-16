export type IssueStatus = 'backlog' | 'todo' | 'in-progress' | 'done' | 'cancelled'

export type IssuePriority = 'no-priority' | 'urgent' | 'high' | 'medium' | 'low'

export const STATUS_ORDER: IssueStatus[] = [
  'in-progress',
  'todo',
  'backlog',
  'done',
  'cancelled',
]

export const STATUS_LABELS: Record<IssueStatus, string> = {
  'in-progress': 'In Progress',
  todo: 'Todo',
  backlog: 'Backlog',
  done: 'Done',
  cancelled: 'Cancelled',
}

export const PRIORITY_ORDER: IssuePriority[] = [
  'urgent',
  'high',
  'medium',
  'low',
  'no-priority',
]

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  'no-priority': 'No priority',
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export interface Assignee {
  id: string
  name: string
}

export interface Issue {
  id: number
  project_id: number
  author_id: string
  title: string
  description: string | null
  status: IssueStatus
  priority: IssuePriority
  version: number
  created_at: string
  updated_at: string
  assignees: Assignee[]
}

export type CreateIssueInput = {
  title: string
  description?: string | null
  status?: IssueStatus
  priority?: IssuePriority
}

export type UpdateIssueInput = Partial<CreateIssueInput>

export interface UserSummary {
  id: string
  name: string
  email: string
}

export interface IssueComment {
  id: number
  issue_id: number
  author_id: string
  author?: UserSummary
  content: string
  version: number
  created_at: string
  updated_at: string
}

export type IssueActivityType =
  | 'created'
  | 'title_changed'
  | 'description_changed'
  | 'status_changed'
  | 'priority_changed'
  | 'assignee_changed'
  | 'label_added'
  | 'label_removed'

export interface IssueActivity {
  id: number
  issue_id: number
  type: IssueActivityType
  actor_id: string
  actor?: UserSummary
  /** Shape varies by type, e.g. { from: "todo", to: "done" }. */
  payload: Record<string, unknown>
  created_at: string
}
