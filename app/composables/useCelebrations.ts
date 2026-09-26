export type Celebration
  = | { kind: 'level', level: number }
    | { kind: 'chest', streak: number }
    | { kind: 'badge', name: string, hint: string }

/** Queue of celebration dialogs (level up, chest opened), shown one after the other. */
export const useCelebrations = createSharedComposable(() => {
  const queue = ref<Celebration[]>([])
  const current = computed(() => queue.value[0] ?? null)

  function celebrate(celebration: Celebration) {
    queue.value = [...queue.value, celebration]
  }

  function next() {
    queue.value = queue.value.slice(1)
  }

  return { current, celebrate, next }
})
