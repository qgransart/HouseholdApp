import { z } from 'zod'
import { saveSubscription } from '../../services/notifications'

const bodySchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
})

export default defineEventHandler(async (event) => {
  const member = await requireMember(event)
  const subscription = await readValidatedBody(event, bodySchema.parse)
  await saveSubscription(useDb(), { householdId: member.householdId, memberId: member.memberId, subscription, now: new Date() })
  setResponseStatus(event, 204)
})
