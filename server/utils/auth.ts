import type { H3Event } from 'h3'
import { isEmailAllowed, parseAllowList } from '../services/allowList'
import { findMembershipByEmail, type Membership } from '../services/membership'

/**
 * Signed-in and still on the allow-list: removing an email from the list revokes
 * its access at the next request, without waiting for the session to expire.
 */
export async function requireAllowedUser(event: H3Event) {
  const { user } = await requireUserSession(event)
  if (!isEmailAllowed(user.email, parseAllowList(useRuntimeConfig(event).allowedEmails))) {
    await clearUserSession(event)
    throw createError({ statusCode: 403, statusMessage: 'Account not allowed' })
  }
  return user
}

export async function requireMember(event: H3Event): Promise<Membership & { email: string }> {
  const user = await requireAllowedUser(event)
  const membership = await findMembershipByEmail(useDb(), user.email)
  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: 'Not a member of any household' })
  }
  return { ...membership, email: user.email }
}
