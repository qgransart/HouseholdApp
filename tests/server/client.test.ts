import { describe, expect, it } from 'vitest'
import { toPostgresJsUrl } from '../../server/db/client'

describe('toPostgresJsUrl', () => {
  it('drops channel_binding and keeps the other parameters', () => {
    const url = toPostgresJsUrl('postgresql://user:secret@ep-x-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require')
    expect(url).toBe('postgresql://user:secret@ep-x-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require')
  })

  it('leaves other URLs unchanged', () => {
    expect(toPostgresJsUrl('postgresql://app@localhost:5433/household')).toBe('postgresql://app@localhost:5433/household')
  })
})
