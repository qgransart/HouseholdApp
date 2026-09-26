import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { STANDARD_CATALOGUE } from '#shared/catalogue'
import { parseLocalDate } from '#shared/domain'
import { createDatabase, type HouseholdDatabase } from '../../app/db/database'
import { setCategoryOwner, setVacationMode, snoozeTask, updateMember, updateTask } from '../../app/db/management'
import { createHousehold, DomainError, loadSnapshot, completeTask } from '../../app/db/repository'
import { createReward, honorPurchase, purchaseReward, thank } from '../../app/db/shop'

const NOW = new Date('2026-09-24T08:00:00Z')
const TODAY = parseLocalDate('2026-09-24')
let db: HouseholdDatabase
let count = 0

beforeEach(() => {
  db = createDatabase(`management-${++count}`)
})

afterEach(async () => {
  await db.delete()
})

async function setup() {
  const { householdId, memberIds } = await createHousehold(db, {
    name: 'Appartement',
    memberNames: ['Quentin', 'Camille'],
    rooms: STANDARD_CATALOGUE.map(room => ({ key: room.key, ownerIndex: room.defaultLot === 'A' ? 0 : 1, state: 'dirty' })),
    now: NOW,
  })
  const snapshot = async () => (await loadSnapshot(db, householdId))!
  const first = await snapshot()
  const taskNamed = (name: string) => first.tasks.find(t => t.name === name)!
  return { householdId, memberIds, snapshot, taskNamed, first }
}

describe('configuration', () => {
  it('updates a task within limits', async () => {
    const { snapshot, taskNamed } = await setup()
    await updateTask(db, { taskId: taskNamed('Changer les draps').id, changes: { intervalDays: 10, size: 'L', active: false }, now: NOW })
    expect((await snapshot()).tasks.find(t => t.name === 'Changer les draps')).toMatchObject({ intervalDays: 10, size: 'L', active: false })
    await expect(updateTask(db, { taskId: taskNamed('Changer les draps').id, changes: { intervalDays: 0 }, now: NOW })).rejects.toBeInstanceOf(DomainError)
  })

  it('snoozes a task for n days, today included', async () => {
    const { taskNamed } = await setup()
    expect(await snoozeTask(db, { taskId: taskNamed('Nettoyer le four').id, days: 3, today: TODAY, now: NOW })).toBe('2026-09-26')
  })

  it('changes the owner of a room', async () => {
    const { memberIds, first, snapshot } = await setup()
    const kitchen = first.categories.find(c => c.icon === 'kitchen')!
    await setCategoryOwner(db, { categoryId: kitchen.id, memberId: memberIds[1], now: NOW })
    expect((await snapshot()).categories.find(c => c.id === kitchen.id)?.ownerMemberId).toBe(memberIds[1])
  })

  it('opens and closes the vacation mode', async () => {
    const { householdId, snapshot } = await setup()
    await setVacationMode(db, { householdId, on: true, today: TODAY, now: NOW })
    expect((await snapshot()).vacations).toMatchObject([{ startsOn: '2026-09-24', endsOn: '9999-12-31' }])

    await setVacationMode(db, { householdId, on: false, today: parseLocalDate('2026-09-28'), now: NOW })
    expect((await snapshot()).vacations).toMatchObject([{ startsOn: '2026-09-24', endsOn: '2026-09-27' }])
  })

  it('removes a vacation opened and closed the same day', async () => {
    const { householdId, snapshot } = await setup()
    await setVacationMode(db, { householdId, on: true, today: TODAY, now: NOW })
    await setVacationMode(db, { householdId, on: false, today: TODAY, now: NOW })
    expect((await snapshot()).vacations).toEqual([])
  })

  it('validates member changes', async () => {
    const { memberIds, snapshot } = await setup()
    await updateMember(db, { memberId: memberIds[0], changes: { dailyBudgetMin: 45 }, now: NOW })
    expect((await snapshot()).members[0]?.dailyBudgetMin).toBe(45)
    await expect(updateMember(db, { memberId: memberIds[0], changes: { dailyBudgetMin: 2 }, now: NOW })).rejects.toBeInstanceOf(DomainError)
  })
})

describe('shop', () => {
  it('seeds the standard rewards', async () => {
    const { first } = await setup()
    expect(first.rewards.filter(r => r.kind === 'personal').length).toBeGreaterThan(0)
    expect(first.rewards.find(r => r.name === 'Soirée resto')).toMatchObject({ kind: 'common', unlock: 'chest' })
  })

  it('refuses a purchase without enough coins, accepts it once earned', async () => {
    const { householdId, memberIds, taskNamed, snapshot } = await setup()
    await createReward(db, { householdId, name: 'Choisir la musique', emoji: '🎵', cost: 20, now: NOW })
    const reward = (await snapshot()).rewards.find(r => r.name === 'Choisir la musique')!
    await expect(purchaseReward(db, { rewardId: reward.id, memberId: memberIds[0], now: NOW })).rejects.toBeInstanceOf(DomainError)

    await completeTask(db, { taskId: taskNamed('Nettoyer le four').id, memberId: memberIds[0], now: NOW })
    const purchase = await purchaseReward(db, { rewardId: reward.id, memberId: memberIds[0], now: NOW })
    expect(purchase).toMatchObject({ cost: 20, honoredAt: null })
  })

  it('lets only the other member honor a purchase', async () => {
    const { householdId, memberIds, taskNamed, snapshot } = await setup()
    await createReward(db, { householdId, name: 'Café', emoji: '☕', cost: 5, now: NOW })
    await completeTask(db, { taskId: taskNamed('Nettoyer les WC').id, memberId: memberIds[0], now: NOW })
    const purchase = await purchaseReward(db, { rewardId: (await snapshot()).rewards.find(r => r.name === 'Café')!.id, memberId: memberIds[0], now: NOW })
    await expect(honorPurchase(db, { purchaseId: purchase.id, memberId: memberIds[0], now: NOW })).rejects.toBeInstanceOf(DomainError)
    await honorPurchase(db, { purchaseId: purchase.id, memberId: memberIds[1], now: NOW })
    expect((await snapshot()).purchases[0]?.honoredAt).toBe(NOW.toISOString())
  })

  it('records a thank-you once, and only for the other member', async () => {
    const { memberIds, taskNamed, snapshot } = await setup()
    const completion = await completeTask(db, { taskId: taskNamed('Nettoyer les WC').id, memberId: memberIds[0], now: NOW })
    await expect(thank(db, { completionId: completion.id, memberId: memberIds[0], now: NOW })).rejects.toBeInstanceOf(DomainError)
    await thank(db, { completionId: completion.id, memberId: memberIds[1], now: NOW })
    await thank(db, { completionId: completion.id, memberId: memberIds[1], now: NOW })
    expect((await snapshot()).reactions).toHaveLength(1)
  })
})
