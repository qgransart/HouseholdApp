import { v7 as uuidv7 } from 'uuid'
import { claimsOn, computeCoinBalance, TRADE_MAX_COINS, tradeDays, tradeStatus, type LocalDate } from '#shared/domain'
import type { ClaimRow, TradeRow } from '#shared/types/entities'
import type { HouseholdDatabase } from './database'
import { DomainError } from './repository'
import { notDeleted, updateRow, writeRows } from './write'

/* Playing as a couple (CONCEPT §9 bis): "je m'en occupe" and task trades. */

async function memberName(db: HouseholdDatabase, memberId: string): Promise<string> {
  return (await db.members.get(memberId))?.displayName ?? 'L\'autre joueur'
}

/** Coins of a member, trades included; the balance is never stored (ARCHITECTURE §5.1). */
export async function coinBalance(db: HouseholdDatabase, householdId: string, memberId: string): Promise<number> {
  const completions = (await db.completions.where('memberId').equals(memberId).toArray()).filter(notDeleted)
  const purchases = (await db.purchases.where('memberId').equals(memberId).toArray()).filter(notDeleted)
  const trades = (await db.trades.where('householdId').equals(householdId).toArray()).filter(notDeleted)
  return computeCoinBalance(memberId, completions, purchases, trades)
}

async function activeTask(db: HouseholdDatabase, taskId: string) {
  const task = await db.tasks.get(taskId)
  if (!task || !notDeleted(task) || !task.active) {
    throw new DomainError('Cette tâche n\'est plus disponible.')
  }
  return task
}

async function claimsOfTask(db: HouseholdDatabase, taskId: string): Promise<ClaimRow[]> {
  return (await db.claims.where('taskId').equals(taskId).toArray()).filter(notDeleted)
}

export async function claimTask(db: HouseholdDatabase, input: { taskId: string, memberId: string, day: LocalDate, now: Date }): Promise<ClaimRow> {
  return db.transaction('rw', [db.tasks, db.members, db.claims, db.outbox], async () => {
    const task = await activeTask(db, input.taskId)
    const current = claimsOn(await claimsOfTask(db, task.id), input.day).get(task.id) as ClaimRow | undefined
    if (current?.memberId === input.memberId) {
      return current
    }
    if (current) {
      throw new DomainError(`${await memberName(db, current.memberId)} s'en occupe déjà.`)
    }
    const [claim] = await writeRows(db, 'claims', [{
      id: uuidv7(),
      householdId: task.householdId,
      taskId: task.id,
      memberId: input.memberId,
      claimedOn: input.day,
      createdAt: input.now.toISOString(),
      releasedAt: null,
      tradeId: null,
    }], input.now)
    return claim!
  })
}

/** "Finalement non": only the member who made the promise can take it back. */
export async function releaseClaim(db: HouseholdDatabase, input: { claimId: string, memberId: string, now: Date }): Promise<void> {
  const claim = await db.claims.get(input.claimId)
  if (!claim || !notDeleted(claim) || claim.releasedAt || claim.memberId !== input.memberId) {
    throw new DomainError('Cette prise en charge n\'est plus active.')
  }
  await updateRow(db, 'claims', claim.id, { releasedAt: input.now.toISOString() }, input.now)
}

export interface TradeProposal {
  proposedBy: string
  proposedTo: string
  /** A task of the proposer's rooms, to be done by the other member. */
  requestTaskId: string
  /** A task of the other member's rooms, done by the proposer in exchange. */
  offerTaskId: string | null
  coins: number
  dueOn: LocalDate
}

export async function proposeTrade(db: HouseholdDatabase, input: TradeProposal & { today: LocalDate, now: Date }): Promise<TradeRow> {
  return db.transaction('rw', [db.tasks, db.categories, db.completions, db.purchases, db.trades, db.outbox], async () => {
    const request = await activeTask(db, input.requestTaskId)
    const offer = input.offerTaskId ? await activeTask(db, input.offerTaskId) : null
    const owner = async (categoryId: string) => (await db.categories.get(categoryId))?.ownerMemberId
    if (input.proposedBy === input.proposedTo) {
      throw new DomainError('Un échange se fait avec l\'autre joueur.')
    }
    if (await owner(request.categoryId) !== input.proposedBy) {
      throw new DomainError('Tu ne peux demander de l\'aide que pour une tâche de tes pièces.')
    }
    if (offer && await owner(offer.categoryId) !== input.proposedTo) {
      throw new DomainError('En échange, propose une tâche des pièces de l\'autre.')
    }
    if (!Number.isInteger(input.coins) || input.coins < 0 || input.coins > TRADE_MAX_COINS) {
      throw new DomainError(`Tu peux offrir de 0 à ${TRADE_MAX_COINS} pièces.`)
    }
    if (!offer && input.coins === 0) {
      throw new DomainError('Propose une tâche ou des pièces en échange.')
    }
    if (!tradeDays(input.today).includes(input.dueOn)) {
      throw new DomainError('Un échange se prévoit pour aujourd\'hui ou demain.')
    }
    const trades = (await db.trades.where('householdId').equals(request.householdId).toArray()).filter(notDeleted)
    if (trades.some(t => t.requestTaskId === request.id && tradeStatus(t, input.today) === 'pending')) {
      throw new DomainError('Une proposition attend déjà une réponse pour cette tâche.')
    }
    if (input.coins > await coinBalance(db, request.householdId, input.proposedBy)) {
      throw new DomainError('Pas assez de pièces pour cette offre.')
    }
    const [trade] = await writeRows(db, 'trades', [{
      id: uuidv7(),
      householdId: request.householdId,
      proposedBy: input.proposedBy,
      proposedTo: input.proposedTo,
      requestTaskId: request.id,
      offerTaskId: offer?.id ?? null,
      coins: input.coins,
      dueOn: input.dueOn,
      createdAt: input.now.toISOString(),
      acceptedAt: null,
      declinedAt: null,
      cancelledAt: null,
    }], input.now)
    return trade!
  })
}

async function pendingTrade(db: HouseholdDatabase, tradeId: string, today: LocalDate): Promise<TradeRow> {
  const trade = await db.trades.get(tradeId)
  if (!trade || !notDeleted(trade) || tradeStatus(trade, today) !== 'pending') {
    throw new DomainError('Cette proposition n\'attend plus de réponse.')
  }
  return trade
}

/**
 * Accepting turns the deal into two claims for its day, replacing any claim on those tasks,
 * and moves the coins right away (sur l'honneur, like the shop).
 */
export async function answerTrade(db: HouseholdDatabase, input: { tradeId: string, memberId: string, accept: boolean, today: LocalDate, now: Date }): Promise<void> {
  await db.transaction('rw', [db.trades, db.claims, db.members, db.completions, db.purchases, db.outbox], async () => {
    const trade = await pendingTrade(db, input.tradeId, input.today)
    if (trade.proposedTo !== input.memberId) {
      throw new DomainError('Seule la personne sollicitée peut répondre.')
    }
    const stamp = input.now.toISOString()
    if (!input.accept) {
      await updateRow(db, 'trades', trade.id, { declinedAt: stamp }, input.now)
      return
    }
    if (trade.coins > await coinBalance(db, trade.householdId, trade.proposedBy)) {
      throw new DomainError(`${await memberName(db, trade.proposedBy)} n'a plus assez de pièces pour cette offre.`)
    }
    const deal = [{ taskId: trade.requestTaskId, memberId: trade.proposedTo }, ...(trade.offerTaskId ? [{ taskId: trade.offerTaskId, memberId: trade.proposedBy }] : [])]
    for (const { taskId } of deal) {
      const superseded = (await claimsOfTask(db, taskId)).filter(c => c.claimedOn === trade.dueOn && !c.releasedAt)
      if (superseded.length) {
        await writeRows(db, 'claims', superseded.map(c => ({ ...c, releasedAt: stamp })), input.now)
      }
    }
    await writeRows(db, 'claims', deal.map(({ taskId, memberId }) => ({
      id: uuidv7(),
      householdId: trade.householdId,
      taskId,
      memberId,
      claimedOn: trade.dueOn,
      createdAt: stamp,
      releasedAt: null,
      tradeId: trade.id,
    })), input.now)
    await updateRow(db, 'trades', trade.id, { acceptedAt: stamp }, input.now)
  })
}

export async function cancelTrade(db: HouseholdDatabase, input: { tradeId: string, memberId: string, today: LocalDate, now: Date }): Promise<void> {
  const trade = await pendingTrade(db, input.tradeId, input.today)
  if (trade.proposedBy !== input.memberId) {
    throw new DomainError('Seule la personne qui a proposé peut annuler.')
  }
  await updateRow(db, 'trades', trade.id, { cancelledAt: input.now.toISOString() }, input.now)
}
