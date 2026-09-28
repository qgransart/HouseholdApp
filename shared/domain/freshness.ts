import { FRESHNESS_DUE_THRESHOLD, FRESHNESS_FRESH_THRESHOLD } from './config'
import type { LocalDate } from './calendar'
import type { Vacation } from './types'
import { activeDaysBetween } from './vacation'

export type FreshnessStatus = 'fresh' | 'soon' | 'due' | 'late'

export interface Freshness {
  /** 1 = just done, 0 = due today or overdue. */
  ratio: number
  status: FreshnessStatus
  /** Active (non-vacation) days since the last completion; `null` if never done. */
  elapsedDays: number | null
  /** Days past the due date; 0 unless `status` is `late`. */
  daysOverdue: number
}

/**
 * Freshness of a periodic task (CONCEPT §5).
 * A task becomes `due` on its due date and `late` only from the day after, so that a daily
 * task done yesterday reads "to do today" rather than "late". A task never done is `due`.
 */
export function computeFreshness(
  intervalDays: number,
  lastCompletedOn: LocalDate | null,
  today: LocalDate,
  vacations: readonly Vacation[],
): Freshness {
  if (lastCompletedOn === null) {
    return { ratio: 0, status: 'due', elapsedDays: null, daysOverdue: 0 }
  }
  const elapsedDays = Math.max(0, activeDaysBetween(lastCompletedOn, today, vacations))
  // (interval − elapsed) / interval rather than 1 − elapsed / interval: exact on the thresholds.
  const ratio = Math.min(1, Math.max(0, (intervalDays - elapsedDays) / intervalDays))
  const daysOverdue = Math.max(0, elapsedDays - intervalDays)

  return { ratio, status: toStatus(ratio, daysOverdue), elapsedDays, daysOverdue }
}

function toStatus(ratio: number, daysOverdue: number): FreshnessStatus {
  if (daysOverdue > 0) {
    return 'late'
  }
  if (ratio < FRESHNESS_DUE_THRESHOLD) {
    return 'due'
  }
  if (ratio <= FRESHNESS_FRESH_THRESHOLD) {
    return 'soon'
  }
  return 'fresh'
}
