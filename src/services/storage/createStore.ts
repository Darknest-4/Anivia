import { storage } from './storage'
import { config } from '@/config'

export interface PersistentStore<T> {
  get(): T
  set(next: T | ((prev: T) => T)): void
  subscribe(listener: () => void): () => void
  reset(): void
}

/**
 * Minimal observable store persisted to localStorage.
 * Works with React's `useSyncExternalStore` and syncs across browser tabs.
 */
export function createPersistentStore<T>(key: string, initial: T): PersistentStore<T> {
  let state = storage.get<T>(key, initial)
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === `${config.storagePrefix}${key}`) {
        state = storage.get<T>(key, initial)
        emit()
      }
    })
  }

  return {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next
      storage.set(key, state)
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reset() {
      state = initial
      storage.remove(key)
      emit()
    },
  }
}
