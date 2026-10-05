import { ProviderError } from '../AnimeProvider'

interface QueueOptions {
  /** Minimum gap between two requests (ms). */
  minInterval: number
  /** Sliding-window cap on requests per 60 seconds. */
  perMinute: number
  /** How many times a 429 / 5xx / network failure is retried. */
  retries?: number
  /** Response cache lifetime (ms). */
  cacheTtl?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Serial, rate-limited fetch queue with an in-memory response cache.
 * Public anime APIs (Jikan, AniList) enforce strict per-IP limits, so every request
 * goes through one queue and identical requests are de-duplicated.
 */
export function createRequestQueue({ minInterval, perMinute, retries = 3, cacheTtl = 5 * 60_000 }: QueueOptions) {
  const cache = new Map<string, { at: number; value: Promise<unknown> }>()
  const sent: number[] = []
  let chain: Promise<unknown> = Promise.resolve()
  let last = 0

  async function waitForSlot() {
    for (;;) {
      const now = Date.now()
      while (sent.length && now - sent[0] > 60_000) sent.shift()
      const gap = minInterval - (now - last)
      const windowWait = sent.length >= perMinute ? 60_000 - (now - sent[0]) + 50 : 0
      const wait = Math.max(gap, windowWait)
      if (wait <= 0) break
      await sleep(wait)
    }
    last = Date.now()
    sent.push(last)
  }

  async function run<T>(input: string, init?: RequestInit, maxRetries = retries): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await waitForSlot()
      let res: Response
      try {
        res = await fetch(input, init)
      } catch (err) {
        if (attempt < maxRetries) {
          await sleep(800 * (attempt + 1))
          continue
        }
        throw new ProviderError(err instanceof Error ? err.message : 'Network error')
      }
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        const retryAfter = Number(res.headers.get('Retry-After'))
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1200 * (attempt + 1))
        continue
      }
      if (res.status === 404) return null as T
      const body = (await res.json().catch(() => null)) as T
      if (!res.ok) {
        // AniList returns GraphQL errors with a 4xx status but a JSON body worth surfacing.
        const message = (body as { errors?: { message: string }[] } | null)?.errors?.[0]?.message
        if (res.status === 404 || message?.toLowerCase().includes('not found')) return null as T
        throw new ProviderError(message ?? `Request failed (${res.status})`, res.status)
      }
      return body
    }
  }

  return {
    /** Queued, cached request. `key` defaults to the URL (+ body for POST). */
    request<T>(input: string, init?: RequestInit, key = `${input}|${init?.body ?? ''}`, maxRetries = retries): Promise<T> {
      const hit = cache.get(key)
      if (hit && Date.now() - hit.at < cacheTtl) return hit.value as Promise<T>
      const value = (chain = chain.then(
        () => run<T>(input, init, maxRetries),
        () => run<T>(input, init, maxRetries),
      )) as Promise<T>
      if (cacheTtl > 0) {
        cache.set(key, { at: Date.now(), value })
        value.catch(() => cache.delete(key))
      }
      return value
    },
  }
}
