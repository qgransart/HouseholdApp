import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/** Driver-agnostic handle: postgres-js in production, PGlite in tests. */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

/**
 * postgres.js forwards unknown URL parameters to the server as runtime settings. Neon's
 * connection strings include `channel_binding=require` (a libpq option postgres.js does not
 * implement), which the server would reject: it is removed, TLS stays enforced by `sslmode`.
 */
export function toPostgresJsUrl(url: string): string {
  const parsed = new URL(url)
  parsed.searchParams.delete('channel_binding')
  return parsed.toString()
}

export function createDatabase(url: string): Database {
  // Neon's pooled endpoint (PgBouncer, transaction mode) does not support prepared statements.
  const client = postgres(toPostgresJsUrl(url), { prepare: false, max: 1 })
  return drizzle(client, { schema, casing: 'snake_case' })
}
