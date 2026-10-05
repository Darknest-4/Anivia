import { ChevronDown } from 'lucide-react'
import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'size'> {
  options: SelectOption[]
  placeholder?: string
  size?: 'sm' | 'md' | 'xs'
}

/** Native select (best accessibility + mobile pickers) styled to match the design system. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ options, placeholder, className, size = 'md', ...rest }, ref) {
  return (
    <div className={cn('relative', className)}>
      <select
        ref={ref}
        className={cn(
          'w-full cursor-pointer appearance-none rounded-lg border border-line bg-surface-2 font-medium text-fg transition-colors hover:border-line-strong focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/25',
          size === 'xs' ? 'h-9 pl-2.5 pr-7 text-xs' : 'pl-3.5 pr-9',
          size === 'sm' ? 'h-9 text-[13px]' : size === 'md' ? 'h-11 text-sm' : '',
        )}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className={cn('pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle', size === 'xs' ? 'right-2' : 'right-3')} aria-hidden />
    </div>
  )
})
