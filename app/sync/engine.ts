import { MAX_PUSH_MUTATIONS, type PullResponse, type PushBody } from '#shared/schemas/rows'
import type { SyncedTableName } from '#shared/types/entities'
import type { HouseholdDatabase } from '../db/database'
import { getMeta, setMeta } from '../db/repository'

/* Client side of the sync protocol (ARCHITECTURE §6). Transport-agnostic, hence testable. */

export interface SyncTransport {
  push: (body: PushBody) => Promise<unknown>
  pull: (since: number) => Promise<PullResponse>
}

export const META_SYNC_CURSOR = 'syncCursor'

/** Sends the outbox in batches; an entry leaves the outbox only once the server acknowledged it. */
export async function pushOutbox(db: HouseholdDatabase, transport: SyncTransport): Promise<number> {
  let sent = 0
  for (;;) {
    const entries = await db.outbox.orderBy('seq').limit(MAX_PUSH_MUTATIONS).toArray()
    if (!entries.length) {
      return sent
    }
    // Several writes of the same row travel once, with its latest state.
    const keys = [...new Map(entries.map(e => [`${e.table}:${e.rowId}`, e])).values()]
    const mutations: PushBody['mutations'] = []
    for (const { table, rowId } of keys) {
      const row = await db.table(table).get(rowId)
      if (row) {
        mutations.push({ table, row })
      }
    }
    if (mutations.length) {
      await transport.push({ mutations })
    }
    await db.outbox.bulkDelete(entries.map(e => e.seq!))
    sent += entries.length
  }
}

/**
 * Applies the server changes. A row with a pending local change is left alone: the local
 * version is pushed next and arbitrated by the server (§6.1).
 */
export async function pullChanges(db: HouseholdDatabase, transport: SyncTransport, options: { since?: number } = {}): Promise<number> {
  const since = options.since ?? await getMeta<number>(db, META_SYNC_CURSOR) ?? 0
  const { rows, cursor } = await transport.pull(since)
  await db.transaction('rw', [...new Set(rows.map(r => db.table(r.table))), db.outbox, db.meta], async () => {
    const pending = new Set((await db.outbox.toArray()).map(e => `${e.table}:${e.rowId}`))
    const byTable = new Map<SyncedTableName, unknown[]>()
    for (const { table, row } of rows) {
      if (!pending.has(`${table}:${String(row.id)}`)) {
        byTable.set(table, [...byTable.get(table) ?? [], row])
      }
    }
    for (const [table, tableRows] of byTable) {
      await db.table(table).bulkPut(tableRows)
    }
    await setMeta(db, META_SYNC_CURSOR, cursor)
  })
  return rows.length
}

export async function syncOnce(db: HouseholdDatabase, transport: SyncTransport): Promise<{ pushed: number, pulled: number }> {
  const pushed = await pushOutbox(db, transport)
  const pulled = await pullChanges(db, transport)
  return { pushed, pulled }
}
