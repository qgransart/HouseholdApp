import { getMeta, META_HOUSEHOLD_ID } from '~/db/repository'

const LOGIN_PATH = '/connexion'
const ONBOARDING_PATH = '/bienvenue'

/**
 * - A device with a household always opens the game, even offline or signed out: play is local-first.
 * - A device without household needs a Google session to create one (its owner is identified by it).
 * Reads the database directly: a live query could still hold the state from before the creation.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === LOGIN_PATH) {
    return
  }
  const hasHousehold = Boolean(await getMeta<string>(useDatabase(), META_HOUSEHOLD_ID))
  if (hasHousehold) {
    return to.path === ONBOARDING_PATH ? navigateTo('/', { replace: true }) : undefined
  }

  const session = useUserSession()
  if (!session.loggedIn.value) {
    await session.fetch().catch(() => undefined)
  }
  if (!session.loggedIn.value) {
    return navigateTo(LOGIN_PATH, { replace: true })
  }
  if (to.path !== ONBOARDING_PATH) {
    return navigateTo(ONBOARDING_PATH, { replace: true })
  }
})
