import { ANTICIPATION_BONUS_RATE, POINTS_BY_SIZE } from './config'
import type { FreshnessStatus } from './freshness'
import { isEffective } from './progress'
import type { Completion, Purchase, Task } from './types'

export interface Reward {
  xp: number
  coins: number
}

/**
 * Reward granted when a task is completed. It is stored on the completion itself, so that
 * a later change of the balance never rewrites history (ARCHITECTURE §5.1).
 *
 * The anticipation bonus only applies in the `soon` window: rewarding tasks redone while
 * still fresh would encourage farming points rather than anticipating.
 */
export function computeReward(task: Task, freshnessStatus: FreshnessStatus | null): Reward {
  const base = POINTS_BY_SIZE[task.size]
  const hasBonus = task.type === 'periodic' && freshnessStatus === 'soon'
  const amount = hasBonus ? Math.round(base * (1 + ANTICIPATION_BONUS_RATE)) : base
  return { xp: amount, coins: amount }
}

/** Coins are never stored: the balance is always derived from the event log. */
export function computeCoinBalance(memberId: string, completions: readonly Completion[], purchases: readonly Purchase[]): number {
  const earned = completions
    .filter(completion => completion.memberId === memberId && isEffective(completion))
    .reduce((sum, completion) => sum + completion.coins, 0)
  const spent = purchases
    .filter(purchase => purchase.memberId === memberId)
    .reduce((sum, purchase) => sum + purchase.cost, 0)
  return earned - spent
}

export function computeTotalXp(completions: readonly Completion[]): number {
  return completions.filter(isEffective).reduce((sum, completion) => sum + completion.xp, 0)
}
