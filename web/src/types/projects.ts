export interface Project {
  id: number
  name: string
  description: string
  start_date: string | null
  target_date: string | null
  created_by: string
  created_at: string
  updated_at: string
  version: number
}

export interface ProjectMember {
  user_id: string
  name: string
  email: string
  is_active: boolean
  joined_at: string
}

/**
 * What the current user may do with this project. The server decides it per
 * request, so the UI never re-derives permissions from the user's role.
 */
export interface ProjectAccess {
  is_admin: boolean
  is_member: boolean
}

export interface ProjectDetails extends Project {
  members: ProjectMember[]
  my_access: ProjectAccess
}

export type CreateProjectInput = {
  name: string
  description: string
  start_date?: string | null
  target_date?: string | null
}

export type UpdateProjectInput = Partial<CreateProjectInput>
