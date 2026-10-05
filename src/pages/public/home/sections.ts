/** Home page sections that visitors can turn off in Settings → Content. */
export const HOME_SECTIONS = [
  { id: 'continue', label: 'Continue Watching' },
  { id: 'trending', label: 'Trending Now' },
  { id: 'latest', label: 'Latest Releases' },
  { id: 'spotlight', label: 'Editor’s Spotlight & Top Rated' },
  { id: 'popular', label: 'Popular This Week' },
  { id: 'seasonal', label: 'This Season' },
  { id: 'genres', label: 'Explore Genres' },
  { id: 'recent', label: 'Recently Updated' },
  { id: 'upcoming', label: 'Coming Soon' },
  { id: 'recommended', label: 'Recommended for You' },
  { id: 'studios', label: 'Studios' },
  { id: 'join', label: 'Join banner' },
] as const

export type HomeSectionId = (typeof HOME_SECTIONS)[number]['id']
