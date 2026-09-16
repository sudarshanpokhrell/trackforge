import { api } from "@/lib/api"
import type {
  CreateProjectInput,
  Project,
  ProjectComment,
  ProjectDetails,
  ProjectRole,
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
    onSuccess: ({ project }) => {
      // Write the result in straight away so inline edits don't flash the old
      // value until the refetch lands.
      client.setQueryData(projectQuery(id).queryKey, (old) =>
        old ? { ...old, ...project } : old
      )
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

export function useAddProjectMember(projectId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
      api
        .post(`projects/${projectId}/members`, { json: { user_id: userId, role } })
        .json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: projectQuery(projectId).queryKey })
    },
  })
}

/** The server refuses (422) to demote a project's last admin. */
export function useUpdateProjectMemberRole(projectId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
      api
        .patch(`projects/${projectId}/members/${userId}`, { json: { role } })
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
      // Removing yourself can take the project out of your list.
      client.invalidateQueries({ queryKey: projectsQuery.queryKey })
    },
  })
}

// Project comments

export const projectCommentsQuery = (projectId: number) =>
  queryOptions({
    queryKey: ["projects", projectId, "comments"],
    queryFn: async () => {
      const { comments } = await api
        .get(`projects/${projectId}/comments`)
        .json<{ comments: ProjectComment[] }>()
      return comments
    },
  })

export function useCreateProjectComment(projectId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (content: string) =>
      api
        .post(`projects/${projectId}/comments`, { json: { content } })
        .json<{ comment: ProjectComment }>(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: projectCommentsQuery(projectId).queryKey })
    },
  })
}

export function useUpdateProjectComment(projectId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      api
        .patch(`projects/${projectId}/comments/${commentId}`, { json: { content } })
        .json<{ comment: ProjectComment }>(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: projectCommentsQuery(projectId).queryKey })
    },
  })
}

export function useDeleteProjectComment(projectId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (commentId: number) =>
      api.delete(`projects/${projectId}/comments/${commentId}`).json(),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: projectCommentsQuery(projectId).queryKey })
    },
  })
}
