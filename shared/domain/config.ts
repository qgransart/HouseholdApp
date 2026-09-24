import type { TaskSize } from './types'

/**
 * Game balance, gathered in one place so it can be tuned after real-life usage
 * without touching the rules themselves (CONCEPT §6, §8).
 */

export const POINTS_BY_SIZE: Readonly<Record<TaskSize, number>> = {
  S: 5,
  M: 15,
  L: 40,
  XL: 80,
}

/** Reward multiplier when a periodic task is done while still "soon", i.e. before it turns red. */
export const ANTICIPATION_BONUS_RATE = 0.2

/** Freshness boundaries (CONCEPT §5). */
export const FRESHNESS_FRESH_THRESHOLD = 0.5
export const FRESHNESS_DUE_THRESHOLD = 0.2

/**
 * Minimum urgency for a task to be offered as a quest (0 = just done, 1 = due today).
 * Below it the task is still clean enough: proposing it would waste the daily budget.
 */
export const QUEST_URGENCY_THRESHOLD = 0.5

export const QUICK_TASK_MAX_MINUTES = 10

/** Share of the theoretical weekly XP the household must earn to fill the common gauge. */
export const WEEKLY_GAUGE_TARGET_RATIO = 0.8

/** XP needed to go from level n to n + 1 = LEVEL_BASE_XP × n ^ LEVEL_EXPONENT. */
export const LEVEL_BASE_XP = 100
export const LEVEL_EXPONENT = 1.5

export const STREAK_JOKERS_PER_MONTH = 1
