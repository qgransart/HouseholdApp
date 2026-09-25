import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import type { Database } from '../../server/db/client'
import * as schema from '../../server/db/schema'

/** In-memory Postgres (WASM) with the real migrations applied: same SQL as production. */
export async function createTestDatabase(): Promise<Database> {
  const db = drizzle(new PGlite(), { schema, casing: 'snake_case' })
  await migrate(db, { migrationsFolder: 'server/db/migrations' })
  return db as unknown as Database
}

/** Empties every table: faster than migrating a fresh database for each test. */
export async function resetTestDatabase(db: Database): Promise<void> {
  const tables = ['invitations', 'members', 'categories', 'tasks', 'completions', 'signals', 'rewards', 'purchases', 'reactions', 'vacations', 'households']
  await db.execute(sql.raw(`TRUNCATE ${tables.map(table => `"${table}"`).join(', ')} CASCADE`))
}

export const NOW = new Date('2026-09-24T08:00:00Z')

/** A household with two members, as the first sync push will create it (lot 5). */
export async function seedHousehold(db: Database, options: { firstEmail?: string | null, secondEmail?: string | null } = {}) {
  const householdId = crypto.randomUUID()
  const firstId = crypto.randomUUID()
  const secondId = crypto.randomUUID()
  await db.insert(schema.households).values({ id: householdId, householdId, updatedAt: NOW, name: 'Appartement', timezone: 'Europe/Paris' })
  await db.insert(schema.members).values([
    { id: firstId, householdId, updatedAt: NOW, displayName: 'Quentin', email: options.firstEmail === undefined ? 'quentin@example.com' : options.firstEmail, dailyBudgetMin: 35 },
    { id: secondId, householdId, updatedAt: NOW, displayName: 'Camille', email: options.secondEmail ?? null, dailyBudgetMin: 35 },
  ])
  return { householdId, firstId, secondId }
}
