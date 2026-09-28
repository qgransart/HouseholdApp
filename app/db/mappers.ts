import type { Task } from '#shared/domain/types'
import type { TaskRow } from '#shared/types/entities'

/**
 * Maps a persisted task to the domain union. Returns `null` for an inconsistent row
 * (e.g. a periodic task without interval) so that one bad synced row cannot break the app.
 */
export function toDomainTask(row: TaskRow): Task | null {
  const base = {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    size: row.size,
    durationMin: row.durationMin,
    active: row.active,
    snoozedUntil: row.snoozedUntil,
    baselineOn: row.baselineOn,
  }
  switch (row.type) {
    case 'periodic':
      return row.intervalDays && row.intervalDays > 0 ? { ...base, type: 'periodic', intervalDays: row.intervalDays } : null
    case 'quota':
      return row.weeklyQuota && row.weeklyQuota > 0 ? { ...base, type: 'quota', weeklyQuota: row.weeklyQuota } : null
    case 'signal':
      return { ...base, type: 'signal', signalLabel: row.signalLabel ?? row.name, maxDelayDays: row.maxDelayDays }
    default:
      return null
  }
}
