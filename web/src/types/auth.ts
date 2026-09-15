export type UserRole = "superadmin" | "admin" | "member"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  is_active: boolean
  must_change_password: boolean
  created_at: string
  updated_at: string
}

export type LoginInput = {
  email: string
  password: string
}

export type SetupInput = LoginInput & {
  name: string
}

export type SetupStatus = {
  setup_required: boolean
  app_name: string
}

export type AssignableRole = Exclude<UserRole, "superadmin">

export type CreateUserInput = {
  name: string
  email: string
  role: AssignableRole
  password: string
}

export type ChangePasswordInput = {
  current_password: string
  new_password: string
}
