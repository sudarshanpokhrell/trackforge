import axios from "axios"
import type { AxiosResponse } from "axios"

const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
})

export const issuesApi = {
  getAll: (): Promise<AxiosResponse> => api.get("/issues"),
  getOne: (id: string): Promise<AxiosResponse> => api.get(`/issues/${id}`),
  create: (data: unknown): Promise<AxiosResponse> => api.post("/issues", data),
  update: (id: string, data: unknown): Promise<AxiosResponse> =>
    api.put(`/issues/${id}`, data),
  delete: (id: string): Promise<AxiosResponse> => api.delete(`/issues/${id}`),
}
