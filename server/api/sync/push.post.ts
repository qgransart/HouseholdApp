import { pushBodySchema } from '#shared/schemas/rows'
import { notifyInstant } from '../../services/notifications'
import { pushMutations } from '../../services/sync'

const INSTANT_TABLES = new Set(['signals', 'claims', 'trades'])

export default defineEventHandler(async (event) => {
  const user = await requireAllowedUser(event)
  const body = await readValidatedBody(event, pushBodySchema.parse)
  const result = await withServiceErrors(() => pushMutations(useDb(), { email: user.email, body }))

  // A "c'est plein", "je m'en occupe" or trade reaches the other phone right away, not at the next tick.
  const householdId = body.mutations[0]?.row.householdId
  const sender = usePushSender()
  if (sender && typeof householdId === 'string' && body.mutations.some(m => INSTANT_TABLES.has(m.table))) {
    try {
      await notifyInstant(useDb(), { householdId, now: new Date(), sender })
    }
    catch (error) {
      // The sync succeeded: a notification failure must not make the device push again.
      console.error('[push] instant notification failed:', error)
    }
  }
  return result
})
