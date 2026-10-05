import { config } from '@/config'

/**
 * Safe, namespaced localStorage wrapper.
 * Never store passwords, tokens or API secrets here — it is readable by any script on the page.
 */
const memoryFallback = new Map<string, string>()

function backend(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  try {
    const probe = `${config.storagePrefix}__probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return {
      getItem: (k) => memoryFallback.get(k) ?? null,
      setItem: (k, v) => void memoryFallback.set(k, v),
      removeItem: (k) => void memoryFallback.delete(k),
    }
  }
}

const store = typeof window !== 'undefined' ? backend() : null
const fullKey = (key: string) => `${config.storagePrefix}${key}`

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (!store) return fallback
    try {
      const raw = store.getItem(fullKey(key))
      return raw === null ? fallback : (JSON.parse(raw) as T)
    } catch {
      return fallback
    }
  },
  set<T>(key: string, value: T) {
    if (!store) return
    try {
      store.setItem(fullKey(key), JSON.stringify(value))
    } catch {
      /* quota exceeded or private mode — ignore */
    }
  },
  remove(key: string) {
    store?.removeItem(fullKey(key))
  },
  /** Removes every ANIVIA key (used by "Reset demo data" in settings). */
  clearAll() {
    if (typeof window === 'undefined') return
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith(config.storagePrefix))
        .forEach((k) => window.localStorage.removeItem(k))
    } catch {
      memoryFallback.clear()
    }
  },
}
