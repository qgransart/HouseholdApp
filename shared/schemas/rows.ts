import { z } from 'zod'
import { ROOM_ICONS, type SyncedTableName } from '#shared/types/entities'

/**
 * Validation of synced rows (ARCHITECTURE §9): the server never trusts a device, even in a
 * private app. Shapes mirror shared/types/entities.ts.
 */

const id = z.uuid()
const instant = z.iso.datetime({ offset: true })
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const text = (max: number) => z.string().trim().min(1).max(max)
const count = (max: number) => z.number().int().min(0).max(max)

const synced = {
  id,
  householdId: id,
  updatedAt: instant,
  deletedAt: instant.nullable(),
}

export const rowSchemas = {
  households: z.object({
    ...synced,
    name: text(60),
    timezone: text(64),
    settings: z.object({ duel: z.boolean() }),
  }),
  members: z.object({
    ...synced,
    displayName: text(40),
    email: z.email().nullable(),
    dailyBudgetMin: z.number().int().min(5).max(240),
    notificationPrefs: z.object({ morning: z.boolean(), morningTime: time, evening: z.boolean(), eveningTime: time, alerts: z.boolean() }),
  }),
  categories: z.object({
    ...synced,
    name: text(40),
    icon: z.enum(ROOM_ICONS),
    ownerMemberId: id,
    sortOrder: count(1000),
  }),
  tasks: z.object({
    ...synced,
    categoryId: id,
    name: text(60),
    type: z.enum(['periodic', 'quota', 'signal']),
    size: z.enum(['S', 'M', 'L', 'XL']),
    durationMin: z.number().int().min(1).max(240),
    intervalDays: z.number().int().min(1).max(365).nullable(),
    weeklyQuota: z.number().int().min(1).max(21).nullable(),
    maxDelayDays: z.number().int().min(1).max(365).nullable(),
    signalLabel: z.string().max(40).nullable(),
    active: z.boolean(),
    snoozedUntil: localDate.nullable(),
    baselineOn: localDate.nullable(),
  }),
  completions: z.object({
    ...synced,
    taskId: id,
    memberId: id,
    completedAt: instant,
    xp: count(10_000),
    coins: count(10_000),
    isHelp: z.boolean(),
    undoneAt: instant.nullable(),
  }),
  signals: z.object({
    ...synced,
    taskId: id,
    raisedBy: id.nullable(),
    raisedAt: instant,
    isAutomatic: z.boolean(),
    resolvedByCompletionId: id.nullable(),
  }),
  rewards: z.object({
    ...synced,
    name: text(60),
    emoji: z.string().max(16),
    cost: count(100_000),
    kind: z.enum(['personal', 'common']),
    unlock: z.string().max(32).nullable(),
    active: z.boolean(),
  }),
  purchases: z.object({
    ...synced,
    rewardId: id,
    memberId: id,
    cost: count(100_000),
    purchasedAt: instant,
    honoredAt: instant.nullable(),
  }),
  reactions: z.object({
    ...synced,
    completionId: id,
    memberId: id,
    createdAt: instant,
  }),
  vacations: z.object({
    ...synced,
    startsOn: localDate,
    endsOn: localDate,
  }),
} satisfies Record<SyncedTableName, z.ZodType>

export const SYNC_TABLE_ORDER = Object.keys(rowSchemas) as SyncedTableName[]

export const MAX_PUSH_MUTATIONS = 1000

export const pushBodySchema = z.object({
  mutations: z.array(z.object({
    table: z.enum(SYNC_TABLE_ORDER as [SyncedTableName, ...SyncedTableName[]]),
    row: z.record(z.string(), z.unknown()),
  })).max(MAX_PUSH_MUTATIONS),
})

export type PushBody = z.infer<typeof pushBodySchema>

export interface PullResponse {
  rows: { table: SyncedTableName, row: Record<string, unknown> }[]
  cursor: number
}
