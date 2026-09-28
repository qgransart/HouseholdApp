import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Database } from '../../server/db/client'
import { members } from '../../server/db/schema'
import { ServiceError } from '../../server/services/errors'
import { acceptInvitation, createInvitation } from '../../server/services/invitations'
import { pullChanges, pushMutations } from '../../server/services/sync'
import { createTestDatabase, resetTestDatabase } from './testDatabase'

const Q = 'quentin@example.com'
const C = 'camille@example.com'
const T0 = '2026-09-24T08:00:00.000Z'
const T1 = '2026-09-24T09:00:00.000Z'

let db: Database

beforeAll(async () => {
  db = await createTestDatabase()
})

beforeEach(async () => {
  await resetTestDatabase(db)
})

const ids = {
  household: '01926b3e-0000-7000-8000-000000000001',
  quentin: '01926b3e-0000-7000-8000-000000000002',
  camille: '01926b3e-0000-7000-8000-000000000003',
  kitchen: '01926b3e-0000-7000-8000-000000000004',
  dishes: '01926b3e-0000-7000-8000-000000000005',
  done: '01926b3e-0000-7000-8000-000000000006',
}

const prefs = { morning: true, morningTime: '08:00', evening: true, eveningTime: '19:00', alerts: true }
const base = (id: string, updatedAt = T0) => ({ id, householdId: ids.household, updatedAt, deletedAt: null })

const householdRows = (updatedAt = T0) => [
  { table: 'households' as const, row: { ...base(ids.household, updatedAt), name: 'Appartement', timezone: 'Europe/Paris', settings: { duel: false } } },
  { table: 'members' as const, row: { ...base(ids.quentin, updatedAt), displayName: 'Quentin', email: Q, dailyBudgetMin: 35, notificationPrefs: prefs } },
  // A device must not be able to hand the second seat to an arbitrary account.
  { table: 'members' as const, row: { ...base(ids.camille, updatedAt), displayName: 'Camille', email: 'someone@example.com', dailyBudgetMin: 35, notificationPrefs: prefs } },
  { table: 'categories' as const, row: { ...base(ids.kitchen, updatedAt), name: 'Cuisine', icon: 'kitchen', ownerMemberId: ids.quentin, sortOrder: 0 } },
  { table: 'tasks' as const, row: { ...base(ids.dishes, updatedAt), categoryId: ids.kitchen, name: 'Faire la vaisselle', type: 'periodic', size: 'M', durationMin: 15, intervalDays: 1, weeklyQuota: null, maxDelayDays: null, signalLabel: null, active: true, snoozedUntil: null, baselineOn: '2026-09-23' } },
]

const completion = (overrides: Record<string, unknown> = {}) => ({
  table: 'completions' as const,
  row: { ...base(ids.done), taskId: ids.dishes, memberId: ids.quentin, completedAt: T0, xp: 15, coins: 15, isHelp: false, undoneAt: null, ...overrides },
})

const pullRows = async (email: string, since = 0) => (await pullChanges(db, { email, since }))

describe('first push', () => {
  it('creates the household of the pushing account', async () => {
    const result = await pushMutations(db, { email: Q, body: { mutations: householdRows() } })
    expect(result.accepted).toBe(5)
    const { rows, cursor } = await pullRows(Q)
    expect(rows.map(r => r.table)).toEqual(['households', 'members', 'members', 'categories', 'tasks'])
    expect(cursor).toBeGreaterThan(0)
  })

  it('keeps the email of the pusher only', async () => {
    await pushMutations(db, { email: Q, body: { mutations: householdRows() } })
    const stored = await db.select({ id: members.id, email: members.email }).from(members)
    expect(Object.fromEntries(stored.map(m => [m.id, m.email]))).toEqual({ [ids.quentin]: Q, [ids.camille]: null })
  })

  it('refuses a household that does not list the account', async () => {
    const rows = householdRows().map(m => m.table === 'members' ? { ...m, row: { ...m.row, email: null } } : m)
    await expect(pushMutations(db, { email: Q, body: { mutations: rows } })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('refuses to join an existing household by pushing it again', async () => {
    await pushMutations(db, { email: Q, body: { mutations: householdRows() } })
    const intruder = householdRows().map(m => m.table === 'members' && m.row.id === ids.camille ? { ...m, row: { ...m.row, email: C } } : m)
    await expect(pushMutations(db, { email: C, body: { mutations: intruder } })).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('push and pull', () => {
  beforeEach(async () => {
    await pushMutations(db, { email: Q, body: { mutations: householdRows() } })
  })

  it('pulls only rows changed after the cursor', async () => {
    const { cursor } = await pullRows(Q)
    await pushMutations(db, { email: Q, body: { mutations: [completion()] } })
    const changes = await pullRows(Q, cursor)
    expect(changes.rows).toEqual([{ table: 'completions', row: expect.objectContaining({ id: ids.done, completedAt: T0, xp: 15 }) }])
    expect(changes.cursor).toBeGreaterThan(cursor)
    expect((await pullRows(Q, changes.cursor)).rows).toEqual([])
  })

  it('applies last-write-wins on updatedAt and ignores stale writes', async () => {
    await pushMutations(db, { email: Q, body: { mutations: [completion({ updatedAt: T1, undoneAt: T1 })] } })
    await pushMutations(db, { email: Q, body: { mutations: [completion({ updatedAt: T0, undoneAt: null })] } })
    const row = (await pullRows(Q)).rows.find(r => r.table === 'completions')!.row
    expect(row.undoneAt).toBe(T1)
  })

  it('never lets a push change a member email', async () => {
    const [quentin] = householdRows(T1).filter(m => m.table === 'members')
    await pushMutations(db, { email: Q, body: { mutations: [{ ...quentin!, row: { ...quentin!.row, email: null, dailyBudgetMin: 45 } }] } })
    const [stored] = await db.select().from(members).where(eq(members.id, ids.quentin))
    expect(stored).toMatchObject({ email: Q, dailyBudgetMin: 45 })
  })

  it('rejects rows of several households, invalid rows and foreign households', async () => {
    const other = { ...completion(), row: { ...completion().row, householdId: '01926b3e-0000-7000-8000-0000000000ff' } }
    await expect(pushMutations(db, { email: Q, body: { mutations: [completion(), other] } })).rejects.toMatchObject({ statusCode: 400 })
    await expect(pushMutations(db, { email: Q, body: { mutations: [completion({ xp: -5 })] } })).rejects.toBeInstanceOf(ServiceError)
    await expect(pushMutations(db, { email: Q, body: { mutations: [other] } })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('refuses to pull for an account without household', async () => {
    await expect(pullRows(C)).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('invitation then sync', () => {
  it('lets the invited account pull the whole household, its email included', async () => {
    await pushMutations(db, { email: Q, body: { mutations: householdRows() } })
    const { code } = await createInvitation(db, { inviterEmail: Q, now: new Date(T0) })
    await acceptInvitation(db, { code, email: C, now: new Date(T1) })

    const { rows } = await pullRows(C)
    expect(rows.find(r => r.table === 'members' && r.row.id === ids.camille)?.row.email).toBe(C)
    await pushMutations(db, { email: C, body: { mutations: [completion({ memberId: ids.camille, isHelp: true })] } })
    expect((await pullRows(Q)).rows.some(r => r.table === 'completions')).toBe(true)
  })
})
