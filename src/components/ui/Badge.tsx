import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type BadgeVariant = 'default' | 'accent' | 'outline' | 'success' | 'warning' | 'info' | 'danger' | 'glass' | 'solid'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-surface-3 text-fg-muted',
  accent: 'bg-accent/15 text-accent-soft ring-1 ring-inset ring-accent/25',
  outline: 'ring-1 ring-inset ring-line-strong text-fg-muted',
  success: 'bg-success/15 text-success ring-1 ring-inset ring-success/25',
  warning: 'bg-warning/15 text-warning ring-1 ring-inset ring-warning/25',
  info: 'bg-info/15 text-info ring-1 ring-inset ring-info/25',
  danger: 'bg-danger/15 text-danger ring-1 ring-inset ring-danger/25',
  glass: 'bg-black/55 text-white ring-1 ring-inset ring-white/15 backdrop-blur-md',
  solid: 'bg-accent text-accent-fg',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
}

export function Badge({ variant = 'default', size = 'sm', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md font-semibold leading-none',
        size === 'sm' ? 'px-1.5 py-1 text-2xs' : 'px-2.5 py-1.5 text-xs',
        variants[variant],
        className,
      )}
      {...rest}
    />
  )
}
