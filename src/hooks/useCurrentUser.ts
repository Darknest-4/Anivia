import { demoUser } from '@/data/user'
import { useAniList } from '@/providers/AniListProvider'
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

/**
 * The signed-in ANIVIA account, else the connected AniList account, else the demo
 * account (offline catalog) or a local guest profile.
 */
export function useCurrentUser() {
  const auth = useAuth()
  const anilist = useAniList()
  const signedIn = auth.status === 'signed-in' && Boolean(auth.user)
  const al = anilist.account
  const user: User & { avatarUrl?: string } = signedIn
    ? { ...auth.user!, avatarUrl: al?.avatar }
    : al
      ? { id: `anilist-${al.userId}`, username: al.name, displayName: al.name, avatarHue: 200, bio: '', memberSince: new Date().toISOString(), plan: 'free', avatarUrl: al.avatar }
      : isMockProvider && auth.status === 'disabled'
        ? demoUser
        : guest
  const isGuest = !signedIn && !al && user === guest
  return { user, signedIn, isGuest, anilistOnly: !signedIn && Boolean(al), auth, anilist }
}
