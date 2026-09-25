import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/** Driver-agnostic handle: postgres-js in production, PGlite in tests. */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

export function createDatabase(url: string): Database {
  // Neon's pooled endpoint (PgBouncer, transaction mode) does not support prepared statements.
  const client = postgres(url, { prepare: false, max: 1 })
  return drizzle(client, { schema, casing: 'snake_case' })
}
