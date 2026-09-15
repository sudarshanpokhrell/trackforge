import { api } from "@/lib/api"
import type { CreateUserInput, User } from "@/types/auth"
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"

export const usersQuery = queryOptions({
  queryKey: ["users"],
  queryFn: async () => {
    const { users } = await api.get("users").json<{users:User[]}>()
    return users
  },
})

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      return api.post("users", { json: input }).json<{user: User}>()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: usersQuery.queryKey})
    },
  })
}