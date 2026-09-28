import { parseLocalDate, type Category, type Completion, type LocalDate, type PeriodicTask, type QuotaTask, type Signal, type SignalTask } from '#shared/domain'

export const TZ = 'Europe/Paris'

export const d = (value: string): LocalDate => parseLocalDate(value)

/** Noon in Paris, far from any day boundary. */
export const at = (date: string): string => `${date}T10:00:00Z`

export const ME = 'member-me'
export const PARTNER = 'member-partner'

export const categories: Category[] = [
  { id: 'cat-me', ownerMemberId: ME },
  { id: 'cat-partner', ownerMemberId: PARTNER },
]

const base = { categoryId: 'cat-me', size: 'M', durationMin: 10, active: true, snoozedUntil: null, baselineOn: null } as const

export const periodic = (overrides: Partial<PeriodicTask> = {}): PeriodicTask =>
  ({ ...base, id: 'periodic', name: 'Periodic', type: 'periodic', intervalDays: 7, ...overrides })

export const quota = (overrides: Partial<QuotaTask> = {}): QuotaTask =>
  ({ ...base, id: 'quota', name: 'Quota', type: 'quota', weeklyQuota: 4, ...overrides })

export const signalTask = (overrides: Partial<SignalTask> = {}): SignalTask =>
  ({ ...base, id: 'signal', name: 'Signal', type: 'signal', signalLabel: 'C\'est plein', maxDelayDays: null, ...overrides })

let sequence = 0

export const completion = (overrides: Partial<Completion> = {}): Completion =>
  ({ id: `completion-${++sequence}`, taskId: 'periodic', memberId: ME, completedAt: at('2026-09-24'), xp: 15, coins: 15, undoneAt: null, ...overrides })

export const signal = (overrides: Partial<Signal> = {}): Signal =>
  ({ id: `signal-${++sequence}`, taskId: 'signal', raisedAt: at('2026-09-24'), resolvedByCompletionId: null, ...overrides })
