const DISPLAY_MS = 5000

export interface ToastMessage {
  id: number
  text: string
  /** When set, the toast offers to undo this completion. */
  undoCompletionId?: string
}

/** One toast at a time, announced politely to screen readers by GameToast. */
export const useToast = createSharedComposable(() => {
  const current = ref<ToastMessage | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let sequence = 0

  function show(text: string, options: { undoCompletionId?: string } = {}) {
    clearTimeout(timer)
    current.value = { id: ++sequence, text, ...options }
    timer = setTimeout(dismiss, DISPLAY_MS)
  }

  function dismiss() {
    clearTimeout(timer)
    current.value = null
  }

  return { current: readonly(current), show, dismiss }
})
