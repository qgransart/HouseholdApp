import { and, eq, isNull } from 'drizzle-orm'
import type { Database } from '../db/client'
import { members } from '../db/schema'

export interface Membership {
  householdId: string
  memberId: string
  displayName: string
}

export async function findMembershipByEmail(db: Database, email: string): Promise<Membership | null> {
  const [member] = await db
    .select({ householdId: members.householdId, memberId: members.id, displayName: members.displayName })
    .from(members)
    .where(and(eq(members.email, email.toLowerCase()), isNull(members.deletedAt)))
    .limit(1)
  return member ?? null
}
