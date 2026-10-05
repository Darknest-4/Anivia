import { cn } from '@/lib/cn'

interface ProgressProps {
  value: number // 0..1
  className?: string
  label?: string
  size?: 'xs' | 'sm' | 'md'
}

export function Progress({ value, className, label = 'Progress', size = 'sm' }: ProgressProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('w-full overflow-hidden rounded-full bg-white/15', size === 'xs' ? 'h-1' : size === 'sm' ? 'h-1.5' : 'h-2', className)}
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-slow ease-out" style={{ width: `${pct}%` }} />
    </div>
  )
}
