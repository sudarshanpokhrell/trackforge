import type { IssueStatus } from "./issues"

/** Worked out by the server from the dates and completion, in the app's timezone. */
export type CycleStatus = "upcoming" | "active" | "overdue" | "completed"

/** A sprint. The API and database call them cycles. */
export interface Cycle {
  id: number
  project_id: number
  name: string
  description: string
  /** Midnight UTC of the first day; both dates are inclusive. */
  start_date: string
  end_date: string
  completed_at: string | null
  created_by: string | null
  version: number
  created_at: string
  updated_at: string
  status: CycleStatus
  /** How many of its issues have each status; statuses with none are absent. */
  issue_counts: Partial<Record<IssueStatus, number>>
}

export type CycleInput = {
  name: string
  description?: string
  start_date: string
  end_date: string
}

/** The snapshot a cycle_changed activity keeps. */
export interface CycleSummary {
  id: number
  name: string
}
