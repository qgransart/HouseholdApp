import { z } from 'zod'
import { acceptInvitation } from '../../services/invitations'

const bodySchema = z.object({
  code: z.string().trim().min(4).max(20),
})

export default defineEventHandler(async (event) => {
  const user = await requireAllowedUser(event)
  const { code } = await readValidatedBody(event, bodySchema.parse)
  return withServiceErrors(() => acceptInvitation(useDb(), { code, email: user.email, now: new Date() }))
})
