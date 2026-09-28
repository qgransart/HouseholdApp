import { minutesOfDay, type LocalTime } from './calendar'
import { QUIET_HOURS, SCHEDULED_NOTIFICATION_WINDOW_MINUTES } from './config'
import type { Quest } from './quests'

/**
 * Notification rules (CONCEPT §11): when a notification may be sent and what it says.
 * The server decides who receives what; these functions only depend on their arguments.
 */

export type ScheduledNotificationKind = 'morning' | 'evening'
export type NotificationKind = ScheduledNotificationKind | 'signal'

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
export function openScheduledWindows(prefs: ScheduledPrefs, time: LocalTime): ScheduledNotificationKind[] {
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
