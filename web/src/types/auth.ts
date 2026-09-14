export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export type LoginInput = {
  email: string
  password: string
}

export type RegisterInput = LoginInput & {
  name: string
}
