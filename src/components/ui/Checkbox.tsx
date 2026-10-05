import { Check } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  className?: string
  required?: boolean
}

export function Checkbox({ checked, onChange, label, className, required }: CheckboxProps) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <span className="relative mt-0.5 inline-flex">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          required={required}
          onChange={(e) => onChange(e.target.checked)}
          className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-surface-2 transition-colors checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
        <Check className="pointer-events-none absolute inset-0 m-auto h-3 w-3 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3.5} aria-hidden />
      </span>
      <label htmlFor={id} className="cursor-pointer select-none text-[13px] leading-5 text-fg-muted">
        {label}
      </label>
    </div>
  )
}
