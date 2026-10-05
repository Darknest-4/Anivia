import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-fg-subtle">{description}</p>}
      </div>
      <div className="divide-y divide-line/70 px-5">{children}</div>
    </section>
  )
}

export const Row = ({ children }: { children: ReactNode }) => <div className="py-4">{children}</div>

/** Compact segmented choice used across settings. */
export function Choice<T extends string | number>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string
  description?: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        {description && <p className="text-[13px] text-fg-subtle">{description}</p>}
      </div>
      <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 flex-wrap rounded-lg border border-line bg-surface-2 p-0.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition-colors', value === o.value ? 'bg-surface-3 text-fg shadow-card' : 'text-fg-muted hover:text-fg')}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
