import { describe, expect, it } from 'vitest'
import { eveningMessage, isQuietTime, morningMessage, openScheduledWindows, signalMessage, toLocalTime, type Quest } from '#shared/domain'
import { d, periodic, signalTask, TZ } from './factories'

const prefs = { morning: true, morningTime: '08:00', evening: true, eveningTime: '19:00' }

const quest = (name: string, durationMin = 10, triggeredBySignal = false): Quest => ({
  task: triggeredBySignal ? signalTask({ id: name, name, durationMin, signalLabel: 'Poubelle pleine' }) : periodic({ id: name, name, durationMin }),
  urgency: { score: 1, triggeredBySignal },
  isHelp: false,
  claimed: false,
})

describe('toLocalTime', () => {
  it('converts an instant to the wall-clock time of the zone, DST included', () => {
    expect(toLocalTime('2026-09-24T06:05:00Z', TZ)).toBe('08:05')
    expect(toLocalTime('2026-12-24T06:05:00Z', TZ)).toBe('07:05')
  })

  it('renders midnight as 00', () => {
    expect(toLocalTime('2026-09-23T22:00:00Z', TZ)).toBe('00:00')
  })
})

describe('isQuietTime', () => {
  it.each([['21:59', false], ['22:00', true], ['03:00', true], ['07:59', true], ['08:00', false]])('%s → %s', (time, quiet) => {
    expect(isQuietTime(time)).toBe(quiet)
  })
})

describe('openScheduledWindows', () => {
  it('opens a window at the chosen time for two hours', () => {
    expect(openScheduledWindows(prefs, '07:59', d('2026-09-24'))).toEqual([])
    expect(openScheduledWindows(prefs, '08:00', d('2026-09-24'))).toEqual(['morning'])
    expect(openScheduledWindows(prefs, '09:59', d('2026-09-24'))).toEqual(['morning'])
    expect(openScheduledWindows(prefs, '10:00', d('2026-09-24'))).toEqual([])
    expect(openScheduledWindows(prefs, '19:30', d('2026-09-24'))).toEqual(['evening'])
  })

  it('respects a disabled notification', () => {
    expect(openScheduledWindows({ ...prefs, morning: false }, '08:15', d('2026-09-24'))).toEqual([])
  })

  it('lets the member choose a morning before the end of the quiet hours', () => {
    expect(openScheduledWindows({ ...prefs, morningTime: '07:00' }, '07:10', d('2026-09-24'))).toEqual(['morning'])
  })

  it('never lets a window run into the quiet hours', () => {
    const late = { ...prefs, eveningTime: '21:00' }
    expect(openScheduledWindows(late, '21:45', d('2026-09-24'))).toEqual(['evening'])
    expect(openScheduledWindows(late, '22:10', d('2026-09-24'))).toEqual([])
  })
})

describe('messages', () => {
  it('says nothing when there is no quest', () => {
    expect(morningMessage([])).toBeNull()
    expect(eveningMessage([])).toBeNull()
    expect(signalMessage([])).toBeNull()
  })

  it('announces the quests of the day with their total duration', () => {
    const message = morningMessage([quest('Vaisselle', 15), quest('Balai', 10), quest('Évier', 5)])
    expect(message).toMatchObject({ title: '3 quêtes aujourd\'hui ☀️', tag: 'quests', url: '/' })
    expect(message?.body).toBe('Vaisselle, Balai et 1 autre, environ 30 min. On s\'y met ?')
  })

  it('puts a triggered signal first in the morning', () => {
    expect(morningMessage([quest('Sortir les ordures', 5, true)])?.body).toMatch(/^🔔 Poubelle pleine · /)
  })

  it('reminds the quests left in the evening', () => {
    expect(eveningMessage([quest('Vaisselle')])).toMatchObject({ title: 'Encore 1 quête ce soir 🌙' })
    expect(eveningMessage([quest('Vaisselle'), quest('Balai')])?.body).toMatch(/^Vaisselle et Balai t'attendent\./)
  })

  it('groups close signals', () => {
    const one = { label: 'Poubelle pleine', taskName: 'Sortir les ordures', raisedByName: 'Camille' }
    expect(signalMessage([one])).toEqual({ title: '🔔 Poubelle pleine', body: 'Camille a signalé : Sortir les ordures.', tag: 'signals', url: '/' })
    expect(signalMessage([one, { ...one, label: 'Panier plein' }])?.title).toBe('🔔 2 alertes')
  })
})
