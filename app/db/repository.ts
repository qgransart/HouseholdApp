import { v7 as uuidv7 } from 'uuid'
import { STANDARD_CATALOGUE, STANDARD_REWARDS, type CatalogueTask } from '#shared/catalogue'
import { baselineForPeriodicTask, type RoomState } from '#shared/domain/onboarding'
import { buildTaskProgress } from '#shared/domain/progress'
import { computeFreshness } from '#shared/domain/freshness'
import { computeReward } from '#shared/domain/points'
import { toLocalDate, type LocalDate } from '#shared/domain/calendar'
import { UNDO_WINDOW_MINUTES } from '#shared/domain/config'
import {
  DEFAULT_HOUSEHOLD_SETTINGS,
  DEFAULT_NOTIFICATION_PREFS,
  type CategoryRow,
  type CompletionRow,
  type HouseholdRow,
  type MemberRow,
  type PurchaseRow,
  type ReactionRow,
  type RewardRow,
  type SignalRow,
  type SyncedTableName,
  type SyncedTables,
  type TaskRow,
  type VacationRow,
} from '#shared/types/entities'
import { SYNCED_TABLES, type HouseholdDatabase } from './database'
import { notDeleted, writeRows, type Draft } from './write'
import { toDomainTask } from './mappers'

export const DEFAULT_TIMEZONE = 'Europe/Paris'
export const DEFAULT_DAILY_BUDGET_MIN = 35

/* ---------- Device settings ---------- */

export async function getMeta<Value>(db: HouseholdDatabase, key: string): Promise<Value | undefined> {
  return (await db.meta.get(key))?.value as Value | undefined
}

export async function setMeta(db: HouseholdDatabase, key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}

export const META_HOUSEHOLD_ID = 'householdId'
export const META_CURRENT_MEMBER_ID = 'currentMemberId'

/* ---------- Snapshot ---------- */

export interface HouseholdSnapshot {
  household: HouseholdRow
  members: MemberRow[]
  categories: CategoryRow[]
  tasks: TaskRow[]
  completions: CompletionRow[]
  signals: SignalRow[]
  rewards: RewardRow[]
  purchases: PurchaseRow[]
  reactions: ReactionRow[]
  vacations: VacationRow[]
}

/** The whole household fits in memory for years (a few thousand completions per year). */
export async function loadSnapshot(db: HouseholdDatabase, householdId: string): Promise<HouseholdSnapshot | null> {
  const household = await db.households.get(householdId)
  if (!household || household.deletedAt) {
    return null
  }
  const byHousehold = <Name extends SyncedTableName>(table: Name) =>
    db.table<SyncedTables[Name], string>(table).where('householdId').equals(householdId).filter(notDeleted).toArray()

  const [members, categories, tasks, completions, signals, rewards, purchases, reactions, vacations] = await Promise.all([
    byHousehold('members'),
    byHousehold('categories'),
    byHousehold('tasks'),
    byHousehold('completions'),
    byHousehold('signals'),
    byHousehold('rewards'),
    byHousehold('purchases'),
    byHousehold('reactions'),
    byHousehold('vacations'),
  ])
  categories.sort((a, b) => a.sortOrder - b.sortOrder)
  return { household, members, categories, tasks, completions, signals, rewards, purchases, reactions, vacations }
}

/* ---------- Onboarding ---------- */

export interface CreateHouseholdInput {
  name: string
  memberNames: [string, string]
  /** Google account of the person creating the household (the second joins by invitation). */
  firstMemberEmail?: string | null
  rooms: { key: string, ownerIndex: 0 | 1, state: RoomState }[]
  timezone?: string
  now: Date
}

export async function createHousehold(db: HouseholdDatabase, input: CreateHouseholdInput): Promise<{ householdId: string, memberIds: [string, string] }> {
  const timezone = input.timezone ?? DEFAULT_TIMEZONE
  const today = toLocalDate(input.now, timezone)
  const householdId = uuidv7()
  const memberIds: [string, string] = [uuidv7(), uuidv7()]

  const categories: Draft<CategoryRow>[] = []
  const tasks: Draft<TaskRow>[] = []

  STANDARD_CATALOGUE.forEach((room, index) => {
    const choice = input.rooms.find(r => r.key === room.key)
    if (!choice) {
      return
    }
    const categoryId = uuidv7()
    categories.push({ id: categoryId, householdId, name: room.name, icon: room.icon, ownerMemberId: memberIds[choice.ownerIndex], sortOrder: index })
    for (const task of room.tasks) {
      tasks.push(toTaskDraft(task, { householdId, categoryId, state: choice.state, today }))
    }
  })

  await db.transaction('rw', [...SYNCED_TABLES.map(table => db[table]), db.outbox, db.meta], async () => {
    await writeRows(db, 'households', [{ id: householdId, householdId, name: input.name.trim(), timezone, settings: { ...DEFAULT_HOUSEHOLD_SETTINGS } }], input.now)
    await writeRows(db, 'members', input.memberNames.map((displayName, i) => ({
      id: memberIds[i]!,
      householdId,
      displayName: displayName.trim(),
      email: i === 0 ? input.firstMemberEmail?.trim().toLowerCase() || null : null,
      dailyBudgetMin: DEFAULT_DAILY_BUDGET_MIN,
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
    })), input.now)
    await writeRows(db, 'categories', categories, input.now)
    await writeRows(db, 'tasks', tasks, input.now)
    await writeRows(db, 'rewards', STANDARD_REWARDS.map(reward => ({ id: uuidv7(), householdId, ...reward, active: true })), input.now)
    await setMeta(db, META_HOUSEHOLD_ID, householdId)
    await setMeta(db, META_CURRENT_MEMBER_ID, memberIds[0])
  })

  return { householdId, memberIds }
}

function toTaskDraft(task: CatalogueTask, context: { householdId: string, categoryId: string, state: RoomState, today: LocalDate }): Draft<TaskRow> {
  const base = {
    id: uuidv7(),
    householdId: context.householdId,
    categoryId: context.categoryId,
    name: task.name,
    type: task.type,
    size: task.size,
    durationMin: task.durationMin,
    intervalDays: null,
    weeklyQuota: null,
    maxDelayDays: null,
    signalLabel: null,
    active: !task.optional,
    snoozedUntil: null,
    baselineOn: null,
  }
  switch (task.type) {
    case 'periodic':
      return { ...base, intervalDays: task.intervalDays, baselineOn: baselineForPeriodicTask(task.intervalDays, context.state, context.today) }
    case 'quota':
      return { ...base, weeklyQuota: task.weeklyQuota }
    case 'signal':
      // Starting today gives the max delay a reference: the hygiene safety net works from day one.
      return { ...base, signalLabel: task.signalLabel, maxDelayDays: task.maxDelayDays, baselineOn: context.today }
  }
}

/* ---------- Game actions ---------- */

export class DomainError extends Error {}

export async function completeTask(db: HouseholdDatabase, input: { taskId: string, memberId: string, now: Date }): Promise<CompletionRow> {
  return db.transaction('rw', [db.households, db.categories, db.tasks, db.completions, db.signals, db.vacations, db.outbox], async () => {
    const taskRow = await db.tasks.get(input.taskId)
    const task = taskRow && notDeleted(taskRow) ? toDomainTask(taskRow) : null
    if (!taskRow || !task) {
      throw new DomainError(`Unknown task ${input.taskId}`)
    }
    const household = await db.households.get(taskRow.householdId)
    const category = await db.categories.get(taskRow.categoryId)
    if (!household) {
      throw new DomainError(`Unknown household ${taskRow.householdId}`)
    }

    const completions = (await db.completions.where('taskId').equals(task.id).toArray()).filter(notDeleted)
    const signals = (await db.signals.where('taskId').equals(task.id).toArray()).filter(notDeleted)
    const vacations = (await db.vacations.where('householdId').equals(household.id).toArray()).filter(notDeleted)
    const today = toLocalDate(input.now, household.timezone)

    const progress = buildTaskProgress({ tasks: [task], completions, signals, today, timeZone: household.timezone }).get(task.id)!
    const freshness = task.type === 'periodic' ? computeFreshness(task.intervalDays, progress.lastCompletedOn, today, vacations) : null
    const reward = computeReward(task, freshness?.status ?? null)

    const [completion] = await writeRows(db, 'completions', [{
      id: uuidv7(),
      householdId: household.id,
      taskId: task.id,
      memberId: input.memberId,
      completedAt: input.now.toISOString(),
      xp: reward.xp,
      coins: reward.coins,
      isHelp: category?.ownerMemberId !== input.memberId,
      undoneAt: null,
    }], input.now)

    const effectiveIds = new Set(completions.filter(c => c.undoneAt === null).map(c => c.id))
    const openSignals = signals.filter(s => s.resolvedByCompletionId === null || !effectiveIds.has(s.resolvedByCompletionId))
    if (openSignals.length) {
      await writeRows(db, 'signals', openSignals.map(s => ({ ...s, resolvedByCompletionId: completion!.id })), input.now)
    }
    return completion!
  })
}

export async function undoCompletion(db: HouseholdDatabase, input: { completionId: string, now: Date }): Promise<void> {
  await db.transaction('rw', [db.completions, db.outbox], async () => {
    const completion = await db.completions.get(input.completionId)
    if (!completion || !notDeleted(completion) || completion.undoneAt) {
      throw new DomainError('Cette validation n\'existe plus ou a déjà été annulée.')
    }
    const elapsedMs = input.now.getTime() - new Date(completion.completedAt).getTime()
    if (elapsedMs > UNDO_WINDOW_MINUTES * 60_000) {
      throw new DomainError(`Une validation ne peut être annulée que dans les ${UNDO_WINDOW_MINUTES} minutes.`)
    }
    // Signals resolved by this completion reopen by themselves (see buildTaskProgress).
    await writeRows(db, 'completions', [{ ...completion, undoneAt: input.now.toISOString() }], input.now)
  })
}

export async function raiseSignal(db: HouseholdDatabase, input: { taskId: string, memberId: string, now: Date }): Promise<SignalRow> {
  return db.transaction('rw', [db.tasks, db.completions, db.signals, db.outbox], async () => {
    const task = await db.tasks.get(input.taskId)
    if (!task || !notDeleted(task) || task.type !== 'signal') {
      throw new DomainError(`Task ${input.taskId} cannot be signalled`)
    }
    const signals = (await db.signals.where('taskId').equals(task.id).toArray()).filter(notDeleted)
    const effectiveIds = new Set((await db.completions.where('taskId').equals(task.id).toArray()).filter(c => notDeleted(c) && c.undoneAt === null).map(c => c.id))
    const alreadyOpen = signals.find(s => s.resolvedByCompletionId === null || !effectiveIds.has(s.resolvedByCompletionId))
    if (alreadyOpen) {
      return alreadyOpen
    }
    const [signal] = await writeRows(db, 'signals', [{
      id: uuidv7(),
      householdId: task.householdId,
      taskId: task.id,
      raisedBy: input.memberId,
      raisedAt: input.now.toISOString(),
      isAutomatic: false,
      resolvedByCompletionId: null,
    }], input.now)
    return signal!
  })
}

export async function withdrawSignal(db: HouseholdDatabase, input: { signalId: string, now: Date }): Promise<void> {
  await db.transaction('rw', [db.signals, db.outbox], async () => {
    const signal = await db.signals.get(input.signalId)
    if (signal && notDeleted(signal) && signal.resolvedByCompletionId === null) {
      await writeRows(db, 'signals', [{ ...signal, deletedAt: input.now.toISOString() }], input.now)
    }
  })
}
