import { isoDayOfWeek, minutesOfDay, type LocalDate, type LocalTime } from './calendar'
import { QUIET_HOURS, RECAP_TIME, SCHEDULED_NOTIFICATION_WINDOW_MINUTES } from './config'
import type { Quest } from './quests'
import { formatMinutes, type MemberWeek } from './recap'

/**
 * Notification rules (CONCEPT §11): when a notification may be sent and what it says.
 * The server decides who receives what; these functions only depend on their arguments.
 */

export type ScheduledNotificationKind = 'morning' | 'evening' | 'recap'
/** Instant notifications follow an action of the other member. */
export type InstantNotificationKind = 'signal' | 'claim' | 'trade'
export type NotificationKind = ScheduledNotificationKind | InstantNotificationKind

/** Payload read by the service worker. */
export interface NotificationMessage {
  title: string
  body: string
  /** Notifications with the same tag replace each other on the device. */
  tag: string
  /** Page opened when the notification is tapped. */
  url: string
}

export interface ScheduledPrefs {
  morning: boolean
  morningTime: LocalTime
  evening: boolean
  eveningTime: LocalTime
  /** Sunday recap; missing on preferences saved before it existed, which means on. */
  recap?: boolean
}

export function isQuietTime(time: LocalTime): boolean {
  const minutes = minutesOfDay(time)
  return minutes >= minutesOfDay(QUIET_HOURS.start) || minutes < minutesOfDay(QUIET_HOURS.end)
}

/**
 * Scheduled notifications whose sending window is open at this local time. The time chosen by
 * the member wins over the quiet hours (a 7:30 morning is a choice), but a window never runs
 * into them: a late evening tick stays silent.
 */
export function openScheduledWindows(prefs: ScheduledPrefs, time: LocalTime, date: LocalDate): ScheduledNotificationKind[] {
  const now = minutesOfDay(time)
  const isOpen = (start: LocalTime) => {
    const from = minutesOfDay(start)
    const to = Math.min(from + SCHEDULED_NOTIFICATION_WINDOW_MINUTES, minutesOfDay(QUIET_HOURS.start))
    return now >= from && now < to
  }
  const kinds: ScheduledNotificationKind[] = []
  if (prefs.morning && isOpen(prefs.morningTime)) {
    kinds.push('morning')
  }
  if (prefs.evening && isOpen(prefs.eveningTime)) {
    kinds.push('evening')
  }
  if (prefs.recap !== false && isoDayOfWeek(date) === 7 && isOpen(RECAP_TIME)) {
    kinds.push('recap')
  }
  return kinds
}

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`

function listNames(names: readonly string[], shown = 2): string {
  const visible = names.slice(0, shown)
  const rest = names.length - visible.length
  if (rest > 0) {
    return `${visible.join(', ')} et ${plural(rest, 'autre')}`
  }
  return visible.length > 1 ? `${visible.slice(0, -1).join(', ')} et ${visible.at(-1)}` : visible[0] ?? ''
}

/** `null` when there is nothing to announce: no quest, no notification. */
export function morningMessage(quests: readonly Quest[]): NotificationMessage | null {
  if (!quests.length) {
    return null
  }
  const minutes = quests.reduce((sum, quest) => sum + quest.task.durationMin, 0)
  const alert = quests.find(quest => quest.urgency.triggeredBySignal && quest.task.type === 'signal')
  const lead = alert?.task.type === 'signal' ? `🔔 ${alert.task.signalLabel} · ` : ''
  return {
    title: `${plural(quests.length, 'quête')} aujourd'hui ☀️`,
    body: `${lead}${listNames(quests.map(quest => quest.task.name))}, environ ${minutes} min. On s'y met ?`,
    tag: 'quests',
    url: '/',
  }
}

/** Only sent when quests are left (CONCEPT §11). */
export function eveningMessage(quests: readonly Quest[]): NotificationMessage | null {
  if (!quests.length) {
    return null
  }
  const names = listNames(quests.map(quest => quest.task.name))
  return {
    title: `Encore ${plural(quests.length, 'quête')} ce soir 🌙`,
    body: `${names} ${quests.length > 1 ? 't\'attendent' : 't\'attend'}. Un dernier effort et le coffre se rapproche !`,
    tag: 'quests',
    url: '/',
  }
}

export interface SignalAlert {
  label: string
  taskName: string
  raisedByName: string
}

/** Close signals are grouped in one notification (CONCEPT §11). */
export function signalMessage(alerts: readonly SignalAlert[]): NotificationMessage | null {
  const [first] = alerts
  if (!first) {
    return null
  }
  if (alerts.length === 1) {
    return { title: `🔔 ${first.label}`, body: `${first.raisedByName} a signalé : ${first.taskName}.`, tag: 'signals', url: '/' }
  }
  return {
    title: `🔔 ${plural(alerts.length, 'alerte')}`,
    body: `${listNames(alerts.map(alert => alert.label), 3)}. Une quête prioritaire t'attend.`,
    tag: 'signals',
    url: '/',
  }
}

/** The other member's week, to thank them. Nothing when they did nothing: never a reproach. */
export function recapMessage(partnerName: string, week: MemberWeek): NotificationMessage | null {
  if (!week.count) {
    return null
  }
  const top = week.highlights[0]
  return {
    title: 'Notre semaine 💞',
    body: `${partnerName} a fait ${plural(week.count, 'quête')} cette semaine (${formatMinutes(week.minutes)})${top ? `, dont ${top.task.name}` : ''}. Un merci ?`,
    tag: 'recap',
    url: '/recap',
  }
}

export interface ClaimAlert {
  memberName: string
  taskName: string
}

export function claimMessage(claims: readonly ClaimAlert[]): NotificationMessage | null {
  const [first] = claims
  if (!first) {
    return null
  }
  return {
    title: `🙌 ${first.memberName} s'en occupe`,
    body: `${listNames(claims.map(claim => claim.taskName), 3)}.`,
    tag: 'claims',
    url: '/',
  }
}

export interface TradeAlert {
  event: 'proposed' | 'accepted' | 'declined'
  memberName: string
  /** The deal from the recipient's point of view (see describeTrade). */
  summary: string
}

const TRADE_TITLES: Record<TradeAlert['event'], (name: string) => string> = {
  proposed: name => `🤝 ${name} te propose un échange`,
  accepted: name => `🤝 ${name} a accepté l'échange`,
  declined: name => `${name} ne peut pas cette fois`,
}

export function tradeMessage(alerts: readonly TradeAlert[]): NotificationMessage | null {
  const [first] = alerts
  if (!first) {
    return null
  }
  if (alerts.length === 1) {
    return { title: TRADE_TITLES[first.event](first.memberName), body: `${first.summary.charAt(0).toUpperCase()}${first.summary.slice(1)}.`, tag: 'trades', url: '/' }
  }
  return { title: `🤝 ${plural(alerts.length, 'nouvelle')} sur vos échanges`, body: 'Ouvre l\'app pour voir les propositions et les réponses.', tag: 'trades', url: '/' }
}
