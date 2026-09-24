import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests target pure code (shared/domain, sync protocol): a plain Node environment is enough,
// no Nuxt runtime needed. Aliases mirror the ones Nuxt exposes.
export default defineConfig({
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
})
