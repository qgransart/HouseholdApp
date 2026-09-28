/**
 * Runs a composable once for the whole app and shares its state between components,
 * so that several views don't each open the same database subscriptions.
 * The detached scope lives as long as the SPA.
 */
export function createSharedComposable<T>(composable: () => T): () => T {
  let state: T | undefined
  return () => {
    if (state === undefined) {
      state = effectScope(true).run(composable)!
    }
    return state
  }
}
