import { describe, expect, it } from 'vitest'
import { earnedBadgeIds, type BadgeStats } from '#shared/domain'
import { completion, TZ } from './factories'

const stats = (overrides: Partial<BadgeStats> = {}): BadgeStats => ({
  completions: [],
  taskInfo: new Map([['periodic', { size: 'M', roomIcon: 'kitchen' }], ['oven', { size: 'XL', roomIcon: 'kitchen' }], ['wash', { size: 'S', roomIcon: 'laundry' }]]),
  thanksReceived: 0,
  purchases: 0,
  chestsOpened: 0,
  streak: 0,
  level: 1,
  timeZone: TZ,
  ...overrides,
})

const done = (overrides: Parameters<typeof completion>[0] = {}) => ({ ...completion(overrides), isHelp: false })

describe('earnedBadgeIds', () => {
  it('earns nothing without activity', () => {
    expect(earnedBadgeIds(stats()).size).toBe(0)
  })

  it('earns "early" for a quest before 8 a.m. in the household time zone', () => {
    expect(earnedBadgeIds(stats({ completions: [done({ completedAt: '2026-09-24T05:30:00Z' })] })).has('early')).toBe(true) // 07:30 Paris
    expect(earnedBadgeIds(stats({ completions: [done({ completedAt: '2026-09-24T06:30:00Z' })] })).has('early')).toBe(false) // 08:30 Paris
  })

  it('earns task-based badges from size and room', () => {
    const ids = earnedBadgeIds(stats({ completions: [done({ taskId: 'oven' }), ...Array.from({ length: 20 }, () => done({ taskId: 'wash' }))] }))
    expect(ids.has('big-clean')).toBe(true)
    expect(ids.has('laundry')).toBe(true)
  })

  it('earns "seven days in a row" only for consecutive days', () => {
    const days = (list: number[]) => list.map(day => done({ completedAt: `2026-09-${String(day).padStart(2, '0')}T10:00:00Z` }))
    expect(earnedBadgeIds(stats({ completions: days([1, 2, 3, 4, 5, 6, 7]) })).has('daily-7')).toBe(true)
    expect(earnedBadgeIds(stats({ completions: days([1, 2, 3, 5, 6, 7, 8]) })).has('daily-7')).toBe(false)
  })

  it('earns progression badges from level, streak, chests, thanks and purchases', () => {
    const ids = earnedBadgeIds(stats({ level: 10, streak: 8, chestsOpened: 1, thanksReceived: 10, purchases: 1 }))
    expect([...ids].sort()).toEqual(['level-10', 'loved', 'perfect-week', 'shopper', 'streak-4', 'streak-8'])
  })
})
