import { createDatabase, type Database } from '../db/client'

let database: Database | undefined

/** One connection per server instance, created on first use. */
export function useDb(): Database {
  if (!database) {
    const { databaseUrl } = useRuntimeConfig()
    if (!databaseUrl) {
      throw createError({ statusCode: 503, statusMessage: 'Database not configured' })
    }
    database = createDatabase(databaseUrl)
  }
  return database
}
