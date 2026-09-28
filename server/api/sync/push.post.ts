import { pushBodySchema } from '#shared/schemas/rows'
import { notifySignals } from '../../services/notifications'
import { pushMutations } from '../../services/sync'

export default defineEventHandler(async (event) => {
  const user = await requireAllowedUser(event)
  const body = await readValidatedBody(event, pushBodySchema.parse)
  const result = await withServiceErrors(() => pushMutations(useDb(), { email: user.email, body }))

  // A "c'est plein" reaches the other phone right away instead of at the next tick.
  const householdId = body.mutations[0]?.row.householdId
  const sender = usePushSender()
  if (sender && typeof householdId === 'string' && body.mutations.some(m => m.table === 'signals')) {
    try {
      await notifySignals(useDb(), { householdId, now: new Date(), sender })
    }
    catch (error) {
      // The sync succeeded: a notification failure must not make the device push again.
      console.error('[push] signal notification failed:', error)
    }
  }
  return result
})
