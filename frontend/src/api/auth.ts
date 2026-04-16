import { api } from "./client"

export type User = {
  id: number
  username: string
  email: string
  created_at: string
}

export type RegisterPayload = {
  username: string
  email: string
  password: string
}

export type LoginPayload = {
  email: string
  password: string
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    api.post<User>("/auth/register", payload).then((r) => r.data),

  login: (payload: LoginPayload) =>
    api.post<User>("/auth/login", payload).then((r) => r.data),

  logout: () => api.post<void>("/auth/logout").then((r) => r.data),

  me: () => api.get<User>("/auth/me").then((r) => r.data),
}
