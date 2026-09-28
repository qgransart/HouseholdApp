import { createHash, timingSafeEqual } from 'node:crypto'
import { runNotificationTick } from '../../services/notifications'

/** Compares digests: constant time, whatever the length of the received value. */
function isValidSecret(received: string | undefined, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return !!received && timingSafeEqual(digest(received), digest(expected))
}

/**
 * Called every 15 minutes by cron-job.org with `Authorization: Bearer <NUXT_CRON_SECRET>`.
 * GET and POST are both accepted, whichever the scheduler sends.
 */
export default defineEventHandler(async (event) => {
  assertMethod(event, ['GET', 'POST'])
  const { cronSecret } = useRuntimeConfig(event)
  const received = getHeader(event, 'authorization')?.replace(/^Bearer /, '')
  // Neutral answer: a caller without the secret learns nothing, not even whether it is set.
  if (!cronSecret || !isValidSecret(received, cronSecret)) {
    throw createError({ statusCode: 404 })
  }
  const sender = usePushSender()
  if (!sender) {
    return { households: 0, sent: 0, skipped: 'push not configured' }
  }
  return runNotificationTick(useDb(), { now: new Date(), sender })
})
