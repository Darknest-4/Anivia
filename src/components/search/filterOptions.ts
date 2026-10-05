import type { SelectOption } from '@/components/ui'

const thisYear = new Date().getFullYear()
export const YEAR_OPTIONS: SelectOption[] = Array.from({ length: thisYear + 2 - 1980 }, (_, i) => thisYear + 1 - i).map((y) => ({ value: String(y), label: String(y) }))
export const SEASON_OPTIONS: SelectOption[] = [
  { value: 'winter', label: 'Winter' },
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
]
export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'airing', label: 'Airing' },
  { value: 'finished', label: 'Finished' },
  { value: 'upcoming', label: 'Upcoming' },
]
export const TYPE_OPTIONS: SelectOption[] = ['TV', 'Movie', 'OVA', 'ONA', 'Special'].map((t) => ({ value: t, label: t }))
export const RATING_OPTIONS: SelectOption[] = [
  { value: '9', label: '9.0+' },
  { value: '8.5', label: '8.5+' },
  { value: '8', label: '8.0+' },
  { value: '7', label: '7.0+' },
]
export const LANGUAGE_OPTIONS: SelectOption[] = ['Japanese', 'English', 'Spanish', 'Portuguese', 'French', 'German'].map((l) => ({ value: l, label: l }))
export const PER_PAGE_OPTIONS: SelectOption[] = [12, 24, 48].map((n) => ({ value: String(n), label: `${n} / page` }))
