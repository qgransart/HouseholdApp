import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { STANDARD_CATALOGUE } from '#shared/catalogue'
import { parseLocalDate } from '#shared/domain'
import { answerTrade, cancelTrade, claimTask, coinBalance, proposeTrade, releaseClaim } from '../../app/db/couple'
import { createDatabase, type HouseholdDatabase } from '../../app/db/database'
import { completeTask, createHousehold, DomainError, loadSnapshot } from '../../app/db/repository'

const NOW = new Date('2026-09-24T08:00:00Z')
const TODAY = parseLocalDate('2026-09-24')
const TOMORROW = parseLocalDate('2026-09-25')
let db: HouseholdDatabase
let count = 0

beforeEach(() => {
  db = createDatabase(`couple-${++count}`)
})

afterEach(async () => {
  await db.delete()
})

/** Quentin owns the kitchen (lot A), Camille the living room (lot B). */
async function setup() {
  const { householdId, memberIds } = await createHousehold(db, {
    name: 'Appartement',
    memberNames: ['Quentin', 'Camille'],
    rooms: STANDARD_CATALOGUE.map(room => ({ key: room.key, ownerIndex: room.defaultLot === 'A' ? 0 : 1, state: 'dirty' })),
    now: NOW,
  })
  const snapshot = async () => (await loadSnapshot(db, householdId))!
  const first = await snapshot()
  const task = (name: string) => first.tasks.find(t => t.name === name)!
  const [quentin, camille] = memberIds
  return { householdId, quentin, camille, snapshot, task }
}

describe('je m\'en occupe', () => {
  it('claims a task for today, once', async () => {
    const { camille, task, snapshot } = await setup()
    const claim = await claimTask(db, { taskId: task('Faire la vaisselle').id, memberId: camille, day: TODAY, now: NOW })
    expect(await claimTask(db, { taskId: task('Faire la vaisselle').id, memberId: camille, day: TODAY, now: NOW })).toEqual(claim)
    expect((await snapshot()).claims).toHaveLength(1)
  })

  it('refuses a task the other already took', async () => {
    const { quentin, camille, task } = await setup()
    await claimTask(db, { taskId: task('Faire la vaisselle').id, memberId: camille, day: TODAY, now: NOW })
    await expect(claimTask(db, { taskId: task('Faire la vaisselle').id, memberId: quentin, day: TODAY, now: NOW }))
      .rejects.toThrow('Camille s\'en occupe déjà.')
  })

  it('lets only the promiser release it', async () => {
    const { quentin, camille, task, snapshot } = await setup()
    const claim = await claimTask(db, { taskId: task('Faire la vaisselle').id, memberId: camille, day: TODAY, now: NOW })
    await expect(releaseClaim(db, { claimId: claim.id, memberId: quentin, now: NOW })).rejects.toBeInstanceOf(DomainError)
    await releaseClaim(db, { claimId: claim.id, memberId: camille, now: NOW })
    expect((await snapshot()).claims[0]?.releasedAt).toBe(NOW.toISOString())
  })
})

describe('trades', () => {
  async function earn(memberId: string, taskId: string) {
    await completeTask(db, { taskId, memberId, now: NOW })
  }

  it('swaps two tasks and moves the coins on acceptance', async () => {
    const { householdId, quentin, camille, task, snapshot } = await setup()
    await earn(quentin, task('Nettoyer le four').id) // 80 coins
    const trade = await proposeTrade(db, {
      proposedBy: quentin,
      proposedTo: camille,
      requestTaskId: task('Faire la vaisselle').id,
      offerTaskId: task('Passer le balai').id,
      coins: 50,
      dueOn: TOMORROW,
      today: TODAY,
      now: NOW,
    })
    await answerTrade(db, { tradeId: trade.id, memberId: camille, accept: true, today: TODAY, now: NOW })

    const { claims } = await snapshot()
    expect(claims.map(c => [c.taskId, c.memberId, c.claimedOn, c.tradeId])).toEqual([
      [task('Faire la vaisselle').id, camille, TOMORROW, trade.id],
      [task('Passer le balai').id, quentin, TOMORROW, trade.id],
    ])
    expect(await coinBalance(db, householdId, quentin)).toBe(30)
    expect(await coinBalance(db, householdId, camille)).toBe(50)
  })

  it('checks what each side can ask and offer', async () => {
    const { quentin, camille, task } = await setup()
    const base = { proposedBy: quentin, proposedTo: camille, offerTaskId: null, coins: 10, dueOn: TODAY, today: TODAY, now: NOW }
    // Asking for a task of the other's rooms.
    await expect(proposeTrade(db, { ...base, requestTaskId: task('Passer le balai').id })).rejects.toThrow('tâche de tes pièces')
    // Nothing in exchange.
    await expect(proposeTrade(db, { ...base, requestTaskId: task('Faire la vaisselle').id, coins: 0 })).rejects.toThrow('en échange')
    // More coins than owned.
    await expect(proposeTrade(db, { ...base, requestTaskId: task('Faire la vaisselle').id })).rejects.toThrow('Pas assez de pièces')
    // Too far ahead.
    await expect(proposeTrade(db, { ...base, coins: 0, offerTaskId: task('Passer le balai').id, requestTaskId: task('Faire la vaisselle').id, dueOn: parseLocalDate('2026-09-27') }))
      .rejects.toThrow('aujourd\'hui ou demain')
  })

  it('can be declined or cancelled, once', async () => {
    const { quentin, camille, task, snapshot } = await setup()
    const propose = () => proposeTrade(db, { proposedBy: quentin, proposedTo: camille, requestTaskId: task('Faire la vaisselle').id, offerTaskId: task('Passer le balai').id, coins: 0, dueOn: TODAY, today: TODAY, now: NOW })
    const first = await propose()
    await expect(propose()).rejects.toThrow('attend déjà une réponse')
    await expect(answerTrade(db, { tradeId: first.id, memberId: quentin, accept: true, today: TODAY, now: NOW })).rejects.toThrow('personne sollicitée')
    await answerTrade(db, { tradeId: first.id, memberId: camille, accept: false, today: TODAY, now: NOW })
    await expect(answerTrade(db, { tradeId: first.id, memberId: camille, accept: true, today: TODAY, now: NOW })).rejects.toThrow('plus de réponse')

    const second = await propose()
    await cancelTrade(db, { tradeId: second.id, memberId: quentin, today: TODAY, now: NOW })
    expect((await snapshot()).trades.map(t => [Boolean(t.declinedAt), Boolean(t.cancelledAt)])).toEqual([[true, false], [false, true]])
    expect((await snapshot()).claims).toEqual([])
  })

  it('refuses the acceptance when the proposer spent the coins meanwhile', async () => {
    const { quentin, camille, task } = await setup()
    const completion = await completeTask(db, { taskId: task('Nettoyer le four').id, memberId: quentin, now: NOW })
    const trade = await proposeTrade(db, { proposedBy: quentin, proposedTo: camille, requestTaskId: task('Faire la vaisselle').id, offerTaskId: null, coins: 80, dueOn: TODAY, today: TODAY, now: NOW })
    await db.completions.update(completion.id, { undoneAt: NOW.toISOString() })
    await expect(answerTrade(db, { tradeId: trade.id, memberId: camille, accept: true, today: TODAY, now: NOW })).rejects.toThrow('Quentin n\'a plus assez de pièces')
  })
})
