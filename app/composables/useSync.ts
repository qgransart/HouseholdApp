import type { PullResponse, PushBody } from '#shared/schemas/rows'
import { META_HOUSEHOLD_ID, META_CURRENT_MEMBER_ID, getMeta, setMeta } from '~/db/repository'
import { updateMember } from '~/db/management'
import { pullChanges, syncOnce, type SyncTransport } from '~/sync/engine'

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'signed-out' | 'error'

const PERIOD_MS = 60_000
const DEBOUNCE_MS = 1_000

const transport: SyncTransport = {
  push: (body: PushBody) => $fetch('/api/sync/push', { method: 'POST', body }),
  pull: (since: number) => $fetch<PullResponse>('/api/sync/pull', { query: { since } }),
}

function statusOf(error: unknown): SyncStatus {
  const code = (error as { statusCode?: number, response?: { status?: number } })?.statusCode ?? (error as { response?: { status?: number } })?.response?.status
  if (code === 401 || code === 403) {
    return 'signed-out'
  }
  return navigator.onLine ? 'error' : 'offline'
}

export function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { data?: { message?: string }, message?: string } })?.data
  return data?.data?.message ?? fallback
}

/**
 * Background sync between this device and the server (ARCHITECTURE §6.2): at start-up, when the
 * app comes back to the foreground or online, one second after a local write, and every minute.
 * The game never waits for it: it reads and writes the local database only.
 */
export const useSync = createSharedComposable(() => {
  const db = useDatabase()
  const session = useUserSession()
  const { snapshot, currentMember } = useHousehold()

  const status = ref<SyncStatus>('idle')
  const lastSyncedAt = ref<Date | null>(null)
  const lastError = ref('')
  let running: Promise<void> | null = null
  let debounce: ReturnType<typeof setTimeout> | undefined
  let started = false

  /** A household created before signing in gets the current account on its player. */
  async function claimCurrentMember() {
    const email = session.user.value?.email
    const members = snapshot.value?.members ?? []
    if (!email || members.some(m => m.email === email) || !currentMember.value || currentMember.value.email) {
      return
    }
    await updateMember(db, { memberId: currentMember.value.id, changes: { email }, now: new Date() })
  }

  async function run() {
    if (!session.loggedIn.value || !await getMeta<string>(db, META_HOUSEHOLD_ID)) {
      status.value = session.loggedIn.value ? 'idle' : 'signed-out'
      return
    }
    status.value = 'syncing'
    try {
      await claimCurrentMember()
      await syncOnce(db, transport)
      status.value = 'idle'
      lastSyncedAt.value = new Date()
      lastError.value = ''
    }
    catch (error) {
      status.value = statusOf(error)
      lastError.value = errorMessage(error, '')
    }
  }

  /** Runs a sync now, or waits for the one in progress. */
  function now(): Promise<void> {
    running ??= run().finally(() => {
      running = null
    })
    return running
  }

  function schedule() {
    clearTimeout(debounce)
    debounce = setTimeout(() => void now(), DEBOUNCE_MS)
  }

  function start() {
    if (started || !import.meta.client) {
      return
    }
    started = true
    db.outbox.hook('creating', () => {
      schedule()
    })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void now()
      }
    })
    window.addEventListener('online', () => void now())
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        void now()
      }
    }, PERIOD_MS)
    watch(() => session.loggedIn.value, loggedIn => loggedIn && void now())
    void now()
  }

  /**
   * Makes a household that exists on the server this device's household: after joining with a
   * code, or when reinstalling the app. Downloads everything from scratch.
   */
  async function adoptHousehold(householdId: string, memberId: string) {
    await pullChanges(db, transport, { since: 0 })
    await setMeta(db, META_HOUSEHOLD_ID, householdId)
    await setMeta(db, META_CURRENT_MEMBER_ID, memberId)
    lastSyncedAt.value = new Date()
  }

  return { status: readonly(status), lastSyncedAt: readonly(lastSyncedAt), lastError: readonly(lastError), now, start, adoptHousehold }
})
