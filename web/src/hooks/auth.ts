import { api, isApiError } from "@/lib/api"
import type {
  LoginInput,
  LoginResponse,
  RegisterInput,
  User,
} from "@/types/auth"
import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<User | null> => {
    try {
      return await api.get("/auth/me").json<User>()
    } catch (e) {
      if (isApiError(e, 401)) return null
      throw e
    }
  },
  //????
  staleTime: Infinity,
  retry: false,
})

export function useUser() {
  const { data } = useSuspenseQuery(meQuery)
  return data
}

export function useLogin() {
  const client = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (input: LoginInput) =>
      api.post("auth/login", { json: input }).json<LoginResponse>(),

    onSuccess: async (data) => {
      client.setQueryData(meQuery.queryKey, data.user)
      await router.invalidate()
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post("auth/register", { json: input }).json<User>(),
  })
}

export function useLogout() {
  const client = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: () => api.post("auth/logout"),
    onSettled: async () => {
      client.setQueryData(meQuery.queryKey, null)
      await router.invalidate()
    },
  })
}
