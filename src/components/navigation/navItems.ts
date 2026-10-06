import { config } from '@/config'
import {
  BarChart3,
  Bookmark,
  CalendarDays,
  Compass,
  History,
  Home,
  LayoutGrid,
  ListOrdered,
  Rss,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
  Building2,
  Snowflake,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const primaryNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/browse', label: 'Browse', icon: Compass },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/genres', label: 'Genres', icon: LayoutGrid },
  { to: '/season', label: 'Seasonal', icon: Snowflake },
]

export const discoverNav: NavItem[] = [
  { to: '/characters', label: 'Characters', icon: Users },
  { to: '/studios', label: 'Studios', icon: Building2 },
  { to: '/lists', label: 'Lists', icon: ListOrdered },
  { to: '/feed', label: 'Feed', icon: Rss },
  { to: '/search', label: 'Search', icon: Search },
]

export const libraryNav: NavItem[] = [
  { to: '/watchlist', label: 'Watchlist', icon: Bookmark },
  { to: '/history', label: 'History', icon: History },
  { to: '/for-you', label: 'For you', icon: Sparkles },
  { to: '/stats', label: 'My stats', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const mobileTabs: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/browse', label: 'Browse', icon: Compass },
  { to: '/watchlist', label: 'Watchlist', icon: Bookmark },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/profile', label: 'Profile', icon: User },
]

export const upgradeNav: NavItem = { to: '/pricing', label: 'Upgrade', icon: Sparkles }
/** Library links plus “Upgrade” when pricing is enabled. */
export const libraryNavWithUpgrade: NavItem[] = config.enablePricing ? [...libraryNav, upgradeNav] : libraryNav
