import { addDays, type LocalDate } from './calendar'

/** State of a room as declared by the household at onboarding. */
export type RoomState = 'clean' | 'average' | 'dirty'

/** Share of the interval already elapsed for each declared state. */
const ELAPSED_SHARE: Readonly<Record<RoomState, number>> = {
  clean: 0.2,
  average: 0.6,
  dirty: 1,
}

/**
 * Baseline of a periodic task so that its freshness matches the declared state of its room
 * (clean → fresh, average → soon, dirty → due today), instead of every task starting as "to do".
 */
export function baselineForPeriodicTask(intervalDays: number, state: RoomState, today: LocalDate): LocalDate {
  return addDays(today, -Math.round(intervalDays * ELAPSED_SHARE[state]))
}
