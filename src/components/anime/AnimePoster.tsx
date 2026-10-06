import { useState } from 'react'
import { cn } from '@/lib/cn'

interface AnimePosterProps {
  src: string
  alt: string
  className?: string
  aspect?: 'poster' | 'wide' | 'square'
  priority?: boolean
  /** Rendered width hint for picking an image size. */
  sizes?: string
}

const aspects = { poster: 'aspect-[2/3]', wide: 'aspect-video', square: 'aspect-square' }

/**
 * AniList serves every cover in three sizes (small ≈100px, medium ≈230px, large ≈460px wide).
 * Offering all of them lets the browser download the smallest one that is still sharp —
 * desktops usually get a quarter of the bytes, high-density phones keep the large one.
 */
export function coverSrcSet(src: string) {
  const m = /^(.*\/media\/anime\/cover\/)(small|medium|large)(\/.*)$/.exec(src)
  if (!m) return undefined
  return `${m[1]}small${m[3]} 100w, ${m[1]}medium${m[3]} 230w, ${m[1]}large${m[3]} 460w`
}

/** Lazy-loaded artwork with a skeleton tint while decoding. */
export function AnimePoster({ src, alt, className, aspect = 'poster', priority, sizes = '(max-width: 640px) 46vw, (max-width: 1024px) 24vw, 200px' }: AnimePosterProps) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={cn('relative overflow-hidden bg-surface-2', aspects[aspect], className)}>
      <img
        src={src}
        srcSet={aspect === 'poster' ? coverSrcSet(src) : undefined}
        sizes={aspect === 'poster' && coverSrcSet(src) ? sizes : undefined}
        alt={alt}
        fetchPriority={priority ? 'high' : undefined}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={cn('absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-slow ease-out', loaded ? 'opacity-100' : 'opacity-0')}
      />
    </div>
  )
}
