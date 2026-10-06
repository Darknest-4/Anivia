import { t } from '@/i18n'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ScrollRowProps {
  children: ReactNode
  label: string
  className?: string
  itemClassName?: string
}

/**
 * Horizontal snap carousel. Touch: native swipe. Desktop: arrow buttons.
 * Children should be an array of items; each is wrapped in a snap cell.
 */
export function ScrollRow({ children, label, className, itemClassName = 'w-[42%] xs:w-[30%] sm:w-[23%] lg:w-[18.4%] xl:w-[15.3%] 3xl:w-[11.6%]' }: ScrollRowProps) {
  const ref = useRef<HTMLUListElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    update()
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [update, children])

  const scroll = (dir: 1 | -1) => {
    const el = ref.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  const items = Array.isArray(children) ? children : [children]

  return (
    <div className={cn('group/row relative', className)}>
      <ul
        ref={ref}
        onScroll={update}
        aria-label={label}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:-mx-8 lg:scroll-px-8 lg:px-8 2xl:-mx-12 2xl:scroll-px-12 2xl:px-12"
      >
        {items.map((child, i) => (
          <li key={i} className={cn('shrink-0 snap-start', itemClassName)}>
            {child}
          </li>
        ))}
      </ul>
      {[-1, 1].map((dir) => {
        const enabled = dir === -1 ? canPrev : canNext
        return (
          <button
            key={dir}
            type="button"
            onClick={() => scroll(dir as 1 | -1)}
            aria-label={dir === -1 ? t('Scroll {p0} left', { p0: label }) : t('Scroll {p0} right', { p0: label })}
            tabIndex={enabled ? 0 : -1}
            className={cn(
              'absolute top-[32%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-surface-2/90 text-fg shadow-pop backdrop-blur-md transition-[opacity,transform] duration-base hover:scale-105 lg:flex',
              dir === -1 ? '-left-3' : '-right-3',
              enabled ? 'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            {dir === -1 ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        )
      })}
    </div>
  )
}
