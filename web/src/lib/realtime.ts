import type { QueryClient, QueryKey } from '@tanstack/react-query'
import type { RealtimeEvent } from '@/types/realtime'

export const clientId = newClientId()

function newClientId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}


export function applyEvent(qc: QueryClient, e: RealtimeEvent) {
  const invalidate = (queryKey: QueryKey) => void qc.invalidateQueries({ queryKey })
  const p = e.project_id
  const i = e.issue_id

  switch (e.type) {
    case 'issue.created':
      invalidate(['projects', p, 'issues'])
      invalidate(['projects', p, 'cycles'])
      break

    case 'issue.updated':
      invalidate(['issues', i])
      invalidate(['projects', p, 'issues'])
      invalidate(['projects', p, 'cycles'])
      break

    case 'issue.deleted':
      qc.removeQueries({ queryKey: ['issues', i], type: 'inactive' })
      invalidate(['issues', i])
      invalidate(['projects', p, 'issues'])
      invalidate(['projects', p, 'cycles'])
      break

    case 'issue.comments.changed':
      invalidate(['issues', i, 'comments'])
      invalidate(['issues', i, 'activities'])
      break

    case 'project.comments.changed':
      invalidate(['projects', p, 'comments'])
      break

    case 'project.cycles.changed':
      invalidate(['projects', p])
      invalidate(['issues'])
      break

    case 'project.labels.changed':
      invalidate(['projects', p, 'labels'])
      invalidate(['projects', p, 'issues'])
      invalidate(['issues'])
      break

    case 'project.updated':
      invalidate(['projects'])
      break

    case 'project.deleted':
      qc.removeQueries({ queryKey: ['projects', p], type: 'inactive' })
      invalidate(['projects'])
      break

    case 'membership.changed':
      invalidate(['projects'])
      break

    case 'users.changed':
      invalidate(['users'])
      invalidate(['me'])
      break
  }
}
