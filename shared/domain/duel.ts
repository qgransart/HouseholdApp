import { POINTS_BY_SIZE } from './config'
import { isoDayOfWeek, type LocalDate } from './calendar'
import type { Category, Completion, Task } from './types'

const HELP_BONUS = 1.2
const MAX_SCORE = 150

/**
 * Weekly duel score (CONCEPT §8.4): XP earned this week, compared with what the member's own
 * rooms were expected to yield so far this week. Comparing each member to their own share keeps
 * the duel fair when one has heavier rooms; helping the other counts 20 % more.
 */
export function computeDuelScore(input: {
  memberId: string
  tasks: readonly Task[]
  categories: readonly Category[]
  /** Effective completions of the current week, all members. */
  weekCompletions: readonly (Completion & { isHelp: boolean })[]
  today: LocalDate
}): number {
  const owned = new Set(input.categories.filter(c => c.ownerMemberId === input.memberId).map(c => c.id))
  const weeklyExpected = input.tasks
    .filter(task => task.active && owned.has(task.categoryId))
    .reduce((sum, task) => {
      const points = POINTS_BY_SIZE[task.size]
      switch (task.type) {
        case 'periodic': return sum + points * 7 / task.intervalDays
        case 'quota': return sum + points * task.weeklyQuota
        case 'signal': return sum + (task.maxDelayDays ? points * 7 / task.maxDelayDays : 0)
      }
    }, 0)
  const expectedSoFar = weeklyExpected * isoDayOfWeek(input.today) / 7
  const earned = input.weekCompletions
    .filter(c => c.memberId === input.memberId)
    .reduce((sum, c) => sum + c.xp * (c.isHelp ? HELP_BONUS : 1), 0)
  if (expectedSoFar <= 0) {
    return earned > 0 ? MAX_SCORE : 0
  }
  return Math.min(MAX_SCORE, Math.round(earned / expectedSoFar * 100))
}
