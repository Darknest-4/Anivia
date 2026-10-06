import { config } from '@/config'

/**
 * Sends uncaught errors to the database (error_logs, migration 0006) so staff can see them in
 * Admin → Errors. Identical errors are counted server-side; this side caps how many it sends.
 * Only the message, stack, page URL and browser are sent — never form contents.
 */
let sent = 0
const seen = new Set<string>()
let token: string | null = null
export const setErrorReporterUser = (t: string | null) => {
  token = t
}

// Noise from extensions, cancelled requests and old cached chunks after a deploy.
const IGNORE = /ResizeObserver loop|AbortError|The user aborted|Load failed|NetworkError|Failed to fetch|chrome-extension:|moz-extension:|Non-Error promise rejection/i

export function reportError(error: unknown, extra = '') {
  if (!import.meta.env.PROD || !config.supabaseUrl) return
  const err = error instanceof Error ? error : new Error(String(error))
  const message = `${err.name}: ${err.message}${extra ? ` (${extra})` : ''}`.slice(0, 1000)
  if (IGNORE.test(message) || IGNORE.test(err.stack ?? '') || seen.has(message) || sent >= 10) return
  seen.add(message)
  sent++
  void fetch(`${config.supabaseUrl}/rest/v1/rpc/log_client_error`, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', apikey: config.supabaseKey, Authorization: `Bearer ${token ?? config.supabaseKey}` },
    body: JSON.stringify({
      p_message: message,
      p_stack: (err.stack ?? '').slice(0, 4000),
      p_url: window.location.pathname + window.location.search,
      p_user_agent: navigator.userAgent,
      p_release: import.meta.env.VITE_RELEASE ?? __BUILD_TIME__,
    }),
  }).catch(() => undefined)
}

export function installErrorReporter() {
  window.addEventListener('error', (e) => reportError(e.error ?? e.message))
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'unhandled promise'))
}
