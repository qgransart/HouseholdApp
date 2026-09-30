import { addDays, isWithin, toLocalDate, type LocalDate } from './calendar'
import { isEffective } from './progress'
import type { Completion } from './types'

/* "Notre semaine" (CONCEPT §9 bis): what a member did, to recognise it, never to compare. */

export const RECAP_HIGHLIGHTS = 3

export interface RecapTask {
  name: string
  durationMin: number
}

export interface MemberWeek {
  memberId: string
  count: number
  minutes: number
  /** Biggest tasks of the week, longest first. */
  highlights: { completion: Completion, task: RecapTask }[]
}

export function computeMemberWeek(input: {
  memberId: string
  weekStart: LocalDate
  completions: readonly Completion[]
  tasks: ReadonlyMap<string, RecapTask>
  timeZone: string
}): MemberWeek {
  const weekEnd = addDays(input.weekStart, 6)
  const done = input.completions
    .filter(c => c.memberId === input.memberId && isEffective(c) && isWithin(toLocalDate(c.completedAt, input.timeZone), input.weekStart, weekEnd))
    .flatMap((completion) => {
      const task = input.tasks.get(completion.taskId)
      return task ? [{ completion, task }] : []
    })
  const highlights = [...done]
    .sort((a, b) => b.task.durationMin - a.task.durationMin || b.completion.completedAt.localeCompare(a.completion.completedAt))
    .slice(0, RECAP_HIGHLIGHTS)
  return {
    memberId: input.memberId,
    count: done.length,
    minutes: done.reduce((sum, item) => sum + item.task.durationMin, 0),
    highlights,
  }
}

/** `45 min`, `2 h`, `3 h 10`. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) {
    return `${rest} min`
  }
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`
}
