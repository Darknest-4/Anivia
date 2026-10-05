import { cn } from '@/lib/cn'

interface AvatarProps {
  name: string
  hue?: number
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl', xl: 'h-24 w-24 text-3xl sm:h-28 sm:w-28' }

export function Avatar({ name, hue = 348, src, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold text-white ring-2 ring-bg', sizes[size], className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 85% 60%), hsl(${(hue + 60) % 360} 70% 38%))` }}
      aria-hidden={!src}
    >
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials}
    </span>
  )
}
