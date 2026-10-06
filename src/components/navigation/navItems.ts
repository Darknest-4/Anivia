import { t } from '@/i18n'
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
  { to: '/', label: t('Home'), icon: Home, end: true },
  { to: '/browse', label: t('Browse'), icon: Compass },
  { to: '/schedule', label: t('Schedule'), icon: CalendarDays },
  { to: '/genres', label: t('Genres'), icon: LayoutGrid },
  { to: '/season', label: t('Seasonal'), icon: Snowflake },
]

export const discoverNav: NavItem[] = [
  { to: '/characters', label: t('Characters'), icon: Users },
  { to: '/studios', label: t('Studios'), icon: Building2 },
  { to: '/lists', label: t('Lists'), icon: ListOrdered },
  { to: '/feed', label: t('Feed'), icon: Rss },
  { to: '/search', label: t('Search'), icon: Search },
]

export const libraryNav: NavItem[] = [
  { to: '/watchlist', label: t('Watchlist'), icon: Bookmark },
  { to: '/history', label: t('History'), icon: History },
  { to: '/for-you', label: t('For you'), icon: Sparkles },
  { to: '/stats', label: t('My stats'), icon: BarChart3 },
  { to: '/profile', label: t('Profile'), icon: User },
  { to: '/settings', label: t('Settings'), icon: Settings },
]

export const mobileTabs: NavItem[] = [
  { to: '/', label: t('Home'), icon: Home, end: true },
  { to: '/browse', label: t('Browse'), icon: Compass },
  { to: '/watchlist', label: t('Watchlist'), icon: Bookmark },
  { to: '/schedule', label: t('Schedule'), icon: CalendarDays },
  { to: '/profile', label: t('Profile'), icon: User },
]

export const upgradeNav: NavItem = { to: '/pricing', label: t('Upgrade'), icon: Sparkles }
/** Library links plus “Upgrade” when pricing is enabled. */
export const libraryNavWithUpgrade: NavItem[] = config.enablePricing ? [...libraryNav, upgradeNav] : libraryNav
