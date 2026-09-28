import { addDays, endOfWeek, isWithin, startOfWeek, toLocalDate, type LocalDate } from './calendar'
import { POINTS_BY_SIZE, STREAK_JOKERS_PER_MONTH, WEEKLY_GAUGE_TARGET_RATIO } from './config'
import { isEffective } from './progress'
import type { Completion, Task, Vacation } from './types'
import { activeDaysBetween } from './vacation'

/**
 * Expected XP for a full week if the active catalogue is followed (bonuses excluded).
 * Signal tasks are estimated from their max delay; without one, their pace is unknown.
 */
export function computeTheoreticalWeeklyXp(tasks: readonly Task[]): number {
  return tasks
    .filter(task => task.active)
    .reduce((sum, task) => {
      const points = POINTS_BY_SIZE[task.size]
      switch (task.type) {
        case 'periodic':
          return sum + points * 7 / task.intervalDays
        case 'quota':
          return sum + points * task.weeklyQuota
        case 'signal':
          return sum + (task.maxDelayDays ? points * 7 / task.maxDelayDays : 0)
      }
    }, 0)
}

export interface WeeklyGauge {
  weekStart: LocalDate
  target: number
  earned: number
  /** 0 → 1, capped. */
  ratio: number
  achieved: boolean
  /** The whole week is on vacation: it neither counts nor breaks the streak. */
  frozen: boolean
}

export interface WeeklyGaugeInput {
  /** Any date of the week to compute. */
  date: LocalDate
  tasks: readonly Task[]
  completions: readonly Completion[]
  vacations: readonly Vacation[]
  timeZone: string
}

/**
 * Common household gauge (CONCEPT §8.1). The target is prorated by the active days of the week.
 * It is computed from the current catalogue: past weeks are an approximation if it changed since.
 */
export function computeWeeklyGauge({ date, tasks, completions, vacations, timeZone }: WeeklyGaugeInput): WeeklyGauge {
  const weekStart = startOfWeek(date)
  const weekEnd = endOfWeek(date)
  const activeDays = activeDaysBetween(addDays(weekStart, -1), weekEnd, vacations)
  const target = Math.round(computeTheoreticalWeeklyXp(tasks) * WEEKLY_GAUGE_TARGET_RATIO * activeDays / 7)
  const earned = completions
    .filter(completion => isEffective(completion) && isWithin(toLocalDate(completion.completedAt, timeZone), weekStart, weekEnd))
    .reduce((sum, completion) => sum + completion.xp, 0)
  const frozen = target === 0

  return {
    weekStart,
    target,
    earned,
    ratio: frozen ? 0 : Math.min(1, earned / target),
    achieved: !frozen && earned >= target,
    frozen,
  }
}

export type WeekOutcome = Pick<WeeklyGauge, 'weekStart' | 'achieved' | 'frozen'>

/**
 * Consecutive weeks with the gauge filled (CONCEPT §8.1).
 * `pastWeeks` are finished weeks, most recent first. The current week only adds to the
 * streak once achieved; while in progress it never breaks it.
 * A missed week consumes the joker of its month (month of its Monday) when still available.
 */
export function computeStreak(pastWeeks: readonly WeekOutcome[], currentWeekAchieved: boolean): number {
  let streak = currentWeekAchieved ? 1 : 0
  const jokersUsed = new Map<string, number>()

  for (const week of pastWeeks) {
    if (week.frozen) {
      continue
    }
    if (week.achieved) {
      streak++
      continue
    }
    const month = week.weekStart.slice(0, 7)
    const used = jokersUsed.get(month) ?? 0
    if (used >= STREAK_JOKERS_PER_MONTH) {
      break
    }
    jokersUsed.set(month, used + 1)
  }

  return streak
}
