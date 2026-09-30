/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

// App shell, scripts, styles, fonts and icons: everything needed to open the app offline.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA: every navigation is served by the precached shell, the client router takes over.
// API calls (lot 4+) are never cached here: they go to the network, data lives in IndexedDB.
// Server routes (API, OAuth callback) must always reach the network.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/'), { denylist: [/^\/api\//, /^\/auth\//] }))

// Updates wait for the player's consent (see PwaUpdatePrompt), never interrupting a game action.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

/** Payload sent by the server (shared/domain/notifications.ts). */
interface PushPayload {
  title: string
  body: string
  tag: string
  url: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload
  try {
    payload = event.data?.json() as PushPayload
  }
  catch {
    return
  }
  if (!payload?.title) {
    return
  }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    // A replaced notification (same tag) still alerts: it carries new information.
    renotify: true,
    icon: '/pwa-192x192.png',
    // Android keeps only the alpha channel of the badge: a white silhouette on transparency.
    badge: '/notification-badge.png',
    data: { url: payload.url },
  } as NotificationOptions))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data as { url?: string } | null)?.url ?? '/', self.location.origin)
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find(client => new URL(client.url).origin === url.origin)
    if (open) {
      await open.focus()
      if (new URL(open.url).pathname !== url.pathname) {
        await open.navigate(url.href).catch(() => {})
      }
      return
    }
    await self.clients.openWindow(url.href)
  })())
})
