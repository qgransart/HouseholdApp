import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_CATALOGUE } from '#shared/catalogue'
import type { PullResponse, PushBody } from '#shared/schemas/rows'
import { createDatabase, type HouseholdDatabase } from '../../app/db/database'
import { completeTask, createHousehold, getMeta, loadSnapshot } from '../../app/db/repository'
import { META_SYNC_CURSOR, pullChanges, pushOutbox, syncOnce, type SyncTransport } from '../../app/sync/engine'

const NOW = new Date('2026-09-24T08:00:00Z')
let db: HouseholdDatabase
let count = 0

beforeEach(() => {
  db = createDatabase(`sync-${++count}`)
})

afterEach(async () => {
  await db.delete()
})

function fakeTransport(pullResponse: PullResponse = { rows: [], cursor: 0 }) {
  const pushed: PushBody[] = []
  const transport: SyncTransport = {
    push: vi.fn(async (body: PushBody) => {
      pushed.push(body)
    }),
    pull: vi.fn(async () => pullResponse),
  }
  return { transport, pushed }
}

async function household() {
  return createHousehold(db, {
    name: 'Appartement',
    memberNames: ['Quentin', 'Camille'],
    firstMemberEmail: 'quentin@example.com',
    rooms: STANDARD_CATALOGUE.map(room => ({ key: room.key, ownerIndex: 0, state: 'dirty' })),
    now: NOW,
  })
}

describe('pushOutbox', () => {
  it('sends every pending row once, then empties the outbox', async () => {
    const { householdId } = await household()
    const expectedRows = await db.outbox.count()
    const { transport, pushed } = fakeTransport()

    expect(await pushOutbox(db, transport)).toBe(expectedRows)
    expect(pushed.flatMap(b => b.mutations).filter(m => m.table === 'households')).toEqual([
      { table: 'households', row: expect.objectContaining({ id: householdId }) },
    ])
    expect(await db.outbox.count()).toBe(0)
  })

  it('sends the latest state of a row written several times', async () => {
    const { memberIds } = await household()
    const { transport } = fakeTransport()
    await pushOutbox(db, transport)
    const snapshot = await loadSnapshot(db, (await db.households.toCollection().first())!.id)
    const task = snapshot!.tasks[0]!
    const completion = await completeTask(db, { taskId: task.id, memberId: memberIds[0], now: NOW })
    await db.completions.update(completion.id, { xp: 99 })
    await db.outbox.add({ table: 'completions', rowId: completion.id })

    const { transport: second, pushed } = fakeTransport()
    await pushOutbox(db, second)
    const sent = pushed.flatMap(b => b.mutations).filter(m => m.table === 'completions')
    expect(sent).toHaveLength(1)
    expect(sent[0]?.row.xp).toBe(99)
  })

  it('keeps the outbox when the server refuses', async () => {
    await household()
    const before = await db.outbox.count()
    const transport: SyncTransport = {
      push: async () => {
        throw new Error('offline')
      },
      pull: async () => ({ rows: [], cursor: 0 }),
    }
    await expect(pushOutbox(db, transport)).rejects.toThrow('offline')
    expect(await db.outbox.count()).toBe(before)
  })
})

describe('pullChanges', () => {
  it('stores the rows and the cursor', async () => {
    const { householdId } = await household()
    await pushOutbox(db, fakeTransport().transport)
    const household_ = await db.households.get(householdId)
    const { transport } = fakeTransport({ rows: [{ table: 'households', row: { ...household_!, name: 'Maison' } }], cursor: 42 })

    expect(await pullChanges(db, transport)).toBe(1)
    expect((await db.households.get(householdId))?.name).toBe('Maison')
    expect(await getMeta(db, META_SYNC_CURSOR)).toBe(42)
  })

  it('does not overwrite a row with a pending local change', async () => {
    const { householdId } = await household()
    const local = await db.households.get(householdId)
    const { transport } = fakeTransport({ rows: [{ table: 'households', row: { ...local!, name: 'Version serveur' } }], cursor: 7 })
    await pullChanges(db, transport)
    expect((await db.households.get(householdId))?.name).toBe('Appartement')
  })

  it('asks for changes since the stored cursor', async () => {
    await household()
    await pushOutbox(db, fakeTransport().transport)
    const { transport } = fakeTransport({ rows: [], cursor: 12 })
    await syncOnce(db, transport)
    await syncOnce(db, transport)
    expect(transport.pull).toHaveBeenLastCalledWith(12)
  })
})
