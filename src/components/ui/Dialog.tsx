import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap, useScrollLock } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/cn'

interface OverlayProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  labelledBy?: string
  label?: string
  className?: string
  /** Visual placement of the panel. */
  placement: 'center' | 'right' | 'left' | 'bottom' | 'top'
}

const panelPlacement: Record<OverlayProps['placement'], string> = {
  center: 'm-auto w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] rounded-2xl animate-scale-in',
  right: 'ml-auto h-full w-[min(420px,100%)] rounded-l-2xl animate-slide-left',
  left: 'mr-auto h-full w-[min(340px,88%)] rounded-r-2xl animate-slide-right',
  bottom: 'mt-auto w-full max-h-[88dvh] rounded-t-2xl animate-slide-up pb-[env(safe-area-inset-bottom)]',
  top: 'mx-auto mt-[8vh] w-[calc(100%-2rem)] max-h-[80dvh] rounded-2xl animate-scale-in',
}

/** Shared accessible modal surface: portal, backdrop, focus trap, Esc to close, scroll lock. */
function Overlay({ open, onClose, children, labelledBy, label, className, placement }: OverlayProps) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, open)
  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-modal flex">
      <div className="absolute inset-0 animate-fade-in bg-black/65 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
        className={cn('relative flex flex-col overflow-hidden border border-line bg-surface shadow-pop focus:outline-none', panelPlacement[placement], className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
}

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Dialog({ open, onClose, title, description, children, footer, size = 'md', icon }: DialogProps) {
  const titleId = useId()
  return (
    <Overlay open={open} onClose={onClose} labelledBy={titleId} placement="center" className={sizes[size]}>
      <div className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
        {icon && <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent-soft">{icon}</div>}
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-lg font-semibold text-fg">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close dialog" className="-mr-1.5 rounded-lg p-2 text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg">
          <X className="h-5 w-5" />
        </button>
      </div>
      {children && <div className="scrollbar-thin overflow-y-auto px-5 py-5 sm:px-6">{children}</div>}
      {footer && <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-2/50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
    </Overlay>
  )
}

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  side?: 'right' | 'left' | 'bottom'
  children: ReactNode
  footer?: ReactNode
  className?: string
  hideHeader?: boolean
}

export function Drawer({ open, onClose, title, side = 'right', children, footer, className, hideHeader }: DrawerProps) {
  const titleId = useId()
  return (
    <Overlay open={open} onClose={onClose} labelledBy={titleId} placement={side} className={className}>
      {side === 'bottom' && <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden />}
      <div className={cn('flex shrink-0 items-center justify-between gap-3 px-5 py-4', hideHeader && 'sr-only')}>
        <h2 id={titleId} className="text-base font-semibold text-fg">
          {title}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close panel" className="-mr-1.5 rounded-lg p-2 text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="shrink-0 border-t border-line px-5 py-4">{footer}</div>}
    </Overlay>
  )
}

export { Overlay }
