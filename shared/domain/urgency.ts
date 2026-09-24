import { addDays, endOfWeek, startOfWeek, type LocalDate } from './calendar'
import type { TaskProgress } from './progress'
import type { QuotaTask, Task, Vacation } from './types'
import { activeDaysBetween } from './vacation'

export interface QuotaProgress {
  done: number
  /** Weekly quota, prorated when part of the week is spent on vacation. */
  target: number
  remaining: number
}

export function computeQuotaProgress(
  task: QuotaTask,
  completionsThisWeek: number,
  today: LocalDate,
  vacations: readonly Vacation[],
): QuotaProgress {
  const weekStart = startOfWeek(today)
  const activeDaysInWeek = activeDaysBetween(addDays(weekStart, -1), endOfWeek(today), vacations)
  const target = Math.round(task.weeklyQuota * activeDaysInWeek / 7)
  return { done: completionsThisWeek, target, remaining: Math.max(0, target - completionsThisWeek) }
}

export interface Urgency {
  /**
   * Comparable across task types: 0 = nothing to do, 1 = must be done today, > 1 = behind.
   * - periodic: elapsed days / interval
   * - quota: remaining completions / remaining active days of the week
   */
  score: number
  /** A signal (manual, or automatic once the max delay is exceeded) puts the task on top. */
  triggeredBySignal: boolean
}

const NONE: Urgency = { score: 0, triggeredBySignal: false }

export function computeUrgency(task: Task, progress: TaskProgress, today: LocalDate, vacations: readonly Vacation[]): Urgency {
  switch (task.type) {
    case 'periodic': {
      if (progress.lastCompletedOn === null) {
        return { score: 1, triggeredBySignal: false }
      }
      return { score: activeDaysBetween(progress.lastCompletedOn, today, vacations) / task.intervalDays, triggeredBySignal: false }
    }
    case 'quota': {
      // One occurrence per day is enough to be offered as a quest.
      if (progress.completedTodayBy.size > 0) {
        return NONE
      }
      const { remaining } = computeQuotaProgress(task, progress.completionsThisWeek, today, vacations)
      const remainingActiveDays = activeDaysBetween(addDays(today, -1), endOfWeek(today), vacations)
      return remaining > 0 ? { score: remaining / Math.max(1, remainingActiveDays), triggeredBySignal: false } : NONE
    }
    case 'signal': {
      if (progress.hasOpenSignal || isSignalOverdue(task.maxDelayDays, progress.lastCompletedOn, today, vacations)) {
        return { score: 1, triggeredBySignal: true }
      }
      return NONE
    }
  }
}

/**
 * The hygiene safety net of signal tasks. A task never done has no reference date and is
 * not considered overdue: it waits for its first manual signal.
 */
function isSignalOverdue(maxDelayDays: number | null, lastCompletedOn: LocalDate | null, today: LocalDate, vacations: readonly Vacation[]): boolean {
  if (maxDelayDays === null || lastCompletedOn === null) {
    return false
  }
  return activeDaysBetween(lastCompletedOn, today, vacations) >= maxDelayDays
}
