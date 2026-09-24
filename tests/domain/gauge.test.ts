import { describe, expect, it } from 'vitest'
import { computeStreak, computeTheoreticalWeeklyXp, computeWeeklyGauge, type WeekOutcome } from '#shared/domain'
import { at, completion, d, periodic, quota, signalTask, TZ } from './factories'

describe('computeTheoreticalWeeklyXp', () => {
  it('sums the expected XP of each active task over a week', () => {
    const tasks = [
      periodic({ id: 'a', size: 'M', intervalDays: 7 }), // 15
      periodic({ id: 'b', size: 'S', intervalDays: 1 }), // 35
      quota({ size: 'L', weeklyQuota: 2 }), // 80
      signalTask({ id: 's1', size: 'S', maxDelayDays: 7 }), // 5
      signalTask({ id: 's2', size: 'S', maxDelayDays: null }), // unknown pace → 0
      periodic({ id: 'off', active: false }),
    ]
    expect(computeTheoreticalWeeklyXp(tasks)).toBe(135)
  })
})

describe('computeWeeklyGauge', () => {
  const tasks = [periodic({ size: 'S', intervalDays: 1 })] // 35 XP / week → target 28

  it('targets 80 % of the theoretical XP and sums XP earned during the week', () => {
    const completions = [
      completion({ xp: 20, completedAt: at('2026-09-21') }),
      completion({ xp: 10, completedAt: at('2026-09-27') }),
      completion({ xp: 99, completedAt: at('2026-09-20') }), // previous week
      completion({ xp: 99, completedAt: at('2026-09-22'), undoneAt: at('2026-09-22') }),
    ]
    expect(computeWeeklyGauge({ date: d('2026-09-24'), tasks, completions, vacations: [], timeZone: TZ })).toEqual({
      weekStart: '2026-09-21',
      target: 28,
      earned: 30,
      ratio: 1,
      achieved: true,
      frozen: false,
    })
  })

  it('prorates the target with vacation days', () => {
    const vacations = [{ startsOn: d('2026-09-21'), endsOn: d('2026-09-23') }]
    expect(computeWeeklyGauge({ date: d('2026-09-24'), tasks, completions: [], vacations, timeZone: TZ }).target).toBe(16)
  })

  it('freezes a week entirely spent on vacation', () => {
    const vacations = [{ startsOn: d('2026-09-19'), endsOn: d('2026-09-30') }]
    expect(computeWeeklyGauge({ date: d('2026-09-24'), tasks, completions: [], vacations, timeZone: TZ })).toMatchObject({
      target: 0,
      ratio: 0,
      achieved: false,
      frozen: true,
    })
  })
})

describe('computeStreak', () => {
  const week = (weekStart: string, outcome: 'achieved' | 'missed' | 'frozen'): WeekOutcome =>
    ({ weekStart: d(weekStart), achieved: outcome === 'achieved', frozen: outcome === 'frozen' })

  it('counts consecutive achieved weeks, current week included once achieved', () => {
    const past = [week('2026-09-14', 'achieved'), week('2026-09-07', 'achieved'), week('2026-08-31', 'missed'), week('2026-08-24', 'missed')]
    expect(computeStreak(past, false)).toBe(2)
    expect(computeStreak(past, true)).toBe(3)
  })

  it('uses one joker per month to preserve the streak', () => {
    const past = [week('2026-09-14', 'achieved'), week('2026-09-07', 'missed'), week('2026-08-31', 'achieved')]
    expect(computeStreak(past, false)).toBe(2)
  })

  it('breaks on a second missed week in the same month', () => {
    const past = [week('2026-09-21', 'missed'), week('2026-09-14', 'achieved'), week('2026-09-07', 'missed'), week('2026-08-31', 'achieved')]
    expect(computeStreak(past, false)).toBe(1)
  })

  it('skips frozen weeks without breaking the streak', () => {
    const past = [week('2026-09-14', 'achieved'), week('2026-09-07', 'frozen'), week('2026-08-31', 'achieved')]
    expect(computeStreak(past, false)).toBe(2)
  })
})
