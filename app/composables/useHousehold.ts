import { getMeta, loadSnapshot, META_CURRENT_MEMBER_ID, META_HOUSEHOLD_ID, setMeta } from '~/db/repository'

/**
 * The household of this device and the member currently playing.
 * Until authentication exists (lot 4), the current member is a device setting that can be switched.
 */
export const useHousehold = createSharedComposable(() => {
  const db = useDatabase()

  const identity = useLiveQuery(async () => ({
    householdId: await getMeta<string>(db, META_HOUSEHOLD_ID) ?? null,
    currentMemberId: await getMeta<string>(db, META_CURRENT_MEMBER_ID) ?? null,
  }))

  const householdId = computed(() => identity.value?.householdId ?? null)

  const snapshot = useLiveQuery(
    () => householdId.value ? loadSnapshot(db, householdId.value) : null,
    [householdId],
  )

  const currentMember = computed(() => {
    const members = snapshot.value?.members ?? []
    return members.find(member => member.id === identity.value?.currentMemberId) ?? members[0] ?? null
  })

  const partner = computed(() => snapshot.value?.members.find(member => member.id !== currentMember.value?.id) ?? null)

  /** `undefined` while loading, `false` when this device has no household yet. */
  const isReady = computed(() => identity.value === undefined ? undefined : identity.value.householdId !== null)

  async function switchMember() {
    if (partner.value) {
      await setMeta(db, META_CURRENT_MEMBER_ID, partner.value.id)
    }
  }

  return { snapshot, householdId, currentMember, partner, isReady, switchMember }
})
