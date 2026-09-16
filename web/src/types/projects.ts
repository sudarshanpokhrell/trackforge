export type ProjectRole = "admin" | "contributor"

export interface Project {
  id: number
  name: string
  description: string
  /** "" when the project has none. */
  emoji: string
  start_date: string | null
  target_date: string | null
  created_by: string
  created_at: string
  updated_at: string
  version: number
  /** The current user's role in the project. Absent for the superadmin outside it. */
  my_role?: ProjectRole
}

export interface ProjectMember {
  user_id: string
  name: string
  email: string
  is_active: boolean
  role: ProjectRole
  joined_at: string
}

/**
 * What the current user may do with this project. The server decides it per
 * request, so the UI never re-derives permissions from the user's role.
 */
export interface ProjectAccess {
  /** Absent when the current user isn't a member (only the superadmin gets in then). */
  role?: ProjectRole
  is_superadmin: boolean
  /** Project admins and the superadmin: settings, members and their roles. */
  can_manage: boolean
}

export interface ProjectDetails extends Project {
  members: ProjectMember[]
  my_access: ProjectAccess
}

export type CreateProjectInput = {
  name: string
  description: string
  emoji?: string
  start_date?: string | null
  target_date?: string | null
}

export type UpdateProjectInput = Partial<CreateProjectInput>

export interface ProjectRef {
  id: number
  name: string
}
