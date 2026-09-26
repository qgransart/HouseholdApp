import { describe, expect, it } from 'vitest'
import { computeDuelScore } from '#shared/domain'
import { categories, completion, d, ME, PARTNER, periodic } from './factories'

// Each member owns one daily S task: 35 XP expected per week, i.e. 20 XP by Thursday (day 4 of 7).
const tasks = [
  periodic({ id: 'mine', size: 'S', intervalDays: 1 }),
  periodic({ id: 'theirs', categoryId: 'cat-partner', size: 'S', intervalDays: 1 }),
]
const thursday = d('2026-09-24')
const done = (memberId: string, xp: number, isHelp = false) => ({ ...completion({ memberId, xp }), isHelp })

describe('computeDuelScore', () => {
  it('compares the XP earned with the share expected so far this week', () => {
    expect(computeDuelScore({ memberId: ME, tasks, categories, weekCompletions: [done(ME, 10)], today: thursday })).toBe(50)
  })

  it('counts help 20 % more', () => {
    expect(computeDuelScore({ memberId: ME, tasks, categories, weekCompletions: [done(ME, 10, true)], today: thursday })).toBe(60)
  })

  it('ignores the other member and caps the score', () => {
    const weekCompletions = [done(PARTNER, 500), done(ME, 500)]
    expect(computeDuelScore({ memberId: ME, tasks, categories, weekCompletions, today: thursday })).toBe(150)
  })
})
