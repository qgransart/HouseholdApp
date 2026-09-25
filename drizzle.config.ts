import { defineConfig } from 'drizzle-kit'

// `pnpm db:generate` needs no database; `pnpm db:migrate` applies migrations to NUXT_DATABASE_URL.
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.NUXT_DATABASE_URL ?? '',
  },
})
