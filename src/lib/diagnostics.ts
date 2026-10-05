/** Remembers the most recent data-source failure so error screens can show what actually went wrong. */
export interface LastError {
  message: string
  status?: number
  url: string
  at: string
}

let last: LastError | null = null

export function reportProviderError(url: string, message: string, status?: number) {
  let host = url
  try {
    host = new URL(url, window.location.origin).host + new URL(url, window.location.origin).pathname
  } catch {
    /* keep raw */
  }
  last = { url: host, message, status, at: new Date().toISOString() }
}

export const lastProviderError = () => last
