import type { Issue } from './types'

export const globalIssues: Issue[] = [
  { id: 'SOF-1', title: 'Get familiar with Linear', status: 'in-progress', priority: 'high', project: 'TrackForge UI', assignee: 'alice', date: 'Aug 20' },
  { id: 'SOF-4', title: 'Set up your teams', status: 'todo', priority: 'medium', project: 'TrackForge UI', date: 'Aug 20' },
  { id: 'SOF-2', title: 'Connect your tools', status: 'todo', priority: 'high', project: 'Backend API', assignee: 'bob', date: 'Aug 20' },
  { id: 'SOF-3', title: 'Import your data', status: 'todo', priority: 'low', project: 'Backend API', date: 'Aug 20' },
  { id: 'SOF-5', title: 'Login Issues', status: 'done', priority: 'urgent', label: 'Bug', labelColor: 'bg-red-500', project: 'Backend API', assignee: 'eve', date: 'Aug 20' },
  { id: 'SOF-6', title: 'Add webhook support', status: 'backlog', priority: 'medium', project: 'TrackForge UI', date: 'Aug 18' },
  { id: 'SOF-7', title: 'Improve onboarding flow', status: 'backlog', priority: 'low', project: 'TrackForge UI', date: 'Aug 17' },
  { id: 'SOF-8', title: 'Duplicate auth flow', status: 'duplicate', priority: 'no-priority', project: 'Backend API', date: 'Aug 15' },
  { id: 'SOF-9', title: 'Old analytics dashboard', status: 'cancelled', priority: 'low', project: 'TrackForge UI', date: 'Aug 14' },
]

export const projectIssues: Record<string, Issue[]> = {
  'trackforge-ui': [
    { id: 'TF-1', title: 'Fix sidebar flickering on navigation', status: 'done', priority: 'high', assignee: 'alice', date: 'Aug 21' },
    { id: 'TF-2', title: 'Add dark mode toggle to navbar', status: 'in-progress', priority: 'medium', assignee: 'bob', date: 'Aug 21' },
    { id: 'TF-3', title: 'Responsive layout for mobile', status: 'todo', priority: 'medium', date: 'Aug 20' },
    { id: 'TF-4', title: 'Add keyboard shortcuts', status: 'todo', priority: 'low', date: 'Aug 20' },
    { id: 'TF-5', title: 'Component library documentation', status: 'backlog', priority: 'low', date: 'Aug 18' },
    { id: 'TF-6', title: 'Broken avatar on profile page', status: 'done', priority: 'urgent', label: 'Bug', labelColor: 'bg-red-500', assignee: 'alice', date: 'Aug 19' },
    { id: 'TF-7', title: 'Old landing page design', status: 'cancelled', priority: 'low', date: 'Aug 15' },
    { id: 'TF-8', title: 'Duplicate issue tracker widget', status: 'duplicate', priority: 'no-priority', date: 'Aug 13' },
  ],
  'backend-api': [
    { id: 'API-1', title: 'Set up authentication middleware', status: 'done', priority: 'high', assignee: 'eve', date: 'Aug 20' },
    { id: 'API-2', title: 'Create issues CRUD endpoints', status: 'in-progress', priority: 'high', assignee: 'bob', date: 'Aug 21' },
    { id: 'API-3', title: 'Add rate limiting', status: 'todo', priority: 'medium', date: 'Aug 20' },
    { id: 'API-4', title: 'Write API documentation', status: 'backlog', priority: 'low', date: 'Aug 17' },
    { id: 'API-5', title: '500 error on user creation', status: 'in-progress', priority: 'urgent', label: 'Bug', labelColor: 'bg-red-500', assignee: 'dave', date: 'Aug 21' },
    { id: 'API-6', title: 'Legacy auth endpoint cleanup', status: 'cancelled', priority: 'medium', date: 'Aug 16' },
  ],
}
