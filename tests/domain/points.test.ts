import { describe, expect, it } from 'vitest'
import { computeCoinBalance, computeReward, computeTotalXp } from '#shared/domain'
import { at, completion, ME, PARTNER, periodic, quota } from './factories'

describe('computeReward', () => {
  it.each([['S', 5], ['M', 15], ['L', 40], ['XL', 80]] as const)('size %s is worth %i', (size, points) => {
    expect(computeReward(periodic({ size }), 'due')).toEqual({ xp: points, coins: points })
  })

  it('adds the anticipation bonus when a periodic task is done while "soon"', () => {
    expect(computeReward(periodic({ size: 'M' }), 'soon')).toEqual({ xp: 18, coins: 18 })
  })

  it.each(['fresh', 'due', 'late'] as const)('grants no bonus when %s', (status) => {
    expect(computeReward(periodic({ size: 'M' }), status).xp).toBe(15)
  })

  it('grants no bonus to non-periodic tasks', () => {
    expect(computeReward(quota({ size: 'M' }), null).xp).toBe(15)
  })
})

describe('computeCoinBalance', () => {
  it('derives the balance of one member from earned coins minus purchases', () => {
    const completions = [
      completion({ memberId: ME, coins: 40 }),
      completion({ memberId: ME, coins: 15, undoneAt: at('2026-09-24') }),
      completion({ memberId: PARTNER, coins: 80 }),
    ]
    const purchases = [{ memberId: ME, cost: 30 }, { memberId: PARTNER, cost: 50 }]
    expect(computeCoinBalance(ME, completions, purchases)).toBe(10)
    expect(computeCoinBalance(PARTNER, completions, purchases)).toBe(30)
  })
})

describe('computeTotalXp', () => {
  it('sums the XP of both members, undone completions excluded', () => {
    const completions = [completion({ xp: 40 }), completion({ memberId: PARTNER, xp: 15 }), completion({ xp: 5, undoneAt: at('2026-09-24') })]
    expect(computeTotalXp(completions)).toBe(55)
  })
})
