import type { User } from '@/types'

/** The fictional demo account displayed on the profile page. No real authentication exists. */
export const demoUser: User = {
  id: 'u-demo',
  username: 'stargazer',
  displayName: 'Hikari Stargazer',
  avatarHue: 350,
  bio: 'Collecting sunsets, soundtracks and slow-burn fantasy epics. Currently rewatching everything from Lumen Arc.',
  memberSince: '2023-03-14',
  location: 'Somewhere between episodes',
  plan: 'plus',
}
