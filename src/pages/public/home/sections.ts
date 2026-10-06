import { t } from '@/i18n'
/** Home page sections that visitors can turn off in Settings → Content. */
export const HOME_SECTIONS = [
  { id: 'continue', label: t('Continue Watching') },
  { id: 'trending', label: t('Trending Now') },
  { id: 'latest', label: t('Latest Releases') },
  { id: 'spotlight', label: t('Editor’s Spotlight & Top Rated') },
  { id: 'popular', label: t('Popular This Week') },
  { id: 'seasonal', label: t('This Season') },
  { id: 'genres', label: t('Explore Genres') },
  { id: 'recent', label: t('Recently Updated') },
  { id: 'upcoming', label: t('Coming Soon') },
  { id: 'recommended', label: t('Recommended for You') },
  { id: 'studios', label: t('Studios') },
  { id: 'join', label: t('Join banner') },
] as const

export type HomeSectionId = (typeof HOME_SECTIONS)[number]['id']
