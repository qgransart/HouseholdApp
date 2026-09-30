import type { LocalDate } from './calendar'
import type { Claim } from './types'

/**
 * Claims in force on a day, by task. Two members claiming the same task offline: the first
 * claim wins, the other one is simply ignored (CONCEPT §9 bis).
 */
export function claimsOn(claims: readonly Claim[], date: LocalDate): Map<string, Claim> {
  const byTask = new Map<string, Claim>()
  for (const claim of claims) {
    if (claim.claimedOn !== date || claim.releasedAt !== null) {
      continue
    }
    const current = byTask.get(claim.taskId)
    if (!current || claim.createdAt < current.createdAt || (claim.createdAt === current.createdAt && claim.id < current.id)) {
      byTask.set(claim.taskId, claim)
    }
  }
  return byTask
}
