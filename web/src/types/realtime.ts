export const EVENT_TYPES = [
  'issue.created',
  'issue.updated',
  'issue.deleted',
  'issue.comments.changed',
  'project.comments.changed',
  'project.cycles.changed',
  'project.labels.changed',
  'project.updated',
  'project.deleted',
  'membership.changed',
  'users.changed',
] as const

export type RealtimeEventType = (typeof EVENT_TYPES)[number]

export interface RealtimeEvent {
  type: RealtimeEventType
  project_id?: number
  issue_id?: number
  user_id?: string
  actor_id: string
  client_id?: string
}
