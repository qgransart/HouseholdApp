// Shape of the sealed session cookie (nuxt-auth-utils).
declare module '#auth-utils' {
  interface User {
    /** Lower-cased Google account email: the identity of a member. */
    email: string
    name: string
    picture?: string
  }
}

export {}
