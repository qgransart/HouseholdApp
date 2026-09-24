import { LEVEL_BASE_XP, LEVEL_EXPONENT } from './config'

export interface LevelProgress {
  /** Starts at 1. */
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
  /** 0 → 1 progress towards the next level. */
  ratio: number
}

/** XP needed to go from `level` to `level + 1`: first levels come in days, later ones in weeks. */
export function xpRequiredForNextLevel(level: number): number {
  return Math.round(LEVEL_BASE_XP * level ** LEVEL_EXPONENT)
}

export function computeLevel(totalXp: number): LevelProgress {
  let level = 1
  let remaining = Math.max(0, totalXp)
  let required = xpRequiredForNextLevel(level)
  while (remaining >= required) {
    remaining -= required
    level++
    required = xpRequiredForNextLevel(level)
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: required, ratio: remaining / required }
}
