import { and, eq, gt, lte, sql } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import { rowSchemas, SYNC_TABLE_ORDER, type PullResponse, type PushBody } from '#shared/schemas/rows'
import type { SyncedTableName } from '#shared/types/entities'
import type { Database } from '../db/client'
import * as schema from '../db/schema'
import { ServiceError } from './errors'
import { findMembershipByEmail } from './membership'

/* Sync protocol (ARCHITECTURE §6): push rows, pull every row with a revision above a cursor. */

/** Every synced table exposes the same technical columns (ARCHITECTURE §5.2). */
type SyncedTable = PgTable & { id: PgColumn, householdId: PgColumn, updatedAt: PgColumn, rev: PgColumn }

const TABLES: Record<SyncedTableName, SyncedTable> = {
  households: schema.households,
  members: schema.members,
  categories: schema.categories,
  tasks: schema.tasks,
  completions: schema.completions,
  signals: schema.signals,
  rewards: schema.rewards,
  purchases: schema.purchases,
  reactions: schema.reactions,
  vacations: schema.vacations,
}

/** Columns stored as timestamptz: ISO strings on the wire, `Date` for the driver. */
const INSTANT_FIELDS = new Set(['updatedAt', 'deletedAt', 'completedAt', 'undoneAt', 'raisedAt', 'purchasedAt', 'honoredAt', 'createdAt'])

type Row = Record<string, unknown> & { id: string, householdId: string, updatedAt: string }

function toDatabase(row: Row): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, INSTANT_FIELDS.has(key) && typeof value === 'string' ? new Date(value) : value]))
}

function toWire(row: Record<string, unknown>): Record<string, unknown> {
  const { rev: _rev, ...rest } = row
  return Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]))
}

/** Serialises every write and read of a household: a pull never misses a revision committed late. */
async function lockHousehold(tx: Database, householdId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${householdId}))`)
}

export async function pushMutations(db: Database, input: { email: string, body: PushBody }): Promise<{ accepted: number }> {
  const email = input.email.toLowerCase()
  const mutations = input.body.mutations.map(({ table, row }) => {
    const parsed = rowSchemas[table].safeParse(row)
    if (!parsed.success) {
      throw new ServiceError(400, `Ligne invalide dans ${table} : ${parsed.error.issues[0]?.message ?? 'format'}`)
    }
    return { table, row: parsed.data as Row }
  })
  if (!mutations.length) {
    return { accepted: 0 }
  }

  const householdIds = new Set(mutations.map(m => m.row.householdId))
  if (householdIds.size !== 1) {
    throw new ServiceError(400, 'Un envoi ne concerne qu\'une seule maison.')
  }
  const householdId = [...householdIds][0]!

  const membership = await findMembershipByEmail(db, email)
  if (membership && membership.householdId !== householdId) {
    throw new ServiceError(403, 'Cette maison n\'est pas la tienne.')
  }
  if (!membership) {
    // First sync of a household created on the device: it must be new and list this account.
    const [existing] = await db.select({ id: schema.households.id }).from(schema.households).where(eq(schema.households.id, householdId)).limit(1)
    const createsHousehold = mutations.some(m => m.table === 'households' && m.row.id === householdId)
    const listsSelf = mutations.some(m => m.table === 'members' && m.row.email?.toString().toLowerCase() === email)
    if (existing || !createsHousehold || !listsSelf) {
      throw new ServiceError(403, 'Ce compte ne fait partie d\'aucune maison.')
    }
  }

  await db.transaction(async (tx) => {
    await lockHousehold(tx, householdId)
    for (const table of SYNC_TABLE_ORDER) {
      for (const { row } of mutations.filter(m => m.table === table)) {
        await upsert(tx, table, row, email)
      }
    }
  })
  return { accepted: mutations.length }
}

async function upsert(tx: Database, table: SyncedTableName, row: Row, email: string) {
  const target = TABLES[table]
  const values = toDatabase(row)
  if (table === 'households') {
    values.householdId = values.id
  }
  if (table === 'members') {
    // Emails are identities: only the pusher can list their own, the second one comes from an invitation.
    values.email = typeof values.email === 'string' && values.email.toLowerCase() === email ? email : null
  }
  const { id: _id, householdId: _householdId, email: _email, ...updatable } = values
  await tx.insert(target)
    .values({ ...values, rev: sql`nextval('sync_rev')` } as never)
    .onConflictDoUpdate({
      target: target.id,
      set: { ...updatable, rev: sql`nextval('sync_rev')` } as never,
      // Last write wins, and a row can never move to another household.
      setWhere: and(eq(target.householdId, row.householdId), lte(target.updatedAt, new Date(row.updatedAt))),
    })
}

export async function pullChanges(db: Database, input: { email: string, since: number }): Promise<PullResponse> {
  const membership = await findMembershipByEmail(db, input.email)
  if (!membership) {
    throw new ServiceError(403, 'Ce compte ne fait partie d\'aucune maison.')
  }
  return db.transaction(async (tx) => {
    await lockHousehold(tx, membership.householdId)
    const rows: PullResponse['rows'] = []
    let cursor = input.since
    for (const table of SYNC_TABLE_ORDER) {
      const target = TABLES[table]
      const found = await tx.select().from(target)
        .where(and(eq(target.householdId, membership.householdId), gt(target.rev, input.since)))
      for (const row of found as Record<string, unknown>[]) {
        cursor = Math.max(cursor, Number(row.rev))
        rows.push({ table, row: toWire(row) })
      }
    }
    return { rows, cursor }
  })
}
