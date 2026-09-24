import { describe, expect, it } from 'vitest'
import { addDays, diffInDays, endOfWeek, isoDayOfWeek, parseLocalDate, startOfWeek, toLocalDate } from '#shared/domain'
import { d, TZ } from './factories'

describe('parseLocalDate', () => {
  it('accepts a valid date', () => {
    expect(parseLocalDate('2026-02-28')).toBe('2026-02-28')
  })

  it.each(['2026-02-30', '2026-13-01', '26-01-01', '2026-1-1', ''])('rejects "%s"', (value) => {
    expect(() => parseLocalDate(value)).toThrow(RangeError)
  })
})

describe('toLocalDate', () => {
  it('uses the household time zone, not UTC (winter, UTC+1)', () => {
    expect(toLocalDate('2026-01-15T23:30:00Z', TZ)).toBe('2026-01-16')
    expect(toLocalDate('2026-01-15T22:59:59Z', TZ)).toBe('2026-01-15')
  })

  it('uses the household time zone, not UTC (summer, UTC+2)', () => {
    expect(toLocalDate('2026-07-01T22:30:00Z', TZ)).toBe('2026-07-02')
    expect(toLocalDate('2026-07-01T21:59:59Z', TZ)).toBe('2026-07-01')
  })

  it('handles DST change days', () => {
    expect(toLocalDate('2026-03-29T01:30:00Z', TZ)).toBe('2026-03-29')
    expect(toLocalDate('2026-10-25T22:30:00Z', TZ)).toBe('2026-10-25')
  })

  it('rejects an invalid instant', () => {
    expect(() => toLocalDate('not a date', TZ)).toThrow(RangeError)
  })
})

describe('day arithmetic', () => {
  it('counts calendar days regardless of DST', () => {
    expect(diffInDays(d('2026-03-28'), d('2026-03-30'))).toBe(2)
    expect(diffInDays(d('2026-10-24'), d('2026-10-26'))).toBe(2)
  })

  it('crosses months and years', () => {
    expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01')
    expect(addDays(d('2026-03-01'), -1)).toBe('2026-02-28')
  })

  it('returns negative differences when going back in time', () => {
    expect(diffInDays(d('2026-09-24'), d('2026-09-20'))).toBe(-4)
  })
})

describe('weeks start on Monday', () => {
  it('computes the ISO day of week', () => {
    expect(isoDayOfWeek(d('2026-09-21'))).toBe(1)
    expect(isoDayOfWeek(d('2026-09-27'))).toBe(7)
  })

  it.each([
    ['2026-09-21', '2026-09-21'],
    ['2026-09-24', '2026-09-21'],
    ['2026-09-27', '2026-09-21'],
    ['2026-09-28', '2026-09-28'],
  ])('%s belongs to the week starting %s', (date, monday) => {
    expect(startOfWeek(d(date))).toBe(monday)
    expect(endOfWeek(d(date))).toBe(addDays(d(monday), 6))
  })
})
