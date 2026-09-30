import { describe, expect, it } from 'vitest'
import {
  buildTaskProgress,
  claimMessage,
  claimsOn,
  computeCoinBalance,
  computeMemberWeek,
  describeTrade,
  formatMinutes,
  generateDailyQuests,
  openScheduledWindows,
  recapMessage,
  suggestQuickTasks,
  tradeCoinDelta,
  tradeMessage,
  tradeStatus,
  type Claim,
  type Completion,
  type Task,
  type Trade,
} from '#shared/domain'
import { at, categories, completion, d, ME, PARTNER, periodic, TZ } from './factories'

const today = d('2026-09-24')

const claim = (overrides: Partial<Claim> = {}): Claim => ({
  id: 'claim-1',
  taskId: 'mine',
  memberId: ME,
  claimedOn: today,
  releasedAt: null,
  createdAt: at('2026-09-24'),
  tradeId: null,
  ...overrides,
})

describe('claimsOn', () => {
  it('keeps the claims of the day that were not released', () => {
    const claims = [claim(), claim({ id: 'c2', taskId: 'other', claimedOn: d('2026-09-23') }), claim({ id: 'c3', taskId: 'released', releasedAt: at('2026-09-24') })]
    expect([...claimsOn(claims, today).keys()]).toEqual(['mine'])
  })

  it('settles an offline race in favour of the first claim', () => {
    const first = claim({ id: 'b', memberId: PARTNER, createdAt: '2026-09-24T08:00:00Z' })
    const second = claim({ id: 'a', memberId: ME, createdAt: '2026-09-24T09:00:00Z' })
    expect(claimsOn([second, first], today).get('mine')?.memberId).toBe(PARTNER)
  })
})

describe('daily quests with claims', () => {
  // `fresh` is not worth doing yet, `theirs` belongs to the partner, `mine` is due.
  const tasks: Task[] = [
    periodic({ id: 'mine', durationMin: 15 }),
    periodic({ id: 'fresh', durationMin: 10 }),
    periodic({ id: 'theirs', categoryId: 'cat-partner', durationMin: 20 }),
  ]
  const history: Completion[] = [
    completion({ taskId: 'mine', completedAt: at('2026-09-10') }),
    completion({ taskId: 'fresh', completedAt: at('2026-09-23') }),
    completion({ taskId: 'theirs', completedAt: at('2026-09-10') }),
  ]
  const quests = (claims: Claim[], memberId = ME, completions = history) => generateDailyQuests({
    memberId,
    tasks,
    categories,
    progress: buildTaskProgress({ tasks, completions, signals: [], today, timeZone: TZ }),
    today,
    vacations: [],
    budgetMin: 35,
    claims,
  })
  const ids = (list: { task: Task }[]) => list.map(q => q.task.id)

  it('puts a claimed task first, even from the other room or not yet due', () => {
    const { pending } = quests([claim({ taskId: 'theirs' }), claim({ id: 'c2', taskId: 'fresh', createdAt: at('2026-09-24') })])
    expect(ids(pending)).toEqual(['theirs', 'fresh', 'mine'])
    expect(pending[0]).toMatchObject({ isHelp: true, claimed: true })
  })

  it('hides a task the other member took in charge', () => {
    expect(ids(quests([claim({ memberId: PARTNER })]).pending)).toEqual([])
    expect(ids(quests([claim({ taskId: 'theirs' })], PARTNER).pending)).toEqual([])
  })

  it('drops the promise once someone did the task today', () => {
    const doneByPartner = [...history, completion({ taskId: 'theirs', memberId: PARTNER, completedAt: at('2026-09-24') })]
    expect(ids(quests([claim({ taskId: 'theirs' })], ME, doneByPartner).pending)).toEqual(['mine'])
  })

  it('ignores yesterday\'s claims', () => {
    expect(ids(quests([claim({ memberId: PARTNER, claimedOn: d('2026-09-23') })]).pending)).toEqual(['mine'])
  })

  it('leaves the other member\'s claims out of "J\'ai 10 min"', () => {
    const quick = [periodic({ id: 'quick', categoryId: 'cat-partner', durationMin: 5 })]
    const progress = buildTaskProgress({ tasks: quick, completions: [], signals: [], today, timeZone: TZ })
    const context = { memberId: ME, tasks: quick, categories, progress, today, vacations: [] }
    expect(suggestQuickTasks(context)).toHaveLength(1)
    expect(suggestQuickTasks({ ...context, claims: [claim({ taskId: 'quick', memberId: PARTNER })] })).toHaveLength(0)
  })
})

const trade = (overrides: Partial<Trade> = {}): Trade => ({
  id: 'trade-1',
  proposedBy: ME,
  proposedTo: PARTNER,
  requestTaskId: 'mine',
  offerTaskId: 'theirs',
  coins: 50,
  dueOn: today,
  acceptedAt: null,
  declinedAt: null,
  cancelledAt: null,
  createdAt: at('2026-09-24'),
  ...overrides,
})

describe('trades', () => {
  it('follows the life of a proposal', () => {
    expect(tradeStatus(trade(), today)).toBe('pending')
    expect(tradeStatus(trade(), d('2026-09-25'))).toBe('expired')
    expect(tradeStatus(trade({ acceptedAt: at('2026-09-24') }), d('2026-09-30'))).toBe('accepted')
    expect(tradeStatus(trade({ declinedAt: at('2026-09-24') }), today)).toBe('declined')
    expect(tradeStatus(trade({ cancelledAt: at('2026-09-24') }), today)).toBe('cancelled')
  })

  it('moves coins only once accepted', () => {
    const trades = [trade(), trade({ id: 't2', acceptedAt: at('2026-09-24') })]
    expect(tradeCoinDelta(ME, trades)).toBe(-50)
    expect(tradeCoinDelta(PARTNER, trades)).toBe(50)
    expect(computeCoinBalance(PARTNER, [completion({ memberId: PARTNER, coins: 15 })], [], trades)).toBe(65)
  })

  it('describes the deal from each side', () => {
    const labels = { taskName: (id: string) => ({ mine: 'la vaisselle', theirs: 'les draps' })[id] ?? id, memberName: (id: string) => id === ME ? 'Quentin' : 'Camille' }
    expect(describeTrade(trade(), PARTNER, labels)).toBe('tu fais la vaisselle, Quentin fait les draps, 50 pièces pour toi')
    expect(describeTrade(trade({ offerTaskId: null }), ME, labels)).toBe('Camille fait la vaisselle, 50 pièces pour Camille')
  })
})

describe('weekly recap', () => {
  const tasks = new Map([['oven', { name: 'Nettoyer le four', durationMin: 60 }], ['dishes', { name: 'Vaisselle', durationMin: 15 }]])
  const completions = [
    completion({ taskId: 'dishes', memberId: PARTNER, completedAt: at('2026-09-21') }),
    completion({ taskId: 'oven', memberId: PARTNER, completedAt: at('2026-09-22') }),
    completion({ taskId: 'dishes', memberId: PARTNER, completedAt: at('2026-09-20') }),
    completion({ taskId: 'dishes', memberId: PARTNER, completedAt: at('2026-09-23'), undoneAt: at('2026-09-23') }),
    completion({ taskId: 'dishes', memberId: ME, completedAt: at('2026-09-23') }),
  ]

  it('sums the effective completions of the member over the week', () => {
    const week = computeMemberWeek({ memberId: PARTNER, weekStart: d('2026-09-21'), completions, tasks, timeZone: TZ })
    expect(week).toMatchObject({ count: 2, minutes: 75 })
    expect(week.highlights.map(h => h.task.name)).toEqual(['Nettoyer le four', 'Vaisselle'])
  })

  it('thanks without ever blaming', () => {
    const week = computeMemberWeek({ memberId: PARTNER, weekStart: d('2026-09-21'), completions, tasks, timeZone: TZ })
    expect(recapMessage('Camille', week)?.body).toBe('Camille a fait 2 quêtes cette semaine (1 h 15), dont Nettoyer le four. Un merci ?')
    expect(recapMessage('Camille', { ...week, count: 0, minutes: 0, highlights: [] })).toBeNull()
  })

  it('formats durations', () => {
    expect([formatMinutes(45), formatMinutes(120), formatMinutes(190)]).toEqual(['45 min', '2 h', '3 h 10'])
  })

  it('is sent on Sunday evening only, unless disabled', () => {
    const prefs = { morning: false, morningTime: '08:00', evening: false, eveningTime: '19:00' }
    expect(openScheduledWindows(prefs, '18:30', d('2026-09-27'))).toEqual(['recap'])
    expect(openScheduledWindows(prefs, '18:30', d('2026-09-26'))).toEqual([])
    expect(openScheduledWindows({ ...prefs, recap: false }, '18:30', d('2026-09-27'))).toEqual([])
  })
})

describe('instant messages', () => {
  it('announces a claim', () => {
    expect(claimMessage([{ memberName: 'Quentin', taskName: 'Sortir les ordures' }])).toMatchObject({ title: '🙌 Quentin s\'en occupe', body: 'Sortir les ordures.' })
  })

  it('announces a trade event', () => {
    expect(tradeMessage([{ event: 'proposed', memberName: 'Quentin', summary: 'tu fais la vaisselle, Quentin fait les draps' }]))
      .toMatchObject({ title: '🤝 Quentin te propose un échange', body: 'Tu fais la vaisselle, Quentin fait les draps.' })
    expect(tradeMessage([])).toBeNull()
  })
})
