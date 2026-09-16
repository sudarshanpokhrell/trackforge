import { api } from '@/lib/api'
import { issueActivitiesQuery, issueQuery, projectIssuesQuery } from '@/hooks/use-issues'
import type { Issue, LabelSummary } from '@/types/issues'
import type { Label, LabelInput } from '@/types/labels'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

export const projectLabelsQuery = (projectId: number) =>
  queryOptions({
    queryKey: ['projects', projectId, 'labels'],
    queryFn: async () => {
      const { labels } = await api
        .get(`projects/${projectId}/labels`)
        .json<{ labels: Label[] }>()
      return labels
    },
  })

// Issues embed their labels, so renaming or deleting one refreshes them too.
function useInvalidateLabels(projectId: number) {
  const client = useQueryClient()

  return () => {
    client.invalidateQueries({ queryKey: projectLabelsQuery(projectId).queryKey })
    client.invalidateQueries({ queryKey: projectIssuesQuery(projectId).queryKey })
    client.invalidateQueries({ queryKey: ['issues'] })
  }
}

export function useCreateLabel(projectId: number) {
  const invalidate = useInvalidateLabels(projectId)

  return useMutation({
    mutationFn: (input: LabelInput) =>
      api.post(`projects/${projectId}/labels`, { json: input }).json<{ label: Label }>(),
    onSuccess: invalidate,
  })
}

export function useUpdateLabel(projectId: number) {
  const invalidate = useInvalidateLabels(projectId)

  return useMutation({
    mutationFn: ({ labelId, ...input }: Partial<LabelInput> & { labelId: number }) =>
      api
        .patch(`projects/${projectId}/labels/${labelId}`, { json: input })
        .json<{ label: Label }>(),
    onSuccess: invalidate,
  })
}

export function useDeleteLabel(projectId: number) {
  const invalidate = useInvalidateLabels(projectId)

  return useMutation({
    mutationFn: (labelId: number) =>
      api
        .delete(`projects/${projectId}/labels/${labelId}`)
        .json<{ issue_count: number }>(),
    onSuccess: invalidate,
  })
}

function useIssueLabelMutation<T>(
  issue: Pick<Issue, 'id' | 'project_id'>,
  run: (labelId: number) => Promise<T>
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

export function useAddIssueLabel(issue: Pick<Issue, 'id' | 'project_id'>) {
  return useIssueLabelMutation(issue, (labelId) =>
    api
      .post(`issues/${issue.id}/labels`, { json: { label_id: labelId } })
      .json<{ label: LabelSummary }>()
  )
}

export function useRemoveIssueLabel(issue: Pick<Issue, 'id' | 'project_id'>) {
  return useIssueLabelMutation(issue, (labelId) =>
    api.delete(`issues/${issue.id}/labels/${labelId}`).json()
  )
}
