// Starts the background sync once the app runs; it stays idle until a household and a session exist.
export default defineNuxtPlugin({
  name: 'sync',
  setup(nuxtApp) {
    nuxtApp.hook('app:mounted', () => {
      useSync().start()
    })
  },
})
