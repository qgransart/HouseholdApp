/**
 * Asks the browser not to evict IndexedDB under storage pressure (ARCHITECTURE §6.3).
 * Chrome grants it silently to installed apps; until sync exists, this device is the only copy.
 */
export default defineNuxtPlugin(() => {
  void (async () => {
    try {
      if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
        await navigator.storage.persist()
      }
    }
    catch {
      // Best effort: the app works the same, only eviction protection is missing.
    }
  })()
})
