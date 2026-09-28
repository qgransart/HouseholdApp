/** Emails are compared case-insensitively; the list is a comma-separated environment variable. */
export function parseAllowList(raw: string | undefined): Set<string> {
  return new Set((raw ?? '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean))
}

export function isEmailAllowed(email: string | null | undefined, allowList: ReadonlySet<string>): boolean {
  return !!email && allowList.has(email.trim().toLowerCase())
}
