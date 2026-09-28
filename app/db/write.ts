import type { SyncedRow, SyncedTableName, SyncedTables } from '#shared/types/entities'
import type { HouseholdDatabase } from './database'

export type Draft<Row extends SyncedRow> = Omit<Row, 'updatedAt' | 'deletedAt'> & Partial<Pick<Row, 'deletedAt'>>

/**
 * Every local write goes through here: the row is stamped and queued in the outbox
 * in the same transaction, so that nothing written offline can be forgotten by the sync.
 */
export async function writeRows<Name extends SyncedTableName>(
  db: HouseholdDatabase,
  table: Name,
  drafts: Draft<SyncedTables[Name]>[],
  now: Date,
): Promise<SyncedTables[Name][]> {
  const updatedAt = now.toISOString()
  const rows = drafts.map(draft => ({ deletedAt: null, ...draft, updatedAt }) as SyncedTables[Name])
  const target = db.table<SyncedTables[Name], string>(table)
  await db.transaction('rw', [target, db.outbox], async () => {
    await target.bulkPut(rows)
    await db.outbox.bulkAdd(rows.map(row => ({ table, rowId: row.id })))
  })
  return rows
}

export const notDeleted = <Row extends SyncedRow>(row: Row) => row.deletedAt === null

/** Merges a patch into an existing, non-deleted row and writes it through the outbox. */
export async function updateRow<Name extends SyncedTableName>(
  db: HouseholdDatabase,
  table: Name,
  id: string,
  patch: Partial<SyncedTables[Name]>,
  now: Date,
): Promise<SyncedTables[Name] | null> {
  const current = await db.table<SyncedTables[Name], string>(table).get(id)
  if (!current || current.deletedAt) {
    return null
  }
  const [row] = await writeRows(db, table, [{ ...current, ...patch }], now)
  return row ?? null
}
