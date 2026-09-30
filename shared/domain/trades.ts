import { addDays, type LocalDate } from './calendar'
import type { Trade } from './types'

export type TradeStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'

/** An unanswered proposal expires once its day is over. */
export function tradeStatus(trade: Trade, today: LocalDate): TradeStatus {
  if (trade.acceptedAt) {
    return 'accepted'
  }
  if (trade.declinedAt) {
    return 'declined'
  }
  if (trade.cancelledAt) {
    return 'cancelled'
  }
  return trade.dueOn < today ? 'expired' : 'pending'
}

/** Days a trade can be planned for: today or tomorrow, to stay a concrete arrangement. */
export function tradeDays(today: LocalDate): [LocalDate, LocalDate] {
  return [today, addDays(today, 1)]
}

/** Coins received minus coins paid through accepted trades. */
export function tradeCoinDelta(memberId: string, trades: readonly Trade[]): number {
  return trades.reduce((sum, trade) => {
    if (!trade.acceptedAt) {
      return sum
    }
    if (trade.proposedTo === memberId) {
      return sum + trade.coins
    }
    return trade.proposedBy === memberId ? sum - trade.coins : sum
  }, 0)
}

export interface TradeLabels {
  taskName: (taskId: string) => string
  memberName: (memberId: string) => string
}

/** The deal, as the given member reads it: "tu fais X, Quentin fait Y, + 50 pièces pour toi". */
export function describeTrade(trade: Pick<Trade, 'proposedBy' | 'proposedTo' | 'requestTaskId' | 'offerTaskId' | 'coins'>, viewerId: string, labels: TradeLabels): string {
  const isProposer = trade.proposedBy === viewerId
  const other = labels.memberName(isProposer ? trade.proposedTo : trade.proposedBy)
  const parts = [isProposer ? `${other} fait ${labels.taskName(trade.requestTaskId)}` : `tu fais ${labels.taskName(trade.requestTaskId)}`]
  if (trade.offerTaskId) {
    parts.push(isProposer ? `tu fais ${labels.taskName(trade.offerTaskId)}` : `${other} fait ${labels.taskName(trade.offerTaskId)}`)
  }
  if (trade.coins > 0) {
    parts.push(isProposer ? `${trade.coins} pièces pour ${other}` : `${trade.coins} pièces pour toi`)
  }
  return parts.join(', ')
}
