import { describe, expect, it } from 'vitest'
import { baselineForPeriodicTask, computeFreshness } from '#shared/domain'
import { d } from './factories'

const today = d('2026-09-24')

describe('baselineForPeriodicTask', () => {
  it.each([
    ['clean', 'fresh'],
    ['average', 'soon'],
    ['dirty', 'due'],
  ] as const)('a %s room starts %s', (state, status) => {
    for (const interval of [1, 3, 7, 14, 30, 90]) {
      const baseline = baselineForPeriodicTask(interval, state, today)
      const expected = interval === 1 && state === 'average' ? 'due' : status
      expect(computeFreshness(interval, baseline, today, []).status, `interval ${interval}`).toBe(expected)
    }
  })
})
