import { getMeta, META_HOUSEHOLD_ID } from '~/db/repository'

const ONBOARDING_PATH = '/bienvenue'

/**
 * Routes a device without household to the onboarding, and away from it once created.
 * Reads the database directly: a live query could still hold the state from before the creation.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const hasHousehold = Boolean(await getMeta<string>(useDatabase(), META_HOUSEHOLD_ID))
  if (!hasHousehold && to.path !== ONBOARDING_PATH) {
    return navigateTo(ONBOARDING_PATH, { replace: true })
  }
  if (hasHousehold && to.path === ONBOARDING_PATH) {
    return navigateTo('/', { replace: true })
  }
})
