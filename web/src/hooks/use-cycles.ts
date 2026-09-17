import { projectIssuesQuery } from "@/hooks/use-issues"
import { projectQuery, projectsQuery } from "@/hooks/use-projects"
import { api } from "@/lib/api"
import type { Cycle, CycleInput } from "@/types/cycles"
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"

export const cyclesQuery = (projectId: number) =>
  queryOptions({
    queryKey: ["projects", projectId, "cycles"],
    queryFn: async () => {
      const { cycles } = await api
        .get(`projects/${projectId}/cycles`)
        .json<{ cycles: Cycle[] }>()
      return cycles
    },
  })

// Completing or deleting a cycle moves issues, so issue lists refresh too.
function useInvalidateCycles(projectId: number) {
  const client = useQueryClient()

  return () => {
    client.invalidateQueries({ queryKey: cyclesQuery(projectId).queryKey })
    client.invalidateQueries({ queryKey: projectIssuesQuery(projectId).queryKey })
    client.invalidateQueries({ queryKey: ["issues"] })
  }
}

/** Project admins only. Turning sprints off fails (422) while one is still open. */
export function useSetCyclesEnabled(projectId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (enabled: boolean) =>
      api
        .put(`projects/${projectId}/cycles-enabled`, { json: { enabled } })
        .json<{ cycles_enabled: boolean }>(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: projectQuery(projectId).queryKey })
      client.invalidateQueries({ queryKey: projectsQuery.queryKey })
    },
  })
}

export function useCreateCycle(projectId: number) {
  const invalidate = useInvalidateCycles(projectId)

  return useMutation({
    mutationFn: (input: CycleInput) =>
      api.post(`projects/${projectId}/cycles`, { json: input }).json<{ cycle: Cycle }>(),
    onSuccess: invalidate,
  })
}

export function useUpdateCycle(projectId: number) {
  const invalidate = useInvalidateCycles(projectId)

  return useMutation({
    mutationFn: ({ cycleId, ...input }: Partial<CycleInput> & { cycleId: number }) =>
      api
        .patch(`projects/${projectId}/cycles/${cycleId}`, { json: input })
        .json<{ cycle: Cycle }>(),
    onSuccess: invalidate,
  })
}

/** The cycle's issues stay, with no cycle. */
export function useDeleteCycle(projectId: number) {
  const invalidate = useInvalidateCycles(projectId)

  return useMutation({
    mutationFn: (cycleId: number) =>
      api.delete(`projects/${projectId}/cycles/${cycleId}`).json(),
    onSuccess: invalidate,
  })
}

/** Open issues move to `moveTo` (another uncompleted cycle) or to no cycle. */
export function useCompleteCycle(projectId: number) {
  const invalidate = useInvalidateCycles(projectId)

  return useMutation({
    mutationFn: ({ cycleId, moveTo }: { cycleId: number; moveTo: number | null }) =>
      api
        .post(`projects/${projectId}/cycles/${cycleId}/complete`, {
          json: { move_open_issues_to: moveTo },
        })
        .json<{ cycle: Cycle; moved_issue_count: number }>(),
    onSuccess: invalidate,
  })
}
