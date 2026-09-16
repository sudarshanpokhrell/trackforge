import { api } from "@/lib/api"
import type {
  CreateProjectInput,
  Project,
  ProjectDetails,
  UpdateProjectInput,
} from "@/types/projects"
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: async () => {
    const { projects } = await api.get("projects").json<{ projects: Project[] }>()
    return projects
  },
})

export const projectQuery = (id: number) =>
  queryOptions({
    queryKey: ["projects", id],
    queryFn: async () => {
      const { project } = await api
        .get(`projects/${id}`)
        .json<{ project: ProjectDetails }>()
      return project
    },
  })

export function useCreateProject() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      api.post("projects", { json: input }).json<{ project: Project }>(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: projectsQuery.queryKey })
    },
  })
}

export function useUpdateProject(id: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateProjectInput) =>
      api.put(`projects/${id}`, { json: input }).json<{ project: Project }>(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: projectQuery(id).queryKey })
      client.invalidateQueries({ queryKey: projectsQuery.queryKey })
    },
  })
}

export function useDeleteProject() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.delete(`projects/${id}`).json(),
    onSuccess: (_, id) => {
      client.removeQueries({ queryKey: projectQuery(id).queryKey })
      client.invalidateQueries({ queryKey: projectsQuery.queryKey })
    },
  })
}

/**
 * Membership is yes/no — there is no role to send. What a member may do comes
 * from their app-wide role.
 */
export function useAddProjectMember(projectId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      api
        .post(`projects/${projectId}/members`, { json: { user_id: userId } })
        .json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: projectQuery(projectId).queryKey })
    },
  })
}

export function useRemoveProjectMember(projectId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`projects/${projectId}/members/${userId}`).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: projectQuery(projectId).queryKey })
    },
  })
}
