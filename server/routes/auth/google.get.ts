import { isEmailAllowed, parseAllowList } from '../../services/allowList'

// Callback URL to declare in Google Cloud Console: https://<domain>/auth/google
export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['email', 'profile'],
  },
  async onSuccess(event, { user }) {
    const allowList = parseAllowList(useRuntimeConfig(event).allowedEmails)
    if (!user.email_verified || !isEmailAllowed(user.email, allowList)) {
      return sendRedirect(event, '/connexion?erreur=non-autorise')
    }
    await setUserSession(event, {
      user: { email: String(user.email).toLowerCase(), name: user.name ?? user.email, picture: user.picture },
    })
    return sendRedirect(event, '/')
  },
  onError(event, error) {
    console.error('[auth/google]', error)
    return sendRedirect(event, '/connexion?erreur=google')
  },
})
