import { createDatabase, type HouseholdDatabase } from '~/db/database'

let database: HouseholdDatabase | undefined

/** Single IndexedDB connection for the whole app (client-only: the app runs as a SPA). */
export function useDatabase(): HouseholdDatabase {
  database ??= createDatabase()
  return database
}
