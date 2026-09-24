import { endOfWeek, isWithin, startOfWeek, toLocalDate, type LocalDate } from './calendar'
import type { Completion, Signal, Task } from './types'

/** Per-task facts derived from the event log, consumed by every other rule. */
export interface TaskProgress {
  lastCompletedOn: LocalDate | null
  completionsThisWeek: number
  /** Members who completed the task today. */
  completedTodayBy: ReadonlySet<string>
  /** A member signalled the task and no valid completion resolved it yet. */
  hasOpenSignal: boolean
}

type MutableTaskProgress = Omit<TaskProgress, 'completedTodayBy'> & { completedTodayBy: Set<string> }

export interface TaskProgressInput {
  tasks: readonly Task[]
  completions: readonly Completion[]
  signals: readonly Signal[]
  today: LocalDate
  timeZone: string
}

export function isEffective(completion: Completion): boolean {
  return completion.undoneAt === null
}

export function buildTaskProgress({ tasks, completions, signals, today, timeZone }: TaskProgressInput): Map<string, TaskProgress> {
  const weekStart = startOfWeek(today)
  const weekEnd = endOfWeek(today)

  const progress = new Map<string, MutableTaskProgress>(
    tasks.map(task => [task.id, { lastCompletedOn: null, completionsThisWeek: 0, completedTodayBy: new Set(), hasOpenSignal: false }]),
  )

  const effectiveCompletionIds = new Set<string>()
  for (const completion of completions) {
    if (!isEffective(completion)) {
      continue
    }
    effectiveCompletionIds.add(completion.id)
    const entry = progress.get(completion.taskId)
    if (!entry) {
      continue
    }
    const completedOn = toLocalDate(completion.completedAt, timeZone)
    if (!entry.lastCompletedOn || completedOn > entry.lastCompletedOn) {
      entry.lastCompletedOn = completedOn
    }
    if (isWithin(completedOn, weekStart, weekEnd)) {
      entry.completionsThisWeek++
    }
    if (completedOn === today) {
      entry.completedTodayBy.add(completion.memberId)
    }
  }

  for (const signal of signals) {
    const entry = progress.get(signal.taskId)
    // A signal resolved by a completion that was later undone is open again.
    const resolved = signal.resolvedByCompletionId !== null && effectiveCompletionIds.has(signal.resolvedByCompletionId)
    if (entry && !resolved) {
      entry.hasOpenSignal = true
    }
  }

  return progress
}
