import webpush from 'web-push'
import type { PushSender } from '../services/notifications'

let sender: PushSender | null | undefined

/** Web Push through the VAPID keys; `null` while they are not configured (notifications off). */
export function usePushSender(): PushSender | null {
  if (sender === undefined) {
    const { vapidPrivateKey, vapidSubject, public: { vapidPublicKey } } = useRuntimeConfig()
    sender = vapidPublicKey && vapidPrivateKey && vapidSubject
      ? createWebPushSender({ publicKey: vapidPublicKey, privateKey: vapidPrivateKey, subject: vapidSubject })
      : null
  }
  return sender
}

function createWebPushSender(vapidDetails: { publicKey: string, privateKey: string, subject: string }): PushSender {
  return async (target, message, options) => {
    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        JSON.stringify(message),
        // The topic collapses undelivered notifications of the same tag on the push service.
        { vapidDetails, TTL: options.ttlSeconds, urgency: options.urgency, topic: message.tag },
      )
      return 'sent'
    }
    catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        return 'gone'
      }
      console.error('[push] sending failed:', statusCode ?? error)
      return 'failed'
    }
  }
}
