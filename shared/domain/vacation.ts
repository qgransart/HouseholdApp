import { addDays, diffInDays, isWithin, type LocalDate } from './calendar'
import type { Vacation } from './types'

export function isOnVacation(date: LocalDate, vacations: readonly Vacation[]): boolean {
  return vacations.some(vacation => isWithin(date, vacation.startsOn, vacation.endsOn))
}

/**
 * Days of the half-open range ]from, to] that are not covered by a vacation.
 * Vacations freeze time: a task left during a holiday does not age (CONCEPT §5).
 */
export function activeDaysBetween(from: LocalDate, to: LocalDate, vacations: readonly Vacation[]): number {
  const total = diffInDays(from, to)
  if (total <= 0) {
    return total
  }
  const rangeStart = addDays(from, 1)
  let frozen = 0
  for (const { startsOn, endsOn } of mergeVacations(vacations)) {
    const overlapStart = startsOn > rangeStart ? startsOn : rangeStart
    const overlapEnd = endsOn < to ? endsOn : to
    if (overlapStart <= overlapEnd) {
      frozen += diffInDays(overlapStart, overlapEnd) + 1
    }
  }
  return total - frozen
}

/** Sorts and merges overlapping or adjacent vacations so that no day is counted twice. */
function mergeVacations(vacations: readonly Vacation[]): Vacation[] {
  const sorted = [...vacations]
    .filter(vacation => vacation.startsOn <= vacation.endsOn)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
  const merged: Vacation[] = []
  for (const vacation of sorted) {
    const last = merged.at(-1)
    if (last && vacation.startsOn <= addDays(last.endsOn, 1)) {
      if (vacation.endsOn > last.endsOn) {
        last.endsOn = vacation.endsOn
      }
    }
    else {
      merged.push({ ...vacation })
    }
  }
  return merged
}
