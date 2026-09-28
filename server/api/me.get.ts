import { findMembershipByEmail } from '../services/membership'

/** Who is signed in, and which household (if any) the account belongs to on the server. */
export default defineEventHandler(async (event) => {
  const user = await requireAllowedUser(event)
  const membership = await findMembershipByEmail(useDb(), user.email)
  return { user, membership }
})
