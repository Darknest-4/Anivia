import { t } from '@/i18n'
import { Play } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'

interface Props {
  youtubeId: string
  title: string
  thumbnail?: string
  autoplay?: boolean
  className?: string
}

/** Click-to-load YouTube embed (privacy-enhanced domain; no third-party requests until played). */
export function TrailerEmbed({ youtubeId, title, thumbnail, autoplay, className }: Props) {
  const [active, setActive] = useState(Boolean(autoplay))
  const id = encodeURIComponent(youtubeId)
  const poster = thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  return (
    <div className={cn('relative aspect-video w-full overflow-hidden bg-black', className)}>
      {active ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={t('{p0} — official trailer', { p0: title })}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button type="button" onClick={() => setActive(true)} className="group absolute inset-0" aria-label={`Play ${title} trailer`}>
          <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white shadow-glow transition-transform group-hover:scale-105">
            <Play className="ml-1 h-7 w-7 fill-current" />
          </span>
          <span className="absolute bottom-3 left-4 text-sm font-semibold text-white">{t('Official trailer')}</span>
        </button>
      )}
    </div>
  )
}
