import type { LocalDate } from './calendar'

export type TaskSize = 'S' | 'M' | 'L' | 'XL'

interface TaskBase {
  id: string
  categoryId: string
  name: string
  size: TaskSize
  durationMin: number
  active: boolean
  /** The task is left out of quests until this date (inclusive). */
  snoozedUntil: LocalDate | null
  /**
   * Reference date used as if the task had been done that day, until a later completion exists.
   * Set at onboarding from the declared state of each room (ARCHITECTURE D12).
   */
  baselineOn: LocalDate | null
}

/** Sliding window: the next due date is computed from the last completion. */
export interface PeriodicTask extends TaskBase {
  type: 'periodic'
  intervalDays: number
}

/** Fixed Monday → Sunday window, reset every week. */
export interface QuotaTask extends TaskBase {
  type: 'quota'
  weeklyQuota: number
}

/** Triggered by a member ("C'est plein"), or automatically once `maxDelayDays` is exceeded. */
export interface SignalTask extends TaskBase {
  type: 'signal'
  signalLabel: string
  maxDelayDays: number | null
}

export type Task = PeriodicTask | QuotaTask | SignalTask

export interface Category {
  id: string
  ownerMemberId: string
}

export interface Completion {
  id: string
  taskId: string
  memberId: string
  /** ISO 8601 instant. */
  completedAt: string
  xp: number
  coins: number
  /** ISO 8601 instant; an undone completion is ignored by every rule. */
  undoneAt: string | null
}

export interface Signal {
  id: string
  taskId: string
  /** ISO 8601 instant. */
  raisedAt: string
  resolvedByCompletionId: string | null
}

export interface Purchase {
  memberId: string
  cost: number
}

/** Household-wide freeze period, both bounds inclusive. */
export interface Vacation {
  startsOn: LocalDate
  endsOn: LocalDate
}
