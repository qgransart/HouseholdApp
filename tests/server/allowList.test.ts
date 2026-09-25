import { describe, expect, it } from 'vitest'
import { isEmailAllowed, parseAllowList } from '../../server/services/allowList'

describe('allow-list', () => {
  const list = parseAllowList(' Quentin@Example.com, camille@example.com ,, ')

  it('ignores case, spaces and empty entries', () => {
    expect([...list]).toEqual(['quentin@example.com', 'camille@example.com'])
    expect(isEmailAllowed('QUENTIN@example.com', list)).toBe(true)
  })

  it('rejects unknown, empty or missing emails', () => {
    expect(isEmailAllowed('intruder@example.com', list)).toBe(false)
    expect(isEmailAllowed('', list)).toBe(false)
    expect(isEmailAllowed(undefined, list)).toBe(false)
    expect(isEmailAllowed('quentin@example.com', parseAllowList(undefined))).toBe(false)
  })
})
