import { isAllowedProfileImage } from '@/lib/profileImages'
import { createPersistentStore } from '@/services/storage'

/** Profile picture / banner for visitors without an account (accounts keep them in their profile). */
export interface ProfileLook {
  avatarUrl?: string
  bannerUrl?: string
}

export const profileLookStore = createPersistentStore<ProfileLook>('profile-look', {}, (v) => ({
  avatarUrl: isAllowedProfileImage(v?.avatarUrl) ? v.avatarUrl : undefined,
  bannerUrl: isAllowedProfileImage(v?.bannerUrl) ? v.bannerUrl : undefined,
}))
