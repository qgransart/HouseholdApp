import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Database } from '../../server/db/client'
import { invitations, members } from '../../server/db/schema'
import { ServiceError } from '../../server/services/errors'
import { acceptInvitation, createInvitation, INVITATION_TTL_HOURS } from '../../server/services/invitations'
import { findMembershipByEmail } from '../../server/services/membership'
import { createTestDatabase, NOW, resetTestDatabase, seedHousehold } from './testDatabase'

const hoursLater = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000)

let db: Database

beforeAll(async () => {
  db = await createTestDatabase()
})

beforeEach(async () => {
  await resetTestDatabase(db)
})

describe('createInvitation', () => {
  it('creates a readable single-use code for the member who has not joined', async () => {
    await seedHousehold(db)
    const invitation = await createInvitation(db, { inviterEmail: 'quentin@example.com', now: NOW })
    expect(invitation.code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/)
    expect(invitation.targetDisplayName).toBe('Camille')
    expect(invitation.expiresAt).toEqual(hoursLater(INVITATION_TTL_HOURS))
  })

  it('stores only a hash of the code', async () => {
    await seedHousehold(db)
    const { code } = await createInvitation(db, { inviterEmail: 'quentin@example.com', now: NOW })
    const [stored] = await db.select().from(invitations)
    expect(stored?.codeHash).not.toContain(code)
    expect(stored?.codeHash).toHaveLength(64)
  })

  it('refuses an account that belongs to no household', async () => {
    await seedHousehold(db)
    await expect(createInvitation(db, { inviterEmail: 'nobody@example.com', now: NOW })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('refuses when everyone already joined', async () => {
    await seedHousehold(db, { secondEmail: 'camille@example.com' })
    await expect(createInvitation(db, { inviterEmail: 'quentin@example.com', now: NOW })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('invalidates the previous pending code', async () => {
    await seedHousehold(db)
    const first = await createInvitation(db, { inviterEmail: 'quentin@example.com', now: NOW })
    await createInvitation(db, { inviterEmail: 'quentin@example.com', now: hoursLater(1) })
    await expect(acceptInvitation(db, { code: first.code, email: 'camille@example.com', now: hoursLater(2) })).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('acceptInvitation', () => {
  it('links the Google account to the member row and bumps its revision', async () => {
    const { householdId, secondId } = await seedHousehold(db)
    const [before] = await db.select().from(members).where(eq(members.id, secondId))
    const { code } = await createInvitation(db, { inviterEmail: 'quentin@example.com', now: NOW })

    const result = await acceptInvitation(db, { code: ` ${code.slice(0, 3).toLowerCase()}-${code.slice(3)} `, email: 'Camille@Example.com', now: hoursLater(1) })

    expect(result).toEqual({ householdId, memberId: secondId })
    const [after] = await db.select().from(members).where(eq(members.id, secondId))
    expect(after?.email).toBe('camille@example.com')
    expect(after!.rev).toBeGreaterThan(before!.rev)
    expect(await findMembershipByEmail(db, 'camille@example.com')).toMatchObject({ householdId, memberId: secondId })
  })

  it('cannot be used twice', async () => {
    await seedHousehold(db)
    const { code } = await createInvitation(db, { inviterEmail: 'quentin@example.com', now: NOW })
    await acceptInvitation(db, { code, email: 'camille@example.com', now: hoursLater(1) })
    await expect(acceptInvitation(db, { code, email: 'other@example.com', now: hoursLater(2) })).rejects.toBeInstanceOf(ServiceError)
  })

  it('expires', async () => {
    await seedHousehold(db)
    const { code } = await createInvitation(db, { inviterEmail: 'quentin@example.com', now: NOW })
    await expect(acceptInvitation(db, { code, email: 'camille@example.com', now: hoursLater(INVITATION_TTL_HOURS + 1) })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('refuses an account already member of a household', async () => {
    await seedHousehold(db)
    const { code } = await createInvitation(db, { inviterEmail: 'quentin@example.com', now: NOW })
    await expect(acceptInvitation(db, { code, email: 'quentin@example.com', now: hoursLater(1) })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('refuses a wrong code', async () => {
    await seedHousehold(db)
    await createInvitation(db, { inviterEmail: 'quentin@example.com', now: NOW })
    await expect(acceptInvitation(db, { code: 'AAAAAA', email: 'camille@example.com', now: hoursLater(1) })).rejects.toMatchObject({ statusCode: 404 })
  })
})
