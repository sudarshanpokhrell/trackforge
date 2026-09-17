import { api } from '@/lib/api'
import type {
  Assignee,
  CreateIssueInput,
  Issue,
  IssueActivity,
  IssueComment,
  UpdateIssueInput,
} from '@/types/issues'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

export const projectIssuesQuery = (projectId: number) =>
  queryOptions({
    queryKey: ['projects', projectId, 'issues'],
    queryFn: async () => {
      const { issues } = await api
        .get(`projects/${projectId}/issues`)
        .json<{ issues: Issue[] }>()
      return issues
    },
  })

export const issueQuery = (issueId: number) =>
  queryOptions({
    queryKey: ['issues', issueId],
    queryFn: async () => {
      const { issue } = await api.get(`issues/${issueId}`).json<{ issue: Issue }>()
      return issue
    },
  })

export const issueCommentsQuery = (issueId: number) =>
  queryOptions({
    queryKey: ['issues', issueId, 'comments'],
    queryFn: async () => {
      const { comments } = await api
        .get(`issues/${issueId}/comments`)
        .json<{ comments: IssueComment[] }>()
      return comments
    },
  })

export const issueActivitiesQuery = (issueId: number) =>
  queryOptions({
    queryKey: ['issues', issueId, 'activities'],
    queryFn: async () => {
      const { activities } = await api
        .get(`issues/${issueId}/activities`)
        .json<{ activities: IssueActivity[] }>()
      return activities
    },
  })

export function useCreateIssue(projectId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateIssueInput) =>
      api.post(`projects/${projectId}/issues`, { json: input }).json<{ issue: Issue }>(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: projectIssuesQuery(projectId).queryKey })
    },
  })
}


export function useUpdateIssue(issue: Pick<Issue, 'id' | 'project_id'>) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateIssueInput) =>
      api.patch(`issues/${issue.id}`, { json: input }).json<{ issue: Issue }>(),
    onSuccess: ({ issue: updated }) => {
      client.setQueryData(issueQuery(issue.id).queryKey, updated)
      client.invalidateQueries({ queryKey: issueActivitiesQuery(issue.id).queryKey })
      client.invalidateQueries({
        queryKey: projectIssuesQuery(issue.project_id).queryKey,
      })
      // Sprint progress counts issues by status.
      client.invalidateQueries({ queryKey: ['projects', issue.project_id, 'cycles'] })
    },
  })
}

export function useDeleteIssue(projectId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (issueId: number) => api.delete(`issues/${issueId}`).json(),
    onSuccess: (_, issueId) => {
      client.removeQueries({ queryKey: issueQuery(issueId).queryKey })
      client.invalidateQueries({ queryKey: projectIssuesQuery(projectId).queryKey })
      client.invalidateQueries({ queryKey: ['projects', projectId, 'cycles'] })
    },
  })
}

function useAssigneeMutation(
  issue: Pick<Issue, 'id' | 'project_id'>,
  run: (userId: string) => Promise<unknown>
) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: issueQuery(issue.id).queryKey })
      client.invalidateQueries({ queryKey: issueActivitiesQuery(issue.id).queryKey })
      client.invalidateQueries({
        queryKey: projectIssuesQuery(issue.project_id).queryKey,
      })
    },
  })
}

export function useAddAssignee(issue: Pick<Issue, 'id' | 'project_id'>) {
  return useAssigneeMutation(issue, (userId) =>
    api
      .post(`issues/${issue.id}/assignees`, { json: { user_id: userId } })
      .json<{ assignee: Assignee }>()
  )
}

export function useRemoveAssignee(issue: Pick<Issue, 'id' | 'project_id'>) {
  return useAssigneeMutation(issue, (userId) =>
    api.delete(`issues/${issue.id}/assignees/${userId}`).json()
  )
}

export function useCreateIssueComment(issueId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (content: string) =>
      api
        .post(`issues/${issueId}/comments`, { json: { content } })
        .json<{ comment: IssueComment }>(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: issueCommentsQuery(issueId).queryKey })
    },
  })
}

export function useUpdateIssueComment(issueId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      api
        .patch(`issues/${issueId}/comments/${commentId}`, { json: { content } })
        .json<{ comment: IssueComment }>(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: issueCommentsQuery(issueId).queryKey })
    },
  })
}

export function useDeleteIssueComment(issueId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (commentId: number) =>
      api.delete(`issues/${issueId}/comments/${commentId}`).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: issueCommentsQuery(issueId).queryKey })
    },
  })
}
