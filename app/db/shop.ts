import { v7 as uuidv7 } from 'uuid'
import { computeCoinBalance } from '#shared/domain/points'
import type { PurchaseRow } from '#shared/types/entities'
import type { HouseholdDatabase } from './database'
import { DomainError } from './repository'
import { notDeleted, updateRow, writeRows } from './write'

/* Rewards, purchases and thanks (CONCEPT §8.3, §9). */

export async function createReward(db: HouseholdDatabase, input: { householdId: string, name: string, emoji: string, cost: number, now: Date }): Promise<void> {
  const name = input.name.trim()
  if (!name || name.length > 60) {
    throw new DomainError('Donne un nom de 1 à 60 caractères à la récompense.')
  }
  if (!Number.isInteger(input.cost) || input.cost < 1 || input.cost > 100_000) {
    throw new DomainError('Le prix doit être un nombre entier de pièces.')
  }
  await writeRows(db, 'rewards', [{
    id: uuidv7(),
    householdId: input.householdId,
    name,
    emoji: input.emoji || '🎁',
    cost: input.cost,
    kind: 'personal',
    unlock: null,
    active: true,
  }], input.now)
}

export async function purchaseReward(db: HouseholdDatabase, input: { rewardId: string, memberId: string, now: Date }): Promise<PurchaseRow> {
  return db.transaction('rw', [db.rewards, db.completions, db.purchases, db.outbox], async () => {
    const reward = await db.rewards.get(input.rewardId)
    if (!reward || !notDeleted(reward) || !reward.active || reward.kind !== 'personal') {
      throw new DomainError('Cette récompense n\'est pas disponible.')
    }
    const completions = (await db.completions.where('memberId').equals(input.memberId).toArray()).filter(notDeleted)
    const purchases = (await db.purchases.where('memberId').equals(input.memberId).toArray()).filter(notDeleted)
    if (computeCoinBalance(input.memberId, completions, purchases) < reward.cost) {
      throw new DomainError('Pas assez de pièces pour cette récompense.')
    }
    const [purchase] = await writeRows(db, 'purchases', [{
      id: uuidv7(),
      householdId: reward.householdId,
      rewardId: reward.id,
      memberId: input.memberId,
      cost: reward.cost,
      purchasedAt: input.now.toISOString(),
      honoredAt: null,
    }], input.now)
    return purchase!
  })
}

/** Only the other member honors a reward: the buyer cannot validate their own treat. */
export async function honorPurchase(db: HouseholdDatabase, input: { purchaseId: string, memberId: string, now: Date }): Promise<void> {
  const purchase = await db.purchases.get(input.purchaseId)
  if (!purchase || !notDeleted(purchase) || purchase.honoredAt) {
    throw new DomainError('Cet achat a déjà été honoré.')
  }
  if (purchase.memberId === input.memberId) {
    throw new DomainError('C\'est à l\'autre joueur d\'honorer ta récompense.')
  }
  await updateRow(db, 'purchases', purchase.id, { honoredAt: input.now.toISOString() }, input.now)
}

export async function thank(db: HouseholdDatabase, input: { completionId: string, memberId: string, now: Date }): Promise<void> {
  const completion = await db.completions.get(input.completionId)
  if (!completion || !notDeleted(completion) || completion.memberId === input.memberId) {
    throw new DomainError('On ne peut remercier que l\'autre joueur.')
  }
  const already = (await db.reactions.where('completionId').equals(completion.id).toArray()).some(r => notDeleted(r) && r.memberId === input.memberId)
  if (!already) {
    await writeRows(db, 'reactions', [{ id: uuidv7(), householdId: completion.householdId, completionId: completion.id, memberId: input.memberId, createdAt: input.now.toISOString() }], input.now)
  }
}
