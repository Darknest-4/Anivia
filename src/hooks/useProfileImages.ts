import { isAllowedProfileImage } from '@/lib/profileImages'
import { useAuth } from '@/providers/AuthProvider'
import { profileLookStore } from '@/services/user/profileLook'
import { useCurrentUser } from './useCurrentUser'

export type ProfileImageKind = 'avatar' | 'banner'

/**
 * The current profile picture / banner and a saver: stored on the account when signed in
 * (visible on the public profile and every device), otherwise in this browser.
 */
export function useProfileImages() {
  const auth = useAuth()
  const { user } = useCurrentUser()
  const signedIn = auth.status === 'signed-in'

  const save = async (kind: ProfileImageKind, url: string | null) => {
    if (url && !isAllowedProfileImage(url)) throw new Error('Only images from AniList or MyAnimeList can be used.')
    if (signedIn) await auth.updateProfile(kind === 'avatar' ? { avatar_url: url } : { banner_url: url })
    else profileLookStore.set((l) => ({ ...l, [kind === 'avatar' ? 'avatarUrl' : 'bannerUrl']: url ?? undefined }))
  }

  return { avatarUrl: user.avatarUrl, bannerUrl: user.bannerUrl, signedIn, save }
}
