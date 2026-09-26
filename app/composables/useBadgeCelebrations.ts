import { BADGES } from '#shared/domain'
import { getMeta, setMeta } from '~/db/repository'

/**
 * Celebrates badges as soon as they are earned, whatever triggered them (a quest, a thank-you
 * received through the sync…). On a new device, badges already earned are recorded silently.
 */
export function useBadgeCelebrations() {
  const db = useDatabase()
  const game = useGame()
  const celebrations = useCelebrations()

  const earned = computed(() => game.currentMember.value ? [...game.earnedBadges(game.currentMember.value.id)].sort().join(',') : '')

  watch(earned, async (ids) => {
    const member = game.currentMember.value
    if (!member) {
      return
    }
    const key = `seenBadges:${member.id}`
    const current = ids ? ids.split(',') : []
    const seen = await getMeta<string[]>(db, key)
    await setMeta(db, key, current)
    if (!seen) {
      return
    }
    for (const badge of BADGES.filter(b => current.includes(b.id) && !seen.includes(b.id))) {
      celebrations.celebrate({ kind: 'badge', name: badge.name, hint: badge.hint })
    }
  }, { immediate: true })
}
