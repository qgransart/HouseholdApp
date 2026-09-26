import { describe, expect, it } from 'vitest'
import { rewardUnlockState } from '#shared/domain'

const context = { chestOpen: false, chestRatio: 0.4, level: 7, streak: 5 }

describe('rewardUnlockState', () => {
  it('unlocks a reward without condition', () => {
    expect(rewardUnlockState(null, context).unlocked).toBe(true)
  })

  it('follows the weekly chest', () => {
    expect(rewardUnlockState('chest', context)).toMatchObject({ unlocked: false, progress: 0.4 })
    expect(rewardUnlockState('chest', { ...context, chestOpen: true })).toMatchObject({ unlocked: true, progress: 1 })
  })

  it('compares level and streak with their target', () => {
    expect(rewardUnlockState('level:7', context).unlocked).toBe(true)
    expect(rewardUnlockState('level:14', context)).toMatchObject({ unlocked: false, progress: 0.5, target: 14 })
    expect(rewardUnlockState('streak:8', context)).toMatchObject({ unlocked: false, target: 8 })
  })

  it('keeps an unknown or malformed condition locked', () => {
    expect(rewardUnlockState('lottery', context).unlocked).toBe(false)
    expect(rewardUnlockState('level:abc', context).unlocked).toBe(false)
  })
})
