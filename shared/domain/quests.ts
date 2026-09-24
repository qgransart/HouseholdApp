import { QUEST_URGENCY_THRESHOLD, QUICK_TASK_MAX_MINUTES } from './config'
import type { LocalDate } from './calendar'
import type { TaskProgress } from './progress'
import type { Category, Task, Vacation } from './types'
import { computeUrgency, type Urgency } from './urgency'
import { isOnVacation } from './vacation'

export interface Quest {
  task: Task
  urgency: Urgency
  /** The task belongs to a category owned by the other member. */
  isHelp: boolean
}

export interface QuestContext {
  memberId: string
  tasks: readonly Task[]
  categories: readonly Category[]
  progress: ReadonlyMap<string, TaskProgress>
  today: LocalDate
  vacations: readonly Vacation[]
}

export interface DailyQuests {
  /** Tasks this member already completed today; they consume the budget. */
  done: Quest[]
  pending: Quest[]
}

/**
 * Daily quests of a member (CONCEPT §7), recomputed on the fly from the current state.
 * Completed tasks stay in the list and consume the budget, so that finishing a quest does
 * not endlessly pull a new one in.
 */
export function generateDailyQuests(context: QuestContext & { budgetMin: number }): DailyQuests {
  if (isOnVacation(context.today, context.vacations)) {
    return { done: [], pending: [] }
  }
  const owners = ownerByCategory(context.categories)
  const done: Quest[] = []
  const candidates: Quest[] = []

  for (const task of context.tasks) {
    const progress = context.progress.get(task.id)
    if (!progress) {
      continue
    }
    const isOwn = owners.get(task.categoryId) === context.memberId
    if (progress.completedTodayBy.has(context.memberId)) {
      done.push({ task, urgency: computeUrgency(task, progress, context.today, context.vacations), isHelp: !isOwn })
      continue
    }
    if (!isOwn || !isAvailable(task, context.today)) {
      continue
    }
    const urgency = computeUrgency(task, progress, context.today, context.vacations)
    if (isWorthDoing(urgency)) {
      candidates.push({ task, urgency, isHelp: false })
    }
  }

  let remainingBudget = context.budgetMin - done.reduce((sum, quest) => sum + quest.task.durationMin, 0)
  const pending: Quest[] = []
  for (const quest of candidates.sort(compareQuests)) {
    const isSignal = quest.urgency.triggeredBySignal
    // The most urgent task is always offered, even if longer than the budget: otherwise
    // a big task (oven, windows) could never be scheduled.
    const isFirstRegular = !isSignal && !pending.some(p => !p.urgency.triggeredBySignal)
    const fits = quest.task.durationMin <= remainingBudget
    if (isSignal || fits || (isFirstRegular && remainingBudget > 0)) {
      pending.push(quest)
      if (!isSignal) {
        remainingBudget -= quest.task.durationMin
      }
    }
  }

  return { done, pending }
}

/**
 * "J'ai 10 min": short tasks worth doing, from every category, most urgent first.
 * A task of the other member's categories is flagged as help.
 */
export function suggestQuickTasks(context: QuestContext & { maxMinutes?: number }): Quest[] {
  if (isOnVacation(context.today, context.vacations)) {
    return []
  }
  const maxMinutes = context.maxMinutes ?? QUICK_TASK_MAX_MINUTES
  const owners = ownerByCategory(context.categories)
  const suggestions: Quest[] = []

  for (const task of context.tasks) {
    const progress = context.progress.get(task.id)
    if (!progress || !isAvailable(task, context.today) || task.durationMin > maxMinutes) {
      continue
    }
    const urgency = computeUrgency(task, progress, context.today, context.vacations)
    if (isWorthDoing(urgency)) {
      suggestions.push({ task, urgency, isHelp: owners.get(task.categoryId) !== context.memberId })
    }
  }

  return suggestions.sort(compareQuests)
}

function ownerByCategory(categories: readonly Category[]): Map<string, string> {
  return new Map(categories.map(category => [category.id, category.ownerMemberId]))
}

function isAvailable(task: Task, today: LocalDate): boolean {
  return task.active && (task.snoozedUntil === null || task.snoozedUntil < today)
}

function isWorthDoing(urgency: Urgency): boolean {
  return urgency.triggeredBySignal || urgency.score >= QUEST_URGENCY_THRESHOLD
}

/** Signals first, then most urgent, then shortest; the id makes the order deterministic. */
function compareQuests(a: Quest, b: Quest): number {
  return Number(b.urgency.triggeredBySignal) - Number(a.urgency.triggeredBySignal)
    || b.urgency.score - a.urgency.score
    || a.task.durationMin - b.task.durationMin
    || a.task.id.localeCompare(b.task.id)
}
