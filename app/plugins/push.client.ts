// Refreshes the push subscription once per start, after the first successful sync: the server
// only accepts it once the household exists there and the player is signed in.
export default defineNuxtPlugin({
  name: 'push',
  dependsOn: ['sync'],
  setup(nuxtApp) {
    nuxtApp.hook('app:mounted', () => {
      const push = usePushNotifications()
      const stop = watch(useSync().lastSyncedAt, (syncedAt) => {
        if (syncedAt && push.permission.value === 'granted') {
          stop()
          push.subscribe().catch(error => console.warn('[push] subscription refresh failed:', error))
        }
      })
    })
  },
})
