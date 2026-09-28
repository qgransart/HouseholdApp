import { z } from 'zod'
import { pullChanges } from '../../services/sync'

const querySchema = z.object({
  since: z.coerce.number().int().min(0).default(0),
})

export default defineEventHandler(async (event) => {
  const user = await requireAllowedUser(event)
  const { since } = await getValidatedQuery(event, querySchema.parse)
  return withServiceErrors(() => pullChanges(useDb(), { email: user.email, since }))
})
