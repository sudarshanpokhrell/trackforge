import { meQuery } from "@/hooks/use-auth"
import { projectsQuery } from "@/hooks/use-projects"
import { api } from "@/lib/api"
import type { AssignableRole, CreateUserInput, User } from "@/types/auth"
import type { ProjectRef } from "@/types/projects"
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"

/**
 * Admins and the superadmin get every user; everyone else only active ones,
 * which is all a project admin needs to add people.
 */
export const usersQuery = queryOptions({
  queryKey: ["users"],
  queryFn: async () => {
    const { users } = await api.get("users").json<{users:User[]}>()
    return users
  },
})

type UserResponse = { user: User }

function useInvalidateUsers() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: usersQuery.queryKey })
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers()

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      return api.post("users", { json: input }).json<UserResponse>()
    },
    onSuccess: invalidate,
  })
}

/** Changing a role is superadmin-only; admins may only rename members. */
export function useUpdateUser() {
  const invalidate = useInvalidateUsers()

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; role?: AssignableRole }) =>
      api.patch(`users/${id}`, { json: input }).json<UserResponse>(),
    onSuccess: invalidate,
  })
}

export function useDeactivateUser() {
  const invalidate = useInvalidateUsers()

  return useMutation({
    mutationFn: (id: string) =>
      api
        .post(`users/${id}/deactivate`)
        .json<UserResponse & { orphaned_projects: ProjectRef[] }>(),
    onSuccess: invalidate,
  })
}

export function useReactivateUser() {
  const invalidate = useInvalidateUsers()

  return useMutation({
    mutationFn: (id: string) =>
      api.post(`users/${id}/reactivate`).json<UserResponse>(),
    onSuccess: invalidate,
  })
}

export function useResetUserPassword() {
  const invalidate = useInvalidateUsers()

  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post(`users/${id}/reset-password`, { json: { password } }).json<UserResponse>(),
    onSuccess: invalidate,
  })
}

/** The caller stops being the superadmin, so everything role-dependent refetches. */
export function useMakeSuperadmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      api.post(`users/${id}/make-superadmin`).json<UserResponse>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meQuery.queryKey })
      queryClient.invalidateQueries({ queryKey: usersQuery.queryKey })
      queryClient.invalidateQueries({ queryKey: projectsQuery.queryKey })
    },
  })
}
