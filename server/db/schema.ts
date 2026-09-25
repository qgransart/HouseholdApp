import { sql } from 'drizzle-orm'
import { bigint, boolean, date, index, integer, pgSequence, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import type { RoomIcon, TaskType } from '#shared/types/entities'
import type { TaskSize } from '#shared/domain/types'

/**
 * Server mirror of the synced rows (shared/types/entities.ts), columns in snake_case.
 * Instants are timestamptz, calendar dates are `date` (ARCHITECTURE §5).
 *
 * Only `household_id` has a foreign key: synced rows may arrive in any order from offline
 * devices, and the event log is soft-deleted, never removed.
 */

/** Monotonic revision of every write, used as the sync cursor instead of device clocks (§6.1). */
export const syncRev = pgSequence('sync_rev')

const instant = () => timestamp({ withTimezone: true, mode: 'date' })

const syncedColumns = () => ({
  id: uuid().primaryKey(),
  householdId: uuid().notNull().references(() => households.id),
  updatedAt: instant().notNull(),
  deletedAt: instant(),
  rev: bigint({ mode: 'number' }).notNull().default(sql`nextval('sync_rev')`),
})

export const households = pgTable('households', {
  id: uuid().primaryKey(),
  // Always equal to `id`: every synced table exposes the same columns.
  householdId: uuid().notNull(),
  updatedAt: instant().notNull(),
  deletedAt: instant(),
  rev: bigint({ mode: 'number' }).notNull().default(sql`nextval('sync_rev')`),
  name: text().notNull(),
  timezone: text().notNull(),
}, table => [index('households_rev_idx').on(table.rev)])

export const members = pgTable('members', {
  ...syncedColumns(),
  displayName: text().notNull(),
  email: text(),
  dailyBudgetMin: integer().notNull(),
}, table => [
  index('members_household_rev_idx').on(table.householdId, table.rev),
  // One Google account belongs to one household at most (nulls are distinct in Postgres).
  uniqueIndex('members_email_unique').on(table.email),
])

export const categories = pgTable('categories', {
  ...syncedColumns(),
  name: text().notNull(),
  icon: text().$type<RoomIcon>().notNull(),
  ownerMemberId: uuid().notNull(),
  sortOrder: integer().notNull(),
}, table => [index('categories_household_rev_idx').on(table.householdId, table.rev)])

export const tasks = pgTable('tasks', {
  ...syncedColumns(),
  categoryId: uuid().notNull(),
  name: text().notNull(),
  type: text().$type<TaskType>().notNull(),
  size: text().$type<TaskSize>().notNull(),
  durationMin: integer().notNull(),
  intervalDays: integer(),
  weeklyQuota: integer(),
  maxDelayDays: integer(),
  signalLabel: text(),
  active: boolean().notNull(),
  snoozedUntil: date({ mode: 'string' }),
  baselineOn: date({ mode: 'string' }),
}, table => [index('tasks_household_rev_idx').on(table.householdId, table.rev)])

export const completions = pgTable('completions', {
  ...syncedColumns(),
  taskId: uuid().notNull(),
  memberId: uuid().notNull(),
  completedAt: instant().notNull(),
  xp: integer().notNull(),
  coins: integer().notNull(),
  isHelp: boolean().notNull(),
  undoneAt: instant(),
}, table => [index('completions_household_rev_idx').on(table.householdId, table.rev)])

export const signals = pgTable('signals', {
  ...syncedColumns(),
  taskId: uuid().notNull(),
  raisedBy: uuid(),
  raisedAt: instant().notNull(),
  isAutomatic: boolean().notNull(),
  resolvedByCompletionId: uuid(),
}, table => [index('signals_household_rev_idx').on(table.householdId, table.rev)])

export const rewards = pgTable('rewards', {
  ...syncedColumns(),
  name: text().notNull(),
  cost: integer().notNull(),
  kind: text().$type<'personal' | 'common'>().notNull(),
  active: boolean().notNull(),
}, table => [index('rewards_household_rev_idx').on(table.householdId, table.rev)])

export const purchases = pgTable('purchases', {
  ...syncedColumns(),
  rewardId: uuid().notNull(),
  memberId: uuid().notNull(),
  cost: integer().notNull(),
  purchasedAt: instant().notNull(),
  honoredAt: instant(),
}, table => [index('purchases_household_rev_idx').on(table.householdId, table.rev)])

export const reactions = pgTable('reactions', {
  ...syncedColumns(),
  completionId: uuid().notNull(),
  memberId: uuid().notNull(),
  createdAt: instant().notNull(),
}, table => [index('reactions_household_rev_idx').on(table.householdId, table.rev)])

export const vacations = pgTable('vacations', {
  ...syncedColumns(),
  startsOn: date({ mode: 'string' }).notNull(),
  endsOn: date({ mode: 'string' }).notNull(),
}, table => [index('vacations_household_rev_idx').on(table.householdId, table.rev)])

/** Server only: single-use code letting the second member join (ARCHITECTURE §9). */
export const invitations = pgTable('invitations', {
  id: uuid().primaryKey().defaultRandom(),
  householdId: uuid().notNull().references(() => households.id),
  /** The member row the invited person will take over. */
  targetMemberId: uuid().notNull(),
  createdByMemberId: uuid().notNull(),
  codeHash: text().notNull(),
  createdAt: instant().notNull(),
  expiresAt: instant().notNull(),
  usedAt: instant(),
  usedByEmail: text(),
}, table => [uniqueIndex('invitations_code_hash_unique').on(table.codeHash)])
