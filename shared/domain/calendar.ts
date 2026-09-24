/**
 * Calendar arithmetic on local dates of the household time zone.
 *
 * Rules reason in calendar days ("changed 5 days ago"), not in 24-hour spans, so that
 * DST changes and the time of day of a completion never shift a due date.
 * Instants are converted once, at the boundary, with the native Intl API.
 */

declare const localDateBrand: unique symbol

/** Calendar date without time nor zone, formatted `YYYY-MM-DD`. */
export type LocalDate = string & { readonly [localDateBrand]: true }

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 86_400_000

export function parseLocalDate(value: string): LocalDate {
  const match = LOCAL_DATE_PATTERN.exec(value)
  if (!match) {
    throw new RangeError(`Invalid local date "${value}", expected YYYY-MM-DD`)
  }
  const [, year, month, day] = match.map(Number) as [number, number, number, number]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError(`Invalid local date "${value}": day does not exist`)
  }
  return value as LocalDate
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    formatters.set(timeZone, formatter)
  }
  return formatter
}

/** Local date of an instant in the given IANA time zone (e.g. `Europe/Paris`). */
export function toLocalDate(instant: Date | string, timeZone: string): LocalDate {
  const date = typeof instant === 'string' ? new Date(instant) : instant
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid instant "${String(instant)}"`)
  }
  const parts = getFormatter(timeZone).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}` as LocalDate
}

function toEpochDay(date: LocalDate): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  return Date.UTC(year, month - 1, day) / MS_PER_DAY
}

function fromEpochDay(epochDay: number): LocalDate {
  return new Date(epochDay * MS_PER_DAY).toISOString().slice(0, 10) as LocalDate
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromEpochDay(toEpochDay(date) + days)
}

/** Number of calendar days from `from` to `to` (negative when `to` is earlier). */
export function diffInDays(from: LocalDate, to: LocalDate): number {
  return toEpochDay(to) - toEpochDay(from)
}

/** ISO day of week: 1 = Monday … 7 = Sunday. */
export function isoDayOfWeek(date: LocalDate): number {
  const day = new Date(toEpochDay(date) * MS_PER_DAY).getUTCDay()
  return day === 0 ? 7 : day
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: LocalDate): LocalDate {
  return addDays(date, 1 - isoDayOfWeek(date))
}

/** Sunday of the week containing `date`. */
export function endOfWeek(date: LocalDate): LocalDate {
  return addDays(startOfWeek(date), 6)
}

/** Both bounds inclusive. */
export function isWithin(date: LocalDate, start: LocalDate, end: LocalDate): boolean {
  return date >= start && date <= end
}
