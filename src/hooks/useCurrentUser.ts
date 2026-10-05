import { demoUser } from '@/data/user'
import { useAuth } from '@/providers/AuthProvider'
import { isMockProvider } from '@/services/anime'
import type { User } from '@/types'

const guest: User = {
  id: 'guest',
  username: 'guest',
  displayName: 'Guest',
  avatarHue: 220,
  bio: 'Sign in to sync your watchlist, history and settings across devices.',
  memberSince: new Date().toISOString(),
  plan: 'free',
}

/** The signed-in account, the demo account (offline demo catalog) or a local guest profile. */
export function useCurrentUser() {
  const auth = useAuth()
  const signedIn = auth.status === 'signed-in' && Boolean(auth.user)
  const user = signedIn ? auth.user! : isMockProvider && auth.status === 'disabled' ? demoUser : guest
  return { user, signedIn, isGuest: !signedIn && user === guest, auth }
}
