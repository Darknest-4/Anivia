import { t } from '@/i18n'
import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ViewMode = 'grid' | 'list'

export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div role="radiogroup" aria-label={t('View mode')} className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {(
        [
          { v: 'grid', icon: LayoutGrid, label: t('Grid view') },
          { v: 'list', icon: List, label: t('List view') },
        ] as const
      ).map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          aria-label={label}
          title={label}
          onClick={() => onChange(v)}
          className={cn('inline-flex h-8 w-9 items-center justify-center rounded-md transition-colors', value === v ? 'bg-surface-3 text-fg shadow-card' : 'text-fg-subtle hover:text-fg')}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
