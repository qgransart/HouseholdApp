export interface UnlockContext {
  /** The common gauge of the current week is filled. */
  chestOpen: boolean
  level: number
  streak: number
}

export interface UnlockState {
  unlocked: boolean
  /** Progress towards the condition, 0 → 1. */
  progress: number
  condition: 'chest' | 'level' | 'streak' | 'none'
  target: number
}

/**
 * Common rewards are unlocked by playing together, never bought (CONCEPT §8.3):
 * `chest` (this week's chest), `level:<n>` (household level) or `streak:<n>` (weeks in a row).
 * An unknown condition keeps the reward locked rather than giving it away.
 */
export function rewardUnlockState(unlock: string | null, context: UnlockContext & { chestRatio: number }): UnlockState {
  if (!unlock) {
    return { unlocked: true, progress: 1, condition: 'none', target: 0 }
  }
  const [kind, raw] = unlock.split(':')
  const target = Number(raw)
  switch (kind) {
    case 'chest':
      return { unlocked: context.chestOpen, progress: context.chestOpen ? 1 : context.chestRatio, condition: 'chest', target: 1 }
    case 'level':
      return Number.isFinite(target) && target > 0
        ? { unlocked: context.level >= target, progress: Math.min(1, context.level / target), condition: 'level', target }
        : { unlocked: false, progress: 0, condition: 'level', target: 0 }
    case 'streak':
      return Number.isFinite(target) && target > 0
        ? { unlocked: context.streak >= target, progress: Math.min(1, context.streak / target), condition: 'streak', target }
        : { unlocked: false, progress: 0, condition: 'streak', target: 0 }
    default:
      return { unlocked: false, progress: 0, condition: 'none', target: 0 }
  }
}
