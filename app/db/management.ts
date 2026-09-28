import { v7 as uuidv7 } from 'uuid'
import { addDays, type LocalDate } from '#shared/domain/calendar'
import type { TaskSize } from '#shared/domain/types'
import type { HouseholdSettings, NotificationPrefs } from '#shared/types/entities'
import type { HouseholdDatabase } from './database'
import { DomainError } from './repository'
import { notDeleted, updateRow, writeRows } from './write'

/* Household configuration: tasks, rooms, vacations, members, settings. */

export interface TaskChanges {
  intervalDays?: number
  weeklyQuota?: number
  size?: TaskSize
  durationMin?: number
  active?: boolean
}

const TASK_LIMITS = { intervalDays: [1, 365], weeklyQuota: [1, 21], durationMin: [1, 240] } as const

export async function updateTask(db: HouseholdDatabase, input: { taskId: string, changes: TaskChanges, now: Date }): Promise<void> {
  for (const [key, [min, max]] of Object.entries(TASK_LIMITS)) {
    const value = input.changes[key as keyof typeof TASK_LIMITS]
    if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) {
      throw new DomainError(`Valeur invalide pour ${key} : ${value}`)
    }
  }
  if (!await updateRow(db, 'tasks', input.taskId, input.changes, input.now)) {
    throw new DomainError('Cette tâche n\'existe plus.')
  }
}

/** Leaves the task out of quests for `days` days, today included. */
export async function snoozeTask(db: HouseholdDatabase, input: { taskId: string, days: number, today: LocalDate, now: Date }): Promise<LocalDate> {
  const snoozedUntil = addDays(input.today, input.days - 1)
  await updateRow(db, 'tasks', input.taskId, { snoozedUntil }, input.now)
  return snoozedUntil
}

export async function setCategoryOwner(db: HouseholdDatabase, input: { categoryId: string, memberId: string, now: Date }): Promise<void> {
  await updateRow(db, 'categories', input.categoryId, { ownerMemberId: input.memberId }, input.now)
}

const OPEN_END = '9999-12-31' as LocalDate

/**
 * Vacation mode: opens a vacation starting today, or closes the current one at yesterday.
 * A vacation opened and closed the same day is removed, as if it never existed.
 */
export async function setVacationMode(db: HouseholdDatabase, input: { householdId: string, on: boolean, today: LocalDate, now: Date }): Promise<void> {
  const vacations = (await db.vacations.where('householdId').equals(input.householdId).toArray()).filter(notDeleted)
  const current = vacations.find(v => v.startsOn <= input.today && v.endsOn >= input.today)
  if (input.on && !current) {
    await writeRows(db, 'vacations', [{ id: uuidv7(), householdId: input.householdId, startsOn: input.today, endsOn: OPEN_END }], input.now)
  }
  if (!input.on && current) {
    const endsOn = addDays(input.today, -1)
    await writeRows(db, 'vacations', [endsOn < current.startsOn
      ? { ...current, deletedAt: input.now.toISOString() }
      : { ...current, endsOn }], input.now)
  }
}

export async function updateMember(db: HouseholdDatabase, input: {
  memberId: string
  changes: { displayName?: string, dailyBudgetMin?: number, notificationPrefs?: NotificationPrefs, email?: string }
  now: Date
}): Promise<void> {
  const { dailyBudgetMin, displayName } = input.changes
  if (dailyBudgetMin !== undefined && (!Number.isInteger(dailyBudgetMin) || dailyBudgetMin < 5 || dailyBudgetMin > 240)) {
    throw new DomainError('Le temps quotidien doit être compris entre 5 et 240 minutes.')
  }
  if (displayName !== undefined && !displayName.trim()) {
    throw new DomainError('Le prénom ne peut pas être vide.')
  }
  const changes = { ...input.changes, ...(displayName !== undefined ? { displayName: displayName.trim() } : {}) }
  await updateRow(db, 'members', input.memberId, changes, input.now)
}

export async function updateHouseholdSettings(db: HouseholdDatabase, input: { householdId: string, settings: HouseholdSettings, now: Date }): Promise<void> {
  await updateRow(db, 'households', input.householdId, { settings: input.settings }, input.now)
}
