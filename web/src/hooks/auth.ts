import { api, isApiError } from "@/lib/api"
import type { LoginInput, RegisterInput, User } from "@/types/auth"
import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"

type UserResponse = { user: User }

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<User | null> => {
    try {
      const { user } = await api.get("auth/me").json<UserResponse>()
      return user
    } catch (e) {
      if (isApiError(e, 401)) return null
      throw e
    }
  },

  staleTime: Infinity,
  retry: false,
})

export function useUser() {
  const { data } = useSuspenseQuery(meQuery)
  return data
}

function login(input: LoginInput) {
  return api.post("auth/login", { json: input }).json<UserResponse>()
}

export function useLogin() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: login,
    onSuccess: ({ user }) => {
      client.setQueryData(meQuery.queryKey, user)
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post("auth/register", { json: input }).json<UserResponse>(),
  })
}

export function useLogout() {
  const client = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: () => api.post("auth/logout"),
    onSettled: async () => {
      client.clear()
      client.setQueryData(meQuery.queryKey, null)
      await router.navigate({ to: "/login", replace: true })
    },
  })
}
