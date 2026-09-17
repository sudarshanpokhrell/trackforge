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

/**
 * An API date as that calendar day in local time. Read with `new Date`, midnight
 * UTC would be the day before for anyone west of UTC.
 */
export function fromApiDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = toDateInput(value).split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** A local calendar day as the API's midnight-UTC timestamp. */
export function toApiDate(day: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T00:00:00Z`
}
