import { describe, expect, it } from 'vitest'
import { computeQuotaProgress, computeUrgency, type TaskProgress } from '#shared/domain'
import { d, ME, periodic, quota, signalTask } from './factories'

const progress = (overrides: Partial<TaskProgress> = {}): TaskProgress =>
  ({ lastCompletedOn: null, completionsThisWeek: 0, completedTodayBy: new Set(), hasOpenSignal: false, ...overrides })

const thursday = d('2026-09-24')

describe('computeUrgency — periodic', () => {
  it('is 1 when never done', () => {
    expect(computeUrgency(periodic(), progress(), thursday, []).score).toBe(1)
  })

  it('grows with the elapsed share of the interval, beyond 1 when late', () => {
    expect(computeUrgency(periodic(), progress({ lastCompletedOn: d('2026-09-20') }), thursday, []).score).toBeCloseTo(4 / 7)
    expect(computeUrgency(periodic(), progress({ lastCompletedOn: d('2026-09-10') }), thursday, []).score).toBe(2)
  })
})

describe('computeUrgency — quota', () => {
  it('is the remaining completions per remaining day of the week', () => {
    // Thursday → Sunday = 4 days, 4 − 1 = 3 remaining
    expect(computeUrgency(quota(), progress({ completionsThisWeek: 1 }), thursday, []).score).toBe(3 / 4)
  })

  it('exceeds 1 when the quota can no longer be met at one per day', () => {
    expect(computeUrgency(quota(), progress({ completionsThisWeek: 1 }), d('2026-09-27'), []).score).toBe(3)
  })

  it('is 0 once the quota is met or when already done today', () => {
    expect(computeUrgency(quota(), progress({ completionsThisWeek: 4 }), thursday, []).score).toBe(0)
    expect(computeUrgency(quota(), progress({ completedTodayBy: new Set([ME]) }), thursday, []).score).toBe(0)
  })
})

describe('computeQuotaProgress', () => {
  it('prorates the target with vacation days of the week', () => {
    const vacations = [{ startsOn: d('2026-09-21'), endsOn: d('2026-09-24') }] // 4 of 7 days
    expect(computeQuotaProgress(quota({ weeklyQuota: 7 }), 1, d('2026-09-25'), vacations)).toEqual({ done: 1, target: 3, remaining: 2 })
  })
})

describe('computeUrgency — signal', () => {
  it('is triggered by an open signal', () => {
    expect(computeUrgency(signalTask(), progress({ hasOpenSignal: true }), thursday, [])).toEqual({ score: 1, triggeredBySignal: true })
  })

  it('triggers itself once the max delay is reached', () => {
    const task = signalTask({ maxDelayDays: 4 })
    expect(computeUrgency(task, progress({ lastCompletedOn: d('2026-09-21') }), thursday, []).triggeredBySignal).toBe(false)
    expect(computeUrgency(task, progress({ lastCompletedOn: d('2026-09-20') }), thursday, []).triggeredBySignal).toBe(true)
  })

  it('waits for a first manual signal when never done', () => {
    expect(computeUrgency(signalTask({ maxDelayDays: 4 }), progress(), thursday, [])).toEqual({ score: 0, triggeredBySignal: false })
  })
})
