/**
 * Local "something happened" events (status change, score, finished episode…). When signed in,
 * the AuthProvider forwards them to the activity feed of your followers. Sync merges don't emit,
 * so logging in on a new device never floods the feed.
 */
export type ActivityKind = 'status' | 'rating' | 'episode' | 'review' | 'list' | 'favorite'
export interface ActivityEvent {
  kind: ActivityKind
  animeId?: string
  data?: Record<string, unknown>
}

const listeners = new Set<(e: ActivityEvent) => void>()

export function emitActivity(e: ActivityEvent) {
  listeners.forEach((l) => l(e))
}

export function onActivity(listener: (e: ActivityEvent) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
