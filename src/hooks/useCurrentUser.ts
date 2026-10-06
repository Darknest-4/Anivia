import { useAniList } from '@/providers/AniListProvider'
import { useAuth } from '@/providers/AuthProvider'
import { profileLookStore } from '@/services/user/profileLook'
import type { User } from '@/types'
import { useStore } from './useUserData'

const guest: User = {
  id: 'guest',
  username: 'guest',
  displayName: 'Guest',
  avatarHue: 220,
  bio: 'Sign in to sync your watchlist, history and settings across devices.',
  // Empty = not a member (hides "Member since" on the profile).
  memberSince: '',
  plan: 'free',
}

/**
 * The signed-in ANIVIA account, else the connected AniList account, else a
 * local guest profile.
 */
export function useCurrentUser() {
  const auth = useAuth()
  const anilist = useAniList()
  const signedIn = auth.status === 'signed-in' && Boolean(auth.user)
  const al = anilist.account
  const look = useStore(profileLookStore)
  const user: User = signedIn
    ? { ...auth.user!, avatarUrl: auth.user!.avatarUrl ?? al?.avatar }
    : al
      ? { id: `anilist-${al.userId}`, username: al.name, displayName: al.name, avatarHue: 200, bio: '', memberSince: '', plan: 'free', avatarUrl: look.avatarUrl ?? al.avatar, bannerUrl: look.bannerUrl }
      : look.avatarUrl || look.bannerUrl
        ? { ...guest, avatarUrl: look.avatarUrl, bannerUrl: look.bannerUrl }
        : guest
  const isGuest = !signedIn && !al
  return { user, signedIn, isGuest, anilistOnly: !signedIn && Boolean(al), auth, anilist }
}
