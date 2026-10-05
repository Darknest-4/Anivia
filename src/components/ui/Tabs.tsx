import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  count?: number
  icon?: ReactNode
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  variant?: 'underline' | 'pill' | 'segmented'
  className?: string
  size?: 'sm' | 'md'
  idPrefix?: string
}

/** Accessible tab list with arrow-key navigation. Pair panels with `id={`${idPrefix}-panel-${value}`}`. */
export function Tabs<T extends string>({ items, value, onChange, label, variant = 'underline', className, size = 'md', idPrefix = 'tab' }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    let next = -1
    if (e.key === 'ArrowRight') next = (index + 1) % items.length
    if (e.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = items.length - 1
    if (next >= 0) {
      e.preventDefault()
      refs.current[next]?.focus()
      onChange(items[next].value)
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'scrollbar-none flex max-w-full overflow-x-auto',
        variant === 'underline' && 'gap-1 border-b border-line',
        variant === 'pill' && 'gap-2',
        variant === 'segmented' && 'inline-flex gap-1 rounded-xl border border-line bg-surface-2 p-1',
        className,
      )}
    >
      {items.map((item, i) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            ref={(el) => (refs.current[i] = el)}
            role="tab"
            type="button"
            id={`${idPrefix}-${item.value}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${item.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold transition-colors duration-fast',
              size === 'sm' ? 'text-[13px]' : 'text-sm',
              variant === 'underline' &&
                cn(
                  'px-3 pb-3 pt-1',
                  active ? 'text-fg after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent' : 'text-fg-subtle hover:text-fg',
                ),
              variant === 'pill' &&
                cn('h-9 rounded-full px-4', active ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-muted ring-1 ring-inset ring-line hover:bg-surface-3 hover:text-fg'),
              variant === 'segmented' && cn('h-8 rounded-lg px-3', active ? 'bg-surface-3 text-fg shadow-card' : 'text-fg-subtle hover:text-fg'),
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span className={cn('rounded-md px-1.5 py-0.5 text-2xs', active ? 'bg-accent/15 text-accent-soft' : 'bg-surface-3 text-fg-subtle')}>{item.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
