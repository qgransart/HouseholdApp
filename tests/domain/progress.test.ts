import { describe, expect, it } from 'vitest'
import { buildTaskProgress } from '#shared/domain'
import { at, completion, d, ME, PARTNER, periodic, signal, signalTask, TZ } from './factories'

const today = d('2026-09-24')
const tasks = [periodic(), signalTask()]
const build = (input: Partial<Parameters<typeof buildTaskProgress>[0]>) =>
  buildTaskProgress({ tasks, completions: [], signals: [], today, timeZone: TZ, ...input })

describe('buildTaskProgress', () => {
  it('starts empty for a task never done', () => {
    expect(build({}).get('periodic')).toEqual({
      lastCompletedOn: null,
      completionsThisWeek: 0,
      completedTodayBy: new Set(),
      hasOpenSignal: false,
    })
  })

  it('keeps the most recent completion, whatever the input order', () => {
    const progress = build({ completions: [completion({ completedAt: at('2026-09-22') }), completion({ completedAt: at('2026-09-10') })] })
    expect(progress.get('periodic')?.lastCompletedOn).toBe('2026-09-22')
  })

  it('ignores undone completions', () => {
    const progress = build({ completions: [completion({ completedAt: at('2026-09-22'), undoneAt: at('2026-09-22') })] })
    expect(progress.get('periodic')?.lastCompletedOn).toBeNull()
  })

  it('counts completions of the current Monday → Sunday week only', () => {
    const completions = ['2026-09-20', '2026-09-21', '2026-09-23'].map(date => completion({ completedAt: at(date) }))
    expect(build({ completions }).get('periodic')?.completionsThisWeek).toBe(2)
  })

  it('tracks who completed the task today, in the household time zone', () => {
    const completions = [
      completion({ memberId: PARTNER, completedAt: '2026-09-23T22:30:00Z' }), // 00:30 in Paris
      completion({ memberId: ME, completedAt: '2026-09-23T21:30:00Z' }), // 23:30 the day before
    ]
    expect(build({ completions }).get('periodic')?.completedTodayBy).toEqual(new Set([PARTNER]))
  })

  it('ignores events of unknown tasks', () => {
    expect(() => build({ completions: [completion({ taskId: 'deleted' })], signals: [signal({ taskId: 'deleted' })] })).not.toThrow()
  })

  describe('signals', () => {
    it('is open while unresolved', () => {
      expect(build({ signals: [signal()] }).get('signal')?.hasOpenSignal).toBe(true)
    })

    it('is closed once resolved by a completion', () => {
      const done = completion({ taskId: 'signal' })
      expect(build({ completions: [done], signals: [signal({ resolvedByCompletionId: done.id })] }).get('signal')?.hasOpenSignal).toBe(false)
    })

    it('reopens when the resolving completion is undone', () => {
      const undone = completion({ taskId: 'signal', undoneAt: at('2026-09-24') })
      expect(build({ completions: [undone], signals: [signal({ resolvedByCompletionId: undone.id })] }).get('signal')?.hasOpenSignal).toBe(true)
    })
  })
})
