/**
 * The API takes RFC 3339 timestamps, while <input type="date"> yields a bare
 * YYYY-MM-DD. Widen it to midnight UTC; an empty input means "no date".
 */
export function toDateTime(date: string): string | null {
  return date ? `${date}T00:00:00Z` : null
}

/** The inverse, for filling a date input from an API value. */
export function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ""
}
