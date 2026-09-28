// Applies pending database migrations during the Vercel production build, so that the schema is
// always up to date with the deployed code. Skipped for previews and when no database is set.
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = process.env.NUXT_DATABASE_URL
const environment = process.env.VERCEL_ENV

if (!url) {
  console.log('[migrate] NUXT_DATABASE_URL is not set: skipped.')
  process.exit(0)
}
if (environment && environment !== 'production') {
  console.log(`[migrate] ${environment} deployment: skipped, only production migrates.`)
  process.exit(0)
}

// Same connection rules as the app (server/db/client.ts): postgres.js does not know channel_binding.
const parsed = new URL(url)
parsed.searchParams.delete('channel_binding')
const client = postgres(parsed.toString(), { prepare: false, max: 1, onnotice: () => {} })

try {
  await migrate(drizzle(client), { migrationsFolder: 'server/db/migrations' })
  console.log('[migrate] Database schema is up to date.')
}
catch (error) {
  console.error('[migrate] Migration failed:', error)
  process.exitCode = 1
}
finally {
  await client.end()
}
