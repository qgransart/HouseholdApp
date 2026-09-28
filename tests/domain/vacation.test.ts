import { describe, expect, it } from 'vitest'
import { activeDaysBetween, isOnVacation } from '#shared/domain'
import { d } from './factories'

const vacation = (startsOn: string, endsOn: string) => ({ startsOn: d(startsOn), endsOn: d(endsOn) })

describe('activeDaysBetween', () => {
  it('equals the day difference without vacation', () => {
    expect(activeDaysBetween(d('2026-09-01'), d('2026-09-10'), [])).toBe(9)
  })

  it('excludes vacation days inside the range', () => {
    expect(activeDaysBetween(d('2026-09-01'), d('2026-09-10'), [vacation('2026-09-03', '2026-09-05')])).toBe(6)
  })

  it('only counts the overlapping part of a vacation', () => {
    expect(activeDaysBetween(d('2026-09-01'), d('2026-09-10'), [vacation('2026-08-25', '2026-09-02')])).toBe(8)
    expect(activeDaysBetween(d('2026-09-01'), d('2026-09-10'), [vacation('2026-09-09', '2026-09-20')])).toBe(7)
  })

  it('does not count the start day, which is excluded from the range', () => {
    expect(activeDaysBetween(d('2026-09-01'), d('2026-09-10'), [vacation('2026-09-01', '2026-09-01')])).toBe(9)
  })

  it('never counts a day twice when vacations overlap', () => {
    const vacations = [vacation('2026-09-03', '2026-09-06'), vacation('2026-09-05', '2026-09-07')]
    expect(activeDaysBetween(d('2026-09-01'), d('2026-09-10'), vacations)).toBe(4)
  })

  it('returns the raw difference for an empty or reversed range', () => {
    expect(activeDaysBetween(d('2026-09-10'), d('2026-09-10'), [])).toBe(0)
    expect(activeDaysBetween(d('2026-09-10'), d('2026-09-08'), [])).toBe(-2)
  })
})

describe('isOnVacation', () => {
  it('includes both bounds', () => {
    const vacations = [vacation('2026-09-03', '2026-09-05')]
    expect(isOnVacation(d('2026-09-03'), vacations)).toBe(true)
    expect(isOnVacation(d('2026-09-05'), vacations)).toBe(true)
    expect(isOnVacation(d('2026-09-06'), vacations)).toBe(false)
  })
})
