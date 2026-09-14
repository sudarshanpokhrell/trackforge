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


export type LoginResponse = {
  user: User
  token: string
}

export type AuthContext = {
  user: User | null
  isAuthenticated: boolean
  login: (input: LoginInput) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => Promise<void>
}
