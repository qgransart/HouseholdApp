import { describe, expect, it } from 'vitest'
import { computeLevel, xpRequiredForNextLevel } from '#shared/domain'

describe('xpRequiredForNextLevel', () => {
  it('follows 100 × n^1.5', () => {
    expect([1, 2, 3, 4, 10].map(xpRequiredForNextLevel)).toEqual([100, 283, 520, 800, 3162])
  })
})

describe('computeLevel', () => {
  it('starts at level 1', () => {
    expect(computeLevel(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100, ratio: 0 })
  })

  it('reports the progress within the current level', () => {
    expect(computeLevel(99)).toMatchObject({ level: 1, xpIntoLevel: 99, ratio: 0.99 })
  })

  it('levels up exactly on the threshold, several times if needed', () => {
    expect(computeLevel(100)).toMatchObject({ level: 2, xpIntoLevel: 0 })
    expect(computeLevel(100 + 283 + 520 + 10)).toMatchObject({ level: 4, xpIntoLevel: 10, xpForNextLevel: 800 })
  })

  it('treats a negative total as zero', () => {
    expect(computeLevel(-50).level).toBe(1)
  })
})
