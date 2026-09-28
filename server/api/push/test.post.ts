import { sendTestNotification } from '../../services/notifications'

export default defineEventHandler(async (event) => {
  const member = await requireMember(event)
  const sender = usePushSender()
  if (!sender) {
    throw createError({ statusCode: 503, statusMessage: 'Push not configured', data: { message: 'Les notifications ne sont pas encore configurées sur le serveur.' } })
  }
  return sendTestNotification(useDb(), { householdId: member.householdId, memberId: member.memberId, sender })
})
