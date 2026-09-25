/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

// App shell, scripts, styles, fonts and icons: everything needed to open the app offline.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA: every navigation is served by the precached shell, the client router takes over.
// API calls (lot 4+) are never cached here: they go to the network, data lives in IndexedDB.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/'), { denylist: [/^\/api\//] }))

// Updates wait for the player's consent (see PwaUpdatePrompt), never interrupting a game action.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})
