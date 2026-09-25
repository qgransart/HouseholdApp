import Dexie, { type EntityTable } from 'dexie'
import type { SyncedTableName, SyncedTables } from '#shared/types/entities'

/** Pending local change, pushed to the server by the sync client (lot 5). */
export interface OutboxEntry {
  seq?: number
  table: SyncedTableName
  rowId: string
}

/** Device-local settings, never synchronised. */
export interface MetaEntry {
  key: string
  value: unknown
}

type SyncedEntityTables = { [Name in SyncedTableName]: EntityTable<SyncedTables[Name], 'id'> }

export type HouseholdDatabase = Dexie & SyncedEntityTables & {
  outbox: EntityTable<OutboxEntry, 'seq'>
  meta: EntityTable<MetaEntry, 'key'>
}

export const SYNCED_TABLES = [
  'households',
  'members',
  'categories',
  'tasks',
  'completions',
  'signals',
  'rewards',
  'purchases',
  'reactions',
  'vacations',
] as const satisfies readonly SyncedTableName[]

/**
 * Any change here needs a new `version()` (Dexie migration) and a matching Drizzle migration
 * on the server (ARCHITECTURE §6.3).
 */
export function createDatabase(name = 'household-app'): HouseholdDatabase {
  const db = new Dexie(name) as HouseholdDatabase
  db.version(1).stores({
    households: 'id',
    members: 'id, householdId',
    categories: 'id, householdId',
    tasks: 'id, householdId, categoryId',
    completions: 'id, householdId, taskId, memberId',
    signals: 'id, householdId, taskId',
    rewards: 'id, householdId',
    purchases: 'id, householdId, memberId',
    reactions: 'id, householdId, completionId',
    vacations: 'id, householdId',
    outbox: '++seq',
    meta: 'key',
  })
  return db
}
