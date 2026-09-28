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

/** A completion can be undone during this delay (tap mistake), then it is final (CONCEPT §9). */
export const UNDO_WINDOW_MINUTES = 5

/* Notifications (CONCEPT §11) */

/** No instant alert in this range; alerts raised meanwhile wait for its end. */
export const QUIET_HOURS = { start: '22:00', end: '08:00' } as const

/** Every kind included, per member and per local day. */
export const MAX_NOTIFICATIONS_PER_DAY = 3

/**
 * A scheduled notification is only sent within this delay after its time: a late or missed
 * tick never sends the morning quests at noon.
 */
export const SCHEDULED_NOTIFICATION_WINDOW_MINUTES = 120

/** A manual signal older than this is not announced any more (it is still in the quests). */
export const SIGNAL_NOTIFICATION_MAX_AGE_HOURS = 24
