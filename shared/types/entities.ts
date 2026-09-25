import type { LocalDate } from '#shared/domain/calendar'
import type { TaskSize } from '#shared/domain/types'

/**
 * Persisted rows, identical on every device and on the server (ARCHITECTURE §5).
 * Instants are ISO 8601 strings; calendar dates are `LocalDate`.
 */
export interface SyncedRow {
  /** UUID v7 generated on the device that created the row. */
  id: string
  householdId: string
  updatedAt: string
  deletedAt: string | null
}

export const ROOM_ICONS = ['kitchen', 'bath', 'bed', 'sofa', 'laundry', 'trash'] as const
export type RoomIcon = typeof ROOM_ICONS[number]

export interface HouseholdRow extends SyncedRow {
  name: string
  timezone: string
}

export interface MemberRow extends SyncedRow {
  displayName: string
  /** Google account email, filled in once authentication exists (lot 4). */
  email: string | null
  dailyBudgetMin: number
}

export interface CategoryRow extends SyncedRow {
  name: string
  icon: RoomIcon
  ownerMemberId: string
  sortOrder: number
}

export type TaskType = 'periodic' | 'quota' | 'signal'

export interface TaskRow extends SyncedRow {
  categoryId: string
  name: string
  type: TaskType
  size: TaskSize
  durationMin: number
  intervalDays: number | null
  weeklyQuota: number | null
  maxDelayDays: number | null
  signalLabel: string | null
  active: boolean
  snoozedUntil: LocalDate | null
  baselineOn: LocalDate | null
}

export interface CompletionRow extends SyncedRow {
  taskId: string
  memberId: string
  completedAt: string
  xp: number
  coins: number
  isHelp: boolean
  undoneAt: string | null
}

export interface SignalRow extends SyncedRow {
  taskId: string
  raisedBy: string | null
  raisedAt: string
  isAutomatic: boolean
  resolvedByCompletionId: string | null
}

export interface RewardRow extends SyncedRow {
  name: string
  cost: number
  kind: 'personal' | 'common'
  active: boolean
}

export interface PurchaseRow extends SyncedRow {
  rewardId: string
  memberId: string
  cost: number
  purchasedAt: string
  honoredAt: string | null
}

export interface ReactionRow extends SyncedRow {
  completionId: string
  memberId: string
  createdAt: string
}

export interface VacationRow extends SyncedRow {
  startsOn: LocalDate
  endsOn: LocalDate
}

export interface SyncedTables {
  households: HouseholdRow
  members: MemberRow
  categories: CategoryRow
  tasks: TaskRow
  completions: CompletionRow
  signals: SignalRow
  rewards: RewardRow
  purchases: PurchaseRow
  reactions: ReactionRow
  vacations: VacationRow
}

export type SyncedTableName = keyof SyncedTables
