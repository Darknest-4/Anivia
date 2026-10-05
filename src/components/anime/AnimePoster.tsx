import { useState } from 'react'
import { cn } from '@/lib/cn'

interface AnimePosterProps {
  src: string
  alt: string
  className?: string
  aspect?: 'poster' | 'wide' | 'square'
  priority?: boolean
}

const aspects = { poster: 'aspect-[2/3]', wide: 'aspect-video', square: 'aspect-square' }

/** Lazy-loaded artwork with a skeleton tint while decoding. */
export function AnimePoster({ src, alt, className, aspect = 'poster', priority }: AnimePosterProps) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={cn('relative overflow-hidden bg-surface-2', aspects[aspect], className)}>
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={cn('absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-slow ease-out', loaded ? 'opacity-100' : 'opacity-0')}
      />
    </div>
  )
}
