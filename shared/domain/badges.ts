import { diffInDays, toLocalDate, type LocalDate } from './calendar'
import type { Completion, TaskSize } from './types'

export interface BadgeStats {
  /** Effective completions of the member. */
  completions: readonly (Completion & { isHelp: boolean })[]
  taskInfo: ReadonlyMap<string, { size: TaskSize, roomIcon: string }>
  thanksReceived: number
  purchases: number
  chestsOpened: number
  streak: number
  level: number
  timeZone: string
}

export interface Badge {
  id: string
  name: string
  hint: string
}

interface BadgeDefinition extends Badge {
  earned: (stats: BadgeStats) => boolean
}

const localMinutes = (iso: string, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  return Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value)
}

/** Longest run of consecutive days with at least one completion. */
function longestDailyRun(dates: LocalDate[]): number {
  const sorted = [...new Set(dates)].sort()
  let best = 0
  let run = 0
  sorted.forEach((date, i) => {
    run = i > 0 && diffInDays(sorted[i - 1]!, date) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

const DEFINITIONS: readonly BadgeDefinition[] = [
  { id: 'first', name: 'Première quête', hint: 'Valider une quête', earned: s => s.completions.length >= 1 },
  { id: 'early', name: 'Lève-tôt', hint: 'Une quête avant 8 h', earned: s => s.completions.some(c => localMinutes(c.completedAt, s.timeZone) < 8 * 60) },
  { id: 'helper', name: 'Bon coéquipier', hint: '10 coups de main', earned: s => s.completions.filter(c => c.isHelp).length >= 10 },
  { id: 'big-clean', name: 'Grand ménage', hint: 'Une quête ★★★★', earned: s => s.completions.some(c => s.taskInfo.get(c.taskId)?.size === 'XL') },
  { id: 'perfect-week', name: 'Semaine parfaite', hint: 'Ouvrir un coffre', earned: s => s.chestsOpened >= 1 },
  { id: 'streak-4', name: 'Régularité', hint: '4 semaines de série', earned: s => s.streak >= 4 },
  { id: 'laundry', name: 'Maître du linge', hint: '20 quêtes de linge', earned: s => s.completions.filter(c => s.taskInfo.get(c.taskId)?.roomIcon === 'laundry').length >= 20 },
  { id: 'daily-7', name: 'Sept jours d\'affilée', hint: 'Une quête par jour pendant 7 jours', earned: s => longestDailyRun(s.completions.map(c => toLocalDate(c.completedAt, s.timeZone))) >= 7 },
  { id: 'loved', name: 'Adoré', hint: '10 mercis reçus', earned: s => s.thanksReceived >= 10 },
  { id: 'level-10', name: 'Belle maison', hint: 'Maison niveau 10', earned: s => s.level >= 10 },
  { id: 'shopper', name: 'Plaisir mérité', hint: 'Acheter une récompense', earned: s => s.purchases >= 1 },
  { id: 'streak-8', name: 'Inarrêtables', hint: '8 semaines de série', earned: s => s.streak >= 8 },
]

export const BADGES: readonly Badge[] = DEFINITIONS.map(({ id, name, hint }) => ({ id, name, hint }))

export function earnedBadgeIds(stats: BadgeStats): Set<string> {
  return new Set(DEFINITIONS.filter(badge => badge.earned(stats)).map(badge => badge.id))
}
