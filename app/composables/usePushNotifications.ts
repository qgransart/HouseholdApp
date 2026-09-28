export type PushPermission = NotificationPermission | 'unsupported'

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + '='.repeat((4 - value.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0))
}

function sameKey(key: ArrayBuffer | null | undefined, expected: Uint8Array): boolean {
  if (!key || key.byteLength !== expected.byteLength) {
    return false
  }
  const bytes = new Uint8Array(key)
  return bytes.every((byte, index) => byte === expected[index])
}

/**
 * Web Push subscription of this device (ARCHITECTURE §7). The server sends the notifications;
 * this device only has to give it a valid endpoint, refreshed at each start because push services
 * may rotate it.
 */
export const usePushNotifications = createSharedComposable(() => {
  const publicKey = useRuntimeConfig().public.vapidPublicKey as string
  const permission = ref<PushPermission>('default')
  /** The server has VAPID keys: without them, only the permission can be asked. */
  const configured = Boolean(publicKey)

  function readPermission() {
    permission.value = import.meta.client && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
      ? Notification.permission
      : 'unsupported'
  }

  /** Registers this device on the server; `false` when it cannot (no service worker, no key, offline). */
  async function subscribe(): Promise<boolean> {
    readPermission()
    if (!configured || permission.value !== 'granted') {
      return false
    }
    // The service worker is disabled in development: `ready` would never resolve.
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      return false
    }
    const key = base64UrlToBytes(publicKey)
    let subscription = await registration.pushManager.getSubscription()
    if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
      // Keys rotated on the server: the old endpoint can no longer be used.
      await subscription.unsubscribe()
      subscription = null
    }
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
    await $fetch('/api/push/subscribe', { method: 'POST', body: subscription.toJSON() })
    return true
  }

  /** Asks for the permission (must follow a tap), then subscribes. */
  async function enable(): Promise<boolean> {
    readPermission()
    if (permission.value === 'unsupported') {
      return false
    }
    permission.value = await Notification.requestPermission()
    return subscribe()
  }

  async function sendTest(): Promise<number> {
    const { sent } = await $fetch<{ sent: number }>('/api/push/test', { method: 'POST' })
    return sent
  }

  if (import.meta.client) {
    readPermission()
  }

  return { permission, configured, subscribe, enable, sendTest, readPermission }
})
