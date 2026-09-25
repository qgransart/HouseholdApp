const TICK_MS = 60_000

const now = ref(new Date())
let started = false

/**
 * Shared "now", refreshed every minute and when the app comes back to the foreground,
 * so that freshness and quests roll over at midnight without a reload.
 */
export function useClock(): Readonly<Ref<Date>> {
  if (!started && import.meta.client) {
    started = true
    const refresh = () => {
      now.value = new Date()
    }
    setInterval(refresh, TICK_MS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    })
  }
  return readonly(now)
}
