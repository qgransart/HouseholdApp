import type { ShallowRef, WatchSource } from 'vue'
import { liveQuery } from 'dexie'

/**
 * Reactive result of a Dexie query: re-runs whenever the tables it reads change,
 * including writes made by another tab or by the sync.
 * `undefined` until the first result, which lets views tell "loading" from "empty".
 */
export function useLiveQuery<T>(query: () => T | Promise<T>, dependencies: WatchSource[] = []): Readonly<ShallowRef<T | undefined>> {
  const result = shallowRef<T>()
  let subscription: { unsubscribe: () => void } | undefined

  const subscribe = () => {
    subscription?.unsubscribe()
    subscription = liveQuery(query).subscribe({
      next: (value) => {
        result.value = value
      },
      error: (error) => {
        console.error('[useLiveQuery]', error)
      },
    })
  }

  if (dependencies.length) {
    watch(dependencies, subscribe, { immediate: true })
  }
  else {
    subscribe()
  }
  onScopeDispose(() => subscription?.unsubscribe())

  return readonly(result) as Readonly<ShallowRef<T | undefined>>
}
