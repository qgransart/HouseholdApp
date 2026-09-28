import { describe, expect, it } from 'vitest'
import { computeFreshness } from '#shared/domain'
import { d } from './factories'

const today = d('2026-09-24')

describe('computeFreshness', () => {
  it('is due when the task was never done', () => {
    expect(computeFreshness(7, null, today, [])).toEqual({ ratio: 0, status: 'due', elapsedDays: null, daysOverdue: 0 })
  })

  it.each([
    ['2026-09-24', 1, 'fresh'],
    ['2026-09-21', 4 / 7, 'fresh'],
    ['2026-09-20', 3 / 7, 'soon'],
    ['2026-09-18', 1 / 7, 'due'],
    ['2026-09-17', 0, 'due'],
  ] as const)('7-day task done on %s → ratio %d, %s', (lastCompletedOn, ratio, status) => {
    const freshness = computeFreshness(7, d(lastCompletedOn), today, [])
    expect(freshness.ratio).toBeCloseTo(ratio)
    expect(freshness.status).toBe(status)
    expect(freshness.daysOverdue).toBe(0)
  })

  it('treats exactly 50 % as soon and exactly 20 % as soon', () => {
    expect(computeFreshness(10, d('2026-09-19'), today, []).status).toBe('soon')
    expect(computeFreshness(10, d('2026-09-16'), today, []).status).toBe('soon')
  })

  it('is late only after the due date, with the number of days overdue', () => {
    expect(computeFreshness(7, d('2026-09-15'), today, [])).toMatchObject({ ratio: 0, status: 'late', daysOverdue: 2 })
  })

  it('shows a daily task done yesterday as due, not late', () => {
    expect(computeFreshness(1, d('2026-09-23'), today, [])).toMatchObject({ status: 'due', daysOverdue: 0 })
  })

  it('does not age during vacations', () => {
    const vacations = [{ startsOn: d('2026-09-18'), endsOn: d('2026-09-23') }]
    expect(computeFreshness(7, d('2026-09-15'), today, vacations)).toMatchObject({ elapsedDays: 3, status: 'fresh' })
  })

  it('never exceeds 100 % if the completion date is in the future (device clock skew)', () => {
    expect(computeFreshness(7, d('2026-09-25'), today, [])).toMatchObject({ ratio: 1, elapsedDays: 0 })
  })
})
