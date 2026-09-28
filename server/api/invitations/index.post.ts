import { createInvitation } from '../../services/invitations'

export default defineEventHandler(async (event) => {
  const user = await requireAllowedUser(event)
  const invitation = await withServiceErrors(() => createInvitation(useDb(), { inviterEmail: user.email, now: new Date() }))
  return { ...invitation, expiresAt: invitation.expiresAt.toISOString() }
})
