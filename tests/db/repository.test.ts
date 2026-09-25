import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { STANDARD_CATALOGUE } from '#shared/catalogue'
import { buildTaskProgress, computeFreshness, parseLocalDate } from '#shared/domain'
import { createDatabase, type HouseholdDatabase } from '../../app/db/database'
import { toDomainTask } from '../../app/db/mappers'
import {
  completeTask,
  createHousehold,
  DomainError,
  getMeta,
  loadSnapshot,
  META_CURRENT_MEMBER_ID,
  raiseSignal,
  undoCompletion,
  withdrawSignal,
} from '../../app/db/repository'

const NOW = new Date('2026-09-24T08:00:00Z')
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)

let db: HouseholdDatabase
let dbCount = 0

beforeEach(() => {
  db = createDatabase(`test-${++dbCount}`)
})

afterEach(async () => {
  await db.delete()
})

async function setup(state: 'clean' | 'average' | 'dirty' = 'dirty') {
  const { householdId, memberIds } = await createHousehold(db, {
    name: ' Appartement ',
    memberNames: ['Quentin', 'Camille'],
    firstMemberEmail: ' Quentin@Example.com ',
    rooms: STANDARD_CATALOGUE.map(room => ({ key: room.key, ownerIndex: room.defaultLot === 'A' ? 0 : 1, state })),
    now: NOW,
  })
  const snapshot = (await loadSnapshot(db, householdId))!
  const taskNamed = (name: string) => snapshot.tasks.find(task => task.name === name)!
  return { householdId, memberIds, snapshot, taskNamed }
}

describe('createHousehold', () => {
  it('creates the household, both members, one category per room and the whole catalogue', async () => {
    const { snapshot, memberIds } = await setup()
    expect(snapshot.household.name).toBe('Appartement')
    expect(snapshot.members.map(m => [m.displayName, m.email])).toEqual([['Quentin', 'quentin@example.com'], ['Camille', null]])
    expect(snapshot.categories.map(c => c.name)).toEqual(STANDARD_CATALOGUE.map(room => room.name))
    expect(snapshot.tasks).toHaveLength(STANDARD_CATALOGUE.flatMap(room => room.tasks).length)
    expect(snapshot.categories.find(c => c.icon === 'sofa')?.ownerMemberId).toBe(memberIds[1])
    expect(await getMeta(db, META_CURRENT_MEMBER_ID)).toBe(memberIds[0])
  })

  it('disables optional tasks and seeds the baselines from the declared room state', async () => {
    const { taskNamed } = await setup('average')
    expect(taskNamed('Faire les courses').active).toBe(false)
    expect(taskNamed('Changer les draps').baselineOn).toBe('2026-09-20')
    expect(taskNamed('Sortir les ordures').baselineOn).toBe('2026-09-24')
    expect(taskNamed('Plier et ranger').baselineOn).toBeNull()
  })

  it('queues every created row in the outbox', async () => {
    const { snapshot } = await setup()
    const rowCount = 1 + snapshot.members.length + snapshot.categories.length + snapshot.tasks.length
    expect(await db.outbox.count()).toBe(rowCount)
  })
})

describe('completeTask', () => {
  it('stores the reward and flags help when the task belongs to the other member', async () => {
    const { memberIds, taskNamed } = await setup()
    const own = await completeTask(db, { taskId: taskNamed('Nettoyer les WC').id, memberId: memberIds[0], now: NOW })
    const help = await completeTask(db, { taskId: taskNamed('Passer le balai').id, memberId: memberIds[0], now: NOW })
    expect(own).toMatchObject({ xp: 15, coins: 15, isHelp: false, undoneAt: null })
    expect(help.isHelp).toBe(true)
  })

  it('grants the anticipation bonus when the task is "soon"', async () => {
    const { memberIds, taskNamed } = await setup('average')
    const completion = await completeTask(db, { taskId: taskNamed('Changer les draps').id, memberId: memberIds[0], now: NOW })
    expect(completion.xp).toBe(18)
  })

  it('resets the freshness of the task', async () => {
    const { householdId, memberIds, taskNamed } = await setup()
    const sheets = taskNamed('Changer les draps')
    await completeTask(db, { taskId: sheets.id, memberId: memberIds[0], now: NOW })
    const snapshot = (await loadSnapshot(db, householdId))!
    const today = parseLocalDate('2026-09-24')
    const progress = buildTaskProgress({ tasks: [toDomainTask(sheets)!], completions: snapshot.completions, signals: [], today, timeZone: 'Europe/Paris' })
    expect(computeFreshness(7, progress.get(sheets.id)!.lastCompletedOn, today, []).status).toBe('fresh')
  })

  it('resolves the open signal of the task', async () => {
    const { householdId, memberIds, taskNamed } = await setup()
    const trash = taskNamed('Sortir les ordures')
    const signal = await raiseSignal(db, { taskId: trash.id, memberId: memberIds[1], now: NOW })
    const completion = await completeTask(db, { taskId: trash.id, memberId: memberIds[0], now: later(1) })
    const stored = (await loadSnapshot(db, householdId))!.signals.find(s => s.id === signal.id)
    expect(stored?.resolvedByCompletionId).toBe(completion.id)
  })

  it('rejects an unknown task', async () => {
    await setup()
    await expect(completeTask(db, { taskId: 'nope', memberId: 'x', now: NOW })).rejects.toBeInstanceOf(DomainError)
  })
})

describe('undoCompletion', () => {
  it('marks the completion as undone within the undo window', async () => {
    const { householdId, memberIds, taskNamed } = await setup()
    const completion = await completeTask(db, { taskId: taskNamed('Nettoyer les WC').id, memberId: memberIds[0], now: NOW })
    await undoCompletion(db, { completionId: completion.id, now: later(5) })
    const stored = (await loadSnapshot(db, householdId))!.completions[0]
    expect(stored?.undoneAt).toBe(later(5).toISOString())
  })

  it('refuses after the undo window or twice', async () => {
    const { memberIds, taskNamed } = await setup()
    const first = await completeTask(db, { taskId: taskNamed('Nettoyer les WC').id, memberId: memberIds[0], now: NOW })
    await expect(undoCompletion(db, { completionId: first.id, now: later(6) })).rejects.toBeInstanceOf(DomainError)

    const second = await completeTask(db, { taskId: taskNamed('Lavabo et miroir').id, memberId: memberIds[0], now: NOW })
    await undoCompletion(db, { completionId: second.id, now: later(1) })
    await expect(undoCompletion(db, { completionId: second.id, now: later(2) })).rejects.toBeInstanceOf(DomainError)
  })
})

describe('signals', () => {
  it('does not open a second signal while one is open', async () => {
    const { memberIds, taskNamed } = await setup()
    const trash = taskNamed('Sortir les ordures')
    const first = await raiseSignal(db, { taskId: trash.id, memberId: memberIds[1], now: NOW })
    const second = await raiseSignal(db, { taskId: trash.id, memberId: memberIds[0], now: later(1) })
    expect(second.id).toBe(first.id)
  })

  it('refuses to signal a task that is not a signal task', async () => {
    const { memberIds, taskNamed } = await setup()
    await expect(raiseSignal(db, { taskId: taskNamed('Nettoyer les WC').id, memberId: memberIds[0], now: NOW })).rejects.toBeInstanceOf(DomainError)
  })

  it('can be withdrawn while open', async () => {
    const { householdId, memberIds, taskNamed } = await setup()
    const signal = await raiseSignal(db, { taskId: taskNamed('Sortir le tri').id, memberId: memberIds[0], now: NOW })
    await withdrawSignal(db, { signalId: signal.id, now: later(1) })
    expect((await loadSnapshot(db, householdId))!.signals).toEqual([])
  })
})
