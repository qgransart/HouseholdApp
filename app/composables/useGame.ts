import { toDomainTask } from '~/db/mappers'
import { DEFAULT_TIMEZONE } from '~/db/repository'
import {
  addDays,
  buildTaskProgress,
  computeCoinBalance,
  computeFreshness,
  computeLevel,
  computeStreak,
  computeTotalXp,
  computeUrgency,
  computeWeeklyGauge,
  generateDailyQuests,
  isEffective,
  startOfWeek,
  suggestQuickTasks,
  toLocalDate,
  type Freshness,
  type Task,
  type WeekOutcome,
} from '#shared/domain'
import type { CategoryRow, CompletionRow, MemberRow, SignalRow } from '#shared/types/entities'

export type RoomCondition = 'clean' | 'average' | 'dirty'

export interface RoomView {
  category: CategoryRow
  owner: MemberRow | null
  /** 0 → 1: mean freshness of the active periodic tasks of the room. */
  health: number
  condition: RoomCondition
  triggeredSignals: number
}

export interface AlertView {
  task: Task
  roomName: string
  /** Open manual signal, if any (automatic triggers cannot be withdrawn). */
  openSignal: SignalRow | null
  triggered: boolean
}

const STREAK_HISTORY_WEEKS = 52

/** Every game projection, derived from the local event log by the pure domain (ARCHITECTURE §5.1). */
export const useGame = createSharedComposable(() => {
  const { snapshot, currentMember, partner } = useHousehold()
  const now = useClock()

  const timeZone = computed(() => snapshot.value?.household.timezone ?? DEFAULT_TIMEZONE)
  const today = computed(() => toLocalDate(now.value, timeZone.value))

  const tasks = computed(() => (snapshot.value?.tasks ?? []).map(toDomainTask).filter((task): task is Task => task !== null))
  const tasksById = computed(() => new Map(tasks.value.map(task => [task.id, task])))
  const categories = computed(() => snapshot.value?.categories ?? [])
  const categoriesById = computed(() => new Map(categories.value.map(category => [category.id, category])))
  const completions = computed(() => snapshot.value?.completions ?? [])
  const signals = computed(() => snapshot.value?.signals ?? [])
  const vacations = computed(() => snapshot.value?.vacations ?? [])

  const progress = computed(() => buildTaskProgress({
    tasks: tasks.value,
    completions: completions.value,
    signals: signals.value,
    today: today.value,
    timeZone: timeZone.value,
  }))

  const freshnessByTask = computed(() => {
    const map = new Map<string, Freshness>()
    for (const task of tasks.value) {
      if (task.type === 'periodic') {
        map.set(task.id, computeFreshness(task.intervalDays, progress.value.get(task.id)?.lastCompletedOn ?? null, today.value, vacations.value))
      }
    }
    return map
  })

  const questContext = computed(() => ({
    memberId: currentMember.value?.id ?? '',
    tasks: tasks.value,
    categories: categories.value,
    progress: progress.value,
    today: today.value,
    vacations: vacations.value,
  }))

  const pendingQuests = computed(() => currentMember.value
    ? generateDailyQuests({ ...questContext.value, budgetMin: currentMember.value.dailyBudgetMin }).pending
    : [])

  const quickTasks = computed(() => currentMember.value ? suggestQuickTasks(questContext.value) : [])

  /** Completions of the current member today, most recent first: the "done" list, with undo. */
  const completedToday = computed<CompletionRow[]>(() => completions.value
    .filter(c => isEffective(c) && c.memberId === currentMember.value?.id && toLocalDate(c.completedAt, timeZone.value) === today.value)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt)))

  const rooms = computed<RoomView[]>(() => categories.value.map((category) => {
    const roomTasks = tasks.value.filter(task => task.categoryId === category.id && task.active)
    const ratios = roomTasks.flatMap(task => freshnessByTask.value.has(task.id) ? [freshnessByTask.value.get(task.id)!.ratio] : [])
    const health = ratios.length ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length : 1
    const triggeredSignals = roomTasks.filter(task => task.type === 'signal'
      && computeUrgency(task, progress.value.get(task.id)!, today.value, vacations.value).triggeredBySignal).length
    return {
      category,
      owner: snapshot.value?.members.find(member => member.id === category.ownerMemberId) ?? null,
      health,
      condition: health > 0.5 ? 'clean' : health >= 0.25 ? 'average' : 'dirty',
      triggeredSignals,
    }
  }))

  const alerts = computed<AlertView[]>(() => {
    const effectiveIds = new Set(completions.value.filter(isEffective).map(c => c.id))
    return tasks.value
      .filter(task => task.type === 'signal' && task.active)
      .map((task) => {
        const openSignal = signals.value.find(s => s.taskId === task.id
          && (s.resolvedByCompletionId === null || !effectiveIds.has(s.resolvedByCompletionId))) ?? null
        return {
          task,
          roomName: categoriesById.value.get(task.categoryId)?.name ?? '',
          openSignal,
          triggered: computeUrgency(task, progress.value.get(task.id)!, today.value, vacations.value).triggeredBySignal,
        }
      })
  })

  const totalXp = computed(() => computeTotalXp(completions.value))
  const level = computed(() => computeLevel(totalXp.value))
  const coins = computed(() => currentMember.value
    ? computeCoinBalance(currentMember.value.id, completions.value, snapshot.value?.purchases ?? [])
    : 0)

  const weeklyGauge = computed(() => computeWeeklyGauge({
    date: today.value,
    tasks: tasks.value,
    completions: completions.value,
    vacations: vacations.value,
    timeZone: timeZone.value,
  }))

  const streak = computed(() => {
    const effective = completions.value.filter(isEffective)
    if (!effective.length) {
      return weeklyGauge.value.achieved ? 1 : 0
    }
    const firstWeek = startOfWeek(toLocalDate(effective.reduce((min, c) => c.completedAt < min ? c.completedAt : min, effective[0]!.completedAt), timeZone.value))
    const pastWeeks: WeekOutcome[] = []
    for (let week = addDays(startOfWeek(today.value), -7), count = 0; week >= firstWeek && count < STREAK_HISTORY_WEEKS; week = addDays(week, -7), count++) {
      pastWeeks.push(computeWeeklyGauge({ date: week, tasks: tasks.value, completions: effective, vacations: vacations.value, timeZone: timeZone.value }))
    }
    return computeStreak(pastWeeks, weeklyGauge.value.achieved)
  })

  return {
    today,
    timeZone,
    currentMember,
    partner,
    tasks,
    tasksById,
    categoriesById,
    progress,
    vacations,
    freshnessByTask,
    pendingQuests,
    quickTasks,
    completedToday,
    rooms,
    alerts,
    totalXp,
    level,
    coins,
    weeklyGauge,
    streak,
  }
})
