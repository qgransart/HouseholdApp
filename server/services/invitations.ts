import { and, eq, gt, isNull, ne, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { invitations, members } from '../db/schema'
import { ServiceError } from './errors'
import { findMembershipByEmail } from './membership'

/** No 0/O, 1/I/L: the code is read aloud or typed from another phone. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
export const INVITATION_TTL_HOURS = 48

export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Only the hash is stored: a database leak does not reveal usable codes. */
async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizeCode(code)))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

/** Web Crypto with rejection sampling: uniform over the alphabet, no modulo bias. */
function generateCode(): string {
  const limit = 256 - (256 % CODE_ALPHABET.length)
  let code = ''
  while (code.length < CODE_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(CODE_LENGTH))) {
      if (byte < limit && code.length < CODE_LENGTH) {
        code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
      }
    }
  }
  return code
}

export interface CreatedInvitation {
  code: string
  expiresAt: Date
  targetDisplayName: string
}

/** Creates a single-use code for the member of the household who has not joined yet. */
export async function createInvitation(db: Database, input: { inviterEmail: string, now: Date }): Promise<CreatedInvitation> {
  const inviter = await findMembershipByEmail(db, input.inviterEmail)
  if (!inviter) {
    throw new ServiceError(403, 'Ce compte ne fait partie d\'aucune maison.')
  }

  const [target] = await db
    .select({ id: members.id, displayName: members.displayName })
    .from(members)
    .where(and(eq(members.householdId, inviter.householdId), ne(members.id, inviter.memberId), isNull(members.email), isNull(members.deletedAt)))
    .limit(1)
  if (!target) {
    throw new ServiceError(409, 'Tout le monde a déjà rejoint la maison.')
  }

  const code = generateCode()
  const expiresAt = new Date(input.now.getTime() + INVITATION_TTL_HOURS * 3_600_000)

  await db.transaction(async (tx) => {
    // A new code replaces any previous one still pending.
    await tx.update(invitations)
      .set({ expiresAt: input.now })
      .where(and(eq(invitations.householdId, inviter.householdId), isNull(invitations.usedAt), gt(invitations.expiresAt, input.now)))
    await tx.insert(invitations).values({
      householdId: inviter.householdId,
      targetMemberId: target.id,
      createdByMemberId: inviter.memberId,
      codeHash: await hashCode(code),
      createdAt: input.now,
      expiresAt,
    })
  })

  return { code, expiresAt, targetDisplayName: target.displayName }
}

/** Links the invited Google account to its member row. */
export async function acceptInvitation(db: Database, input: { code: string, email: string, now: Date }): Promise<{ householdId: string, memberId: string }> {
  const email = input.email.toLowerCase()
  if (await findMembershipByEmail(db, email)) {
    throw new ServiceError(409, 'Ce compte fait déjà partie d\'une maison.')
  }

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.codeHash, await hashCode(input.code)), isNull(invitations.usedAt), gt(invitations.expiresAt, input.now)))
    .limit(1)
  if (!invitation) {
    throw new ServiceError(404, 'Code invalide ou expiré. Demande un nouveau code.')
  }

  await db.transaction(async (tx) => {
    const updated = await tx.update(members)
      .set({ email, updatedAt: input.now, rev: sql`nextval('sync_rev')` })
      .where(and(eq(members.id, invitation.targetMemberId), isNull(members.email), isNull(members.deletedAt)))
      .returning({ id: members.id })
    if (!updated.length) {
      throw new ServiceError(410, 'Cette place dans la maison n\'est plus disponible.')
    }
    await tx.update(invitations)
      .set({ usedAt: input.now, usedByEmail: email })
      .where(eq(invitations.id, invitation.id))
  })

  return { householdId: invitation.householdId, memberId: invitation.targetMemberId }
}
