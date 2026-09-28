import { pushBodySchema } from '#shared/schemas/rows'
import { pushMutations } from '../../services/sync'

export default defineEventHandler(async (event) => {
  const user = await requireAllowedUser(event)
  const body = await readValidatedBody(event, pushBodySchema.parse)
  return withServiceErrors(() => pushMutations(useDb(), { email: user.email, body }))
})
