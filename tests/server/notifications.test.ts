import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { NotificationMessage } from '#shared/domain'
import type { Database } from '../../server/db/client'
import { members, notificationLog, pushSubscriptions } from '../../server/db/schema'
import { notifySignals, runNotificationTick, saveSubscription, sendTestNotification, type PushResult, type PushTarget } from '../../server/services/notifications'
import { pushMutations } from '../../server/services/sync'
import { createTestDatabase, resetTestDatabase } from './testDatabase'

const Q = 'quentin@example.com'
const C = 'camille@example.com'
const T0 = '2026-09-24T06:00:00.000Z'

/** Paris is UTC+2 in September. */
const paris = (time: string, date = '2026-09-24') => {
  const [hours, minutes] = time.split(':').map(Number) as [number, number]
  return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), hours - 2, minutes))
}

const ids = {
  household: '01926b3e-0000-7000-8000-000000000001',
  quentin: '01926b3e-0000-7000-8000-000000000002',
  camille: '01926b3e-0000-7000-8000-000000000003',
  kitchen: '01926b3e-0000-7000-8000-000000000004',
  dishes: '01926b3e-0000-7000-8000-000000000005',
  bins: '01926b3e-0000-7000-8000-000000000006',
  signal: '01926b3e-0000-7000-8000-000000000007',
  done: '01926b3e-0000-7000-8000-000000000008',
  vacation: '01926b3e-0000-7000-8000-000000000009',
}

const prefs = { morning: true, morningTime: '08:00', evening: true, eveningTime: '19:00', alerts: true }
const base = (id: string) => ({ id, householdId: ids.household, updatedAt: T0, deletedAt: null })
const task = { weeklyQuota: null, active: true, snoozedUntil: null, baselineOn: '2026-09-23' }

const householdRows = [
  { table: 'households' as const, row: { ...base(ids.household), name: 'Appartement', timezone: 'Europe/Paris', settings: { duel: false } } },
  { table: 'members' as const, row: { ...base(ids.quentin), displayName: 'Quentin', email: Q, dailyBudgetMin: 35, notificationPrefs: prefs } },
  { table: 'members' as const, row: { ...base(ids.camille), displayName: 'Camille', email: null, dailyBudgetMin: 35, notificationPrefs: prefs } },
  { table: 'categories' as const, row: { ...base(ids.kitchen), name: 'Cuisine', icon: 'kitchen', ownerMemberId: ids.quentin, sortOrder: 0 } },
  { table: 'tasks' as const, row: { ...base(ids.dishes), ...task, categoryId: ids.kitchen, name: 'Faire la vaisselle', type: 'periodic', size: 'M', durationMin: 15, intervalDays: 1, maxDelayDays: null, signalLabel: null } },
  { table: 'tasks' as const, row: { ...base(ids.bins), ...task, categoryId: ids.kitchen, name: 'Sortir les ordures', type: 'signal', size: 'S', durationMin: 5, intervalDays: null, maxDelayDays: null, signalLabel: 'Poubelle pleine' } },
]

let db: Database
let sent: { target: PushTarget, message: NotificationMessage }[]
let result: PushResult
const sender = async (target: PushTarget, message: NotificationMessage) => {
  sent.push({ target, message })
  return result
}

const tick = (now: Date) => runNotificationTick(db, { now, sender })
const subscribe = (memberId: string, endpoint: string) => saveSubscription(db, {
  householdId: ids.household,
  memberId,
  subscription: { endpoint, keys: { p256dh: 'key', auth: 'auth' } },
  now: new Date(T0),
})
const push = (email: string, mutations: Parameters<typeof pushMutations>[1]['body']['mutations']) => pushMutations(db, { email, body: { mutations } })
const raiseSignal = (raisedAt: Date) => push(C, [{ table: 'signals', row: { ...base(ids.signal), taskId: ids.bins, raisedBy: ids.camille, raisedAt: raisedAt.toISOString(), isAutomatic: false, resolvedByCompletionId: null } }])
const setPrefs = (memberId: string, changes: Partial<typeof prefs>) => db.update(members).set({ notificationPrefs: { ...prefs, ...changes } }).where(eq(members.id, memberId))

beforeAll(async () => {
  db = await createTestDatabase()
})

beforeEach(async () => {
  await resetTestDatabase(db)
  sent = []
  result = 'sent'
  await push(Q, householdRows)
  // Camille joined by invitation (the only way a second email is set).
  await db.update(members).set({ email: C }).where(eq(members.id, ids.camille))
  await subscribe(ids.quentin, 'https://push.example/quentin')
  await subscribe(ids.camille, 'https://push.example/camille')
})

describe('morning and evening', () => {
  it('announces the quests of the day once, to the members who have some', async () => {
    expect(await tick(paris('08:15'))).toEqual({ households: 1, sent: 1 })
    expect(sent.map(s => [s.target.endpoint, s.message.title])).toEqual([['https://push.example/quentin', '1 quête aujourd\'hui ☀️']])
    expect(await tick(paris('08:30'))).toEqual({ households: 1, sent: 0 })
  })

  it('sends nothing outside the window', async () => {
    expect((await tick(paris('07:55'))).sent).toBe(0)
    expect((await tick(paris('10:05'))).sent).toBe(0)
  })

  it('reminds in the evening only when quests are left', async () => {
    expect(sent.length).toBe(0)
    expect((await tick(paris('19:00'))).sent).toBe(1)
    expect(sent[0]?.message.title).toBe('Encore 1 quête ce soir 🌙')

    sent = []
    await push(Q, [{ table: 'completions', row: { ...base(ids.done), taskId: ids.dishes, memberId: ids.quentin, completedAt: paris('12:00', '2026-09-25').toISOString(), xp: 15, coins: 15, isHelp: false, undoneAt: null } }])
    expect((await tick(paris('19:00', '2026-09-25'))).sent).toBe(0)
  })

  it('stays silent during vacations', async () => {
    await push(Q, [{ table: 'vacations', row: { ...base(ids.vacation), startsOn: '2026-09-20', endsOn: '2026-09-30' } }])
    expect((await tick(paris('08:15'))).sent).toBe(0)
  })
})

describe('signals', () => {
  it('alerts the owner of the task right away, once', async () => {
    await raiseSignal(paris('12:00'))
    expect(await notifySignals(db, { householdId: ids.household, now: paris('12:00'), sender })).toBe(1)
    expect(sent[0]).toMatchObject({ target: { endpoint: 'https://push.example/quentin' }, message: { title: '🔔 Poubelle pleine', body: 'Camille a signalé : Sortir les ordures.' } })
    expect(await notifySignals(db, { householdId: ids.household, now: paris('12:01'), sender })).toBe(0)
    expect((await tick(paris('12:15'))).sent).toBe(0)
  })

  it('defers the alerts raised during the quiet hours to the morning', async () => {
    await raiseSignal(paris('23:00', '2026-09-23'))
    expect(await notifySignals(db, { householdId: ids.household, now: paris('23:00', '2026-09-23'), sender })).toBe(0)
    await setPrefs(ids.quentin, { morning: false })
    expect((await tick(paris('08:00'))).sent).toBe(1)
    expect(sent[0]?.message.tag).toBe('signals')
  })

  it('respects the member preference', async () => {
    await setPrefs(ids.quentin, { alerts: false })
    await raiseSignal(paris('12:00'))
    expect(await notifySignals(db, { householdId: ids.household, now: paris('12:00'), sender })).toBe(0)
  })
})

describe('limits and subscriptions', () => {
  it('never sends more than 3 notifications a day to a member', async () => {
    await db.insert(notificationLog).values([1, 2, 3].map(n => ({
      notificationId: crypto.randomUUID(),
      householdId: ids.household,
      memberId: ids.quentin,
      kind: 'signal' as const,
      localDate: '2026-09-24',
      dedupeKey: `previous-${n}`,
      sentAt: paris('07:00'),
    })))
    expect((await tick(paris('08:15'))).sent).toBe(0)
  })

  it('forgets the endpoints the push service no longer knows', async () => {
    result = 'gone'
    await sendTestNotification(db, { householdId: ids.household, memberId: ids.quentin, sender })
    expect((await db.select().from(pushSubscriptions)).map(s => s.memberId)).toEqual([ids.camille])
  })

  it('hands an endpoint over to the account that registers it last', async () => {
    await subscribe(ids.camille, 'https://push.example/quentin')
    expect((await db.select().from(pushSubscriptions)).every(s => s.memberId === ids.camille)).toBe(true)
  })
})
