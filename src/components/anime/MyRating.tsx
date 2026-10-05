import { Star, X } from 'lucide-react'
import { useState } from 'react'
import { useMyRating } from '@/hooks/useUserData'
import { cn } from '@/lib/cn'
import { useToast } from '@/providers/ToastProvider'

const LABELS = ['', 'Appalling', 'Horrible', 'Very bad', 'Bad', 'Average', 'Fine', 'Good', 'Very good', 'Great', 'Masterpiece']

/** The visitor's personal 1–10 score (stored locally, synced to the account). */
export function MyRating({ animeId, title, className }: { animeId: string; title: string; className?: string }) {
  const { value, set } = useMyRating(animeId)
  const [hover, setHover] = useState<number | null>(null)
  const toast = useToast()
  const shown = hover ?? value ?? 0
  return (
    <section aria-label="Your score" className={cn('rounded-2xl border border-line bg-surface p-5', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-fg">Your score</h2>
        {value !== undefined && (
          <button type="button" onClick={() => set(null)} className="inline-flex items-center gap-1 text-xs font-semibold text-fg-subtle hover:text-fg" aria-label="Remove your score">
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
      <div role="radiogroup" aria-label={`Rate ${title} from 1 to 10`} className="mt-3 flex gap-0.5" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} — ${LABELS[n]}`}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            onClick={() => {
              set(n)
              toast({ title: `Rated ${n}/10`, description: title })
            }}
            className="rounded p-0.5 transition-transform hover:scale-110"
          >
            <Star className={cn('h-5 w-5 sm:h-6 sm:w-6', n <= shown ? 'fill-warning text-warning' : 'text-line-strong')} />
          </button>
        ))}
      </div>
      <p className="mt-2 h-4 text-xs font-medium text-fg-muted" aria-live="polite">
        {shown ? `${shown}/10 · ${LABELS[shown]}` : 'Tap a star to rate'}
      </p>
    </section>
  )
}
