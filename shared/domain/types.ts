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

/** "Je m'en occupe": a member promises to do a task on a given day (CONCEPT §9 bis). */
export interface Claim {
  id: string
  taskId: string
  memberId: string
  claimedOn: LocalDate
  /** ISO 8601 instant; a released claim is ignored. */
  releasedAt: string | null
  /** ISO 8601 instant, used to settle two claims made offline at the same time. */
  createdAt: string
  /** Set when the claim comes from an accepted trade. */
  tradeId: string | null
}

/**
 * Task swap proposed by `proposedBy`: `proposedTo` does `requestTaskId`, in exchange for
 * `offerTaskId` done by the proposer and/or `coins` paid by the proposer.
 */
export interface Trade {
  id: string
  proposedBy: string
  proposedTo: string
  requestTaskId: string
  offerTaskId: string | null
  coins: number
  dueOn: LocalDate
  /** ISO 8601 instants; at most one of the three is set. */
  acceptedAt: string | null
  declinedAt: string | null
  cancelledAt: string | null
  createdAt: string
}
