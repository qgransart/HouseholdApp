import { and, countDistinct, eq, inArray, isNull } from 'drizzle-orm'
import {
  generateDailyQuests,
  buildTaskProgress,
  eveningMessage,
  isOnVacation,
  isQuietTime,
  MAX_NOTIFICATIONS_PER_DAY,
  morningMessage,
  openScheduledWindows,
  SIGNAL_NOTIFICATION_MAX_AGE_HOURS,
  signalMessage,
  toLocalDate,
  toLocalTime,
  type NotificationKind,
  type NotificationMessage,
  type SignalAlert,
  type Task,
} from '#shared/domain'
import { toDomainTask } from '#shared/mappers'
import type { CategoryRow, CompletionRow, HouseholdRow, MemberRow, SignalRow, TaskRow, VacationRow } from '#shared/types/entities'
import type { Database } from '../db/client'
import * as schema from '../db/schema'
import { lockHousehold, toWire } from './sync'

/* Web Push notifications (ARCHITECTURE §7). Sending is injected: tests never reach a push service. */

export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

/** `gone`: the push service no longer knows the endpoint (app uninstalled, permission revoked). */
export type PushResult = 'sent' | 'gone' | 'failed'

export interface PushOptions {
  /** How long the push service keeps an undelivered notification (phone offline). */
  ttlSeconds: number
  urgency: 'normal' | 'high'
}

export type PushSender = (target: PushTarget, message: NotificationMessage, options: PushOptions) => Promise<PushResult>

const PUSH_OPTIONS: Record<NotificationKind, PushOptions> = {
  morning: { ttlSeconds: 2 * 3600, urgency: 'normal' },
  evening: { ttlSeconds: 2 * 3600, urgency: 'normal' },
  signal: { ttlSeconds: 12 * 3600, urgency: 'high' },
}

export interface SubscriptionInput {
  endpoint: string
  keys: { p256dh: string, auth: string }
}

export async function saveSubscription(db: Database, input: { householdId: string, memberId: string, subscription: SubscriptionInput, now: Date }) {
  const values = {
    householdId: input.householdId,
    memberId: input.memberId,
    endpoint: input.subscription.endpoint,
    p256dh: input.subscription.keys.p256dh,
    auth: input.subscription.keys.auth,
    createdAt: input.now,
  }
  await db.insert(schema.pushSubscriptions).values(values)
    .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: values })
}

async function sendToMember(db: Database, sender: PushSender, targets: readonly PushTarget[], message: NotificationMessage, options: PushOptions): Promise<number> {
  let sent = 0
  for (const target of targets) {
    const result = await sender(target, message, options)
    if (result === 'sent') {
      sent++
    }
    else if (result === 'gone') {
      await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, target.endpoint))
    }
  }
  return sent
}

async function subscriptionsOf(db: Database, householdId: string): Promise<Map<string, PushTarget[]>> {
  const rows = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.householdId, householdId))
  const byMember = new Map<string, PushTarget[]>()
  for (const row of rows) {
    byMember.set(row.memberId, [...byMember.get(row.memberId) ?? [], row])
  }
  return byMember
}

/** Checks the whole chain from the settings screen; not logged, not capped. */
export async function sendTestNotification(db: Database, input: { householdId: string, memberId: string, sender: PushSender }): Promise<{ sent: number }> {
  const targets = (await subscriptionsOf(db, input.householdId)).get(input.memberId) ?? []
  const message = { title: 'Ça marche ! 🎉', body: 'Les quêtes du matin et les alertes arriveront ici.', tag: 'test', url: '/reglages' }
  return { sent: await sendToMember(db, input.sender, targets, message, { ttlSeconds: 600, urgency: 'high' }) }
}

interface HouseholdState {
  household: HouseholdRow
  members: MemberRow[]
  categories: CategoryRow[]
  tasks: Task[]
  completions: CompletionRow[]
  signals: SignalRow[]
  vacations: VacationRow[]
}

async function loadHouseholdState(db: Database, householdId: string): Promise<HouseholdState | null> {
  const load = async <T>(table: typeof schema.members | typeof schema.categories | typeof schema.tasks | typeof schema.completions | typeof schema.signals | typeof schema.vacations) =>
    (await db.select().from(table).where(and(eq(table.householdId, householdId), isNull(table.deletedAt))))
      .map(row => toWire(row) as T)
  const [household] = await db.select().from(schema.households)
    .where(and(eq(schema.households.id, householdId), isNull(schema.households.deletedAt)))
  if (!household) {
    return null
  }
  return {
    household: toWire(household) as unknown as HouseholdRow,
    members: await load<MemberRow>(schema.members),
    categories: await load<CategoryRow>(schema.categories),
    tasks: (await load<TaskRow>(schema.tasks)).map(toDomainTask).filter((task): task is Task => task !== null),
    completions: await load<CompletionRow>(schema.completions),
    signals: await load<SignalRow>(schema.signals),
    vacations: await load<VacationRow>(schema.vacations),
  }
}

/** A notification to send, before deduplication: one key per announced fact. */
interface Plan {
  memberId: string
  kind: NotificationKind
  items: { dedupeKey: string, alert?: SignalAlert }[]
  message?: NotificationMessage
}

/** Manual signals of the tasks this member owns, raised by the other one and still open. */
function openSignalAlerts(state: HouseholdState, memberId: string, now: Date): { signal: SignalRow, alert: SignalAlert }[] {
  const effectiveCompletionIds = new Set(state.completions.filter(c => c.undoneAt === null).map(c => c.id))
  const owners = new Map(state.categories.map(category => [category.id, category.ownerMemberId]))
  const names = new Map(state.members.map(member => [member.id, member.displayName]))
  const tasks = new Map(state.tasks.map(task => [task.id, task]))
  const oldest = now.getTime() - SIGNAL_NOTIFICATION_MAX_AGE_HOURS * 3600_000

  return state.signals.flatMap((signal) => {
    const task = tasks.get(signal.taskId)
    const isOpen = signal.resolvedByCompletionId === null || !effectiveCompletionIds.has(signal.resolvedByCompletionId)
    if (!task || task.type !== 'signal' || !task.active || !isOpen || signal.isAutomatic || !signal.raisedBy
      || signal.raisedBy === memberId || owners.get(task.categoryId) !== memberId || Date.parse(signal.raisedAt) < oldest) {
      return []
    }
    return [{ signal, alert: { label: task.signalLabel, taskName: task.name, raisedByName: names.get(signal.raisedBy) ?? 'L\'autre joueur' } }]
  })
}

function planHousehold(state: HouseholdState, recipients: ReadonlySet<string>, options: { now: Date, scheduled: boolean }): Plan[] {
  const timeZone = state.household.timezone
  const today = toLocalDate(options.now, timeZone)
  const time = toLocalTime(options.now, timeZone)
  if (isOnVacation(today, state.vacations)) {
    return []
  }
  const progress = buildTaskProgress({ tasks: state.tasks, completions: state.completions, signals: state.signals, today, timeZone })
  const plans: Plan[] = []

  for (const member of state.members.filter(m => recipients.has(m.id))) {
    const prefs = member.notificationPrefs
    const windows = options.scheduled ? openScheduledWindows(prefs, time) : []
    if (windows.length) {
      const { pending } = generateDailyQuests({
        memberId: member.id,
        tasks: state.tasks,
        categories: state.categories,
        progress,
        today,
        vacations: state.vacations,
        budgetMin: member.dailyBudgetMin,
      })
      for (const kind of windows) {
        const message = kind === 'morning' ? morningMessage(pending) : eveningMessage(pending)
        if (message) {
          plans.push({ memberId: member.id, kind, items: [{ dedupeKey: `${kind}:${member.id}:${today}` }], message })
        }
      }
    }
    if (prefs.alerts && !isQuietTime(time)) {
      const alerts = openSignalAlerts(state, member.id, options.now)
      if (alerts.length) {
        plans.push({ memberId: member.id, kind: 'signal', items: alerts.map(({ signal, alert }) => ({ dedupeKey: `signal:${member.id}:${signal.id}`, alert })) })
      }
    }
  }
  return plans
}

/**
 * Claims the notifications to send under the household lock, so that concurrent or duplicated
 * ticks can neither send twice nor exceed the daily cap. Claimed before sending: a push service
 * failure loses one notification rather than risking a duplicate.
 */
async function claim(db: Database, householdId: string, plans: readonly Plan[], now: Date, timeZone: string) {
  const today = toLocalDate(now, timeZone)
  return db.transaction(async (tx) => {
    await lockHousehold(tx, householdId)
    const log = schema.notificationLog
    const known = new Set((await tx.select({ key: log.dedupeKey }).from(log)
      .where(inArray(log.dedupeKey, plans.flatMap(plan => plan.items.map(item => item.dedupeKey)))))
      .map(row => row.key))
    const sentToday = new Map((await tx.select({ memberId: log.memberId, count: countDistinct(log.notificationId) }).from(log)
      .where(and(eq(log.householdId, householdId), eq(log.localDate, today)))
      .groupBy(log.memberId))
      .map(row => [row.memberId, row.count]))

    const claimed: { memberId: string, kind: NotificationKind, message: NotificationMessage }[] = []
    for (const plan of plans) {
      const items = plan.items.filter(item => !known.has(item.dedupeKey))
      const count = sentToday.get(plan.memberId) ?? 0
      const message = plan.message ?? signalMessage(items.flatMap(item => item.alert ? [item.alert] : []))
      if (!items.length || !message || count >= MAX_NOTIFICATIONS_PER_DAY) {
        continue
      }
      const notificationId = crypto.randomUUID()
      await tx.insert(log).values(items.map(item => ({
        notificationId,
        householdId,
        memberId: plan.memberId,
        kind: plan.kind,
        localDate: today,
        dedupeKey: item.dedupeKey,
        sentAt: now,
      })))
      sentToday.set(plan.memberId, count + 1)
      claimed.push({ memberId: plan.memberId, kind: plan.kind, message })
    }
    return claimed
  })
}

async function notifyHousehold(db: Database, householdId: string, options: { now: Date, sender: PushSender, scheduled: boolean }): Promise<number> {
  const subscriptions = await subscriptionsOf(db, householdId)
  if (!subscriptions.size) {
    return 0
  }
  const state = await loadHouseholdState(db, householdId)
  if (!state) {
    return 0
  }
  const plans = planHousehold(state, new Set(subscriptions.keys()), options)
  if (!plans.length) {
    return 0
  }
  let sent = 0
  for (const { memberId, kind, message } of await claim(db, householdId, plans, options.now, state.household.timezone)) {
    sent += await sendToMember(db, options.sender, subscriptions.get(memberId) ?? [], message, PUSH_OPTIONS[kind])
  }
  return sent
}

/** Called after a sync push: announces the signals just raised, without waiting for the next tick. */
export function notifySignals(db: Database, input: { householdId: string, now: Date, sender: PushSender }): Promise<number> {
  return notifyHousehold(db, input.householdId, { ...input, scheduled: false })
}

/**
 * Scheduled pass (cron, every 15 min): morning quests, evening reminder, and the alerts
 * deferred by the quiet hours. Idempotent: calling it twice sends nothing more.
 */
export async function runNotificationTick(db: Database, input: { now: Date, sender: PushSender }): Promise<{ households: number, sent: number }> {
  const households = await db.selectDistinct({ id: schema.pushSubscriptions.householdId }).from(schema.pushSubscriptions)
  let sent = 0
  for (const { id } of households) {
    try {
      sent += await notifyHousehold(db, id, { ...input, scheduled: true })
    }
    catch (error) {
      // One broken household must not deprive the others of their notifications.
      console.error(`[notifications] household ${id}:`, error)
    }
  }
  return { households: households.length, sent }
}
