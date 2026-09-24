import { describe, expect, it } from 'vitest'
import { buildTaskProgress, generateDailyQuests, suggestQuickTasks, type Completion, type Quest, type Task, type Vacation } from '#shared/domain'
import { at, categories, completion, d, ME, periodic, signal, signalTask, TZ } from './factories'

const today = d('2026-09-24')

const tasks: Task[] = [
  periodic({ id: 'late', durationMin: 15 }),
  periodic({ id: 'soon', durationMin: 10 }),
  periodic({ id: 'fresh', durationMin: 5 }),
  periodic({ id: 'partner', categoryId: 'cat-partner', durationMin: 5 }),
  signalTask({ id: 'signal', durationMin: 5 }),
]

const history: Completion[] = [
  completion({ taskId: 'late', completedAt: at('2026-09-10') }),
  completion({ taskId: 'soon', completedAt: at('2026-09-20') }),
  completion({ taskId: 'fresh', completedAt: at('2026-09-23') }),
]

function context(options: { tasks?: Task[], completions?: Completion[], withSignal?: boolean, vacations?: Vacation[] } = {}) {
  const allTasks = options.tasks ?? tasks
  const progress = buildTaskProgress({
    tasks: allTasks,
    completions: options.completions ?? history,
    signals: options.withSignal === false ? [] : [signal({ taskId: 'signal' })],
    today,
    timeZone: TZ,
  })
  return { memberId: ME, tasks: allTasks, categories, progress, today, vacations: options.vacations ?? [] }
}

const ids = (quests: Quest[]) => quests.map(quest => quest.task.id)

describe('generateDailyQuests', () => {
  it('offers own tasks worth doing: signals first, then by urgency', () => {
    expect(ids(generateDailyQuests({ ...context(), budgetMin: 35 }).pending)).toEqual(['signal', 'late', 'soon'])
  })

  it('stops at the daily budget, signals not counted', () => {
    expect(ids(generateDailyQuests({ ...context(), budgetMin: 20 }).pending)).toEqual(['signal', 'late'])
  })

  it('always offers the most urgent task, even longer than the budget', () => {
    const oven = periodic({ id: 'oven', durationMin: 60, intervalDays: 60 })
    const ovenDone = completion({ taskId: 'oven', completedAt: at('2026-03-28') }) // urgency ≈ 3, above "late" (2)
    const quests = generateDailyQuests({ ...context({ tasks: [...tasks, oven], completions: [...history, ovenDone], withSignal: false }), budgetMin: 35 })
    expect(ids(quests.pending)).toEqual(['oven'])
  })

  it('counts tasks already done today against the budget and lists them as done', () => {
    const doneToday = completion({ taskId: 'partner', completedAt: at('2026-09-24') })
    const quests = generateDailyQuests({
      ...context({ tasks: [...tasks, periodic({ id: 'long-done', durationMin: 30 })], completions: [...history, doneToday, completion({ taskId: 'long-done' })] }),
      budgetMin: 35,
    })
    expect(ids(quests.done)).toEqual(['partner', 'long-done'])
    expect(quests.done[0]?.isHelp).toBe(true)
    expect(ids(quests.pending)).toEqual(['signal'])
  })

  it('skips inactive tasks and tasks snoozed until today included', () => {
    const quests = generateDailyQuests({
      ...context({
        tasks: [
          periodic({ id: 'late', durationMin: 15, snoozedUntil: today }),
          periodic({ id: 'soon', durationMin: 10, active: false }),
          periodic({ id: 'snooze-over', snoozedUntil: d('2026-09-23') }),
        ],
        withSignal: false,
      }),
      budgetMin: 35,
    })
    expect(ids(quests.pending)).toEqual(['snooze-over'])
  })

  it('offers nothing on vacation', () => {
    const quests = generateDailyQuests({ ...context({ vacations: [{ startsOn: today, endsOn: today }] }), budgetMin: 35 })
    expect(quests).toEqual({ done: [], pending: [] })
  })
})

describe('suggestQuickTasks', () => {
  it('suggests short tasks worth doing from every category, flagging help', () => {
    const suggestions = suggestQuickTasks(context())
    expect(ids(suggestions)).toEqual(['signal', 'partner', 'soon'])
    expect(suggestions.find(quest => quest.task.id === 'partner')?.isHelp).toBe(true)
    expect(suggestions.find(quest => quest.task.id === 'soon')?.isHelp).toBe(false)
  })

  it('honours a custom duration limit', () => {
    expect(ids(suggestQuickTasks({ ...context(), maxMinutes: 5 }))).toEqual(['signal', 'partner'])
  })
})
