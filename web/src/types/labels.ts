export interface Label {
  id: number
  project_id: number
  name: string
  /** Hex, e.g. "#e11d48". */
  color: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type LabelInput = {
  name: string
  color: string
}

/** Offered when creating a label; any hex color is accepted. */
export const LABEL_COLORS = [
  '#e11d48',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#64748b',
]
