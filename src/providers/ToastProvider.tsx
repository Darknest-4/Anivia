import { t as tr } from '@/i18n'
import { CheckCircle2, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

export type ToastVariant = 'success' | 'info' | 'error'

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  icon?: LucideIcon
  action?: { label: string; onClick: () => void }
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: number
}

const ToastContext = createContext<((t: ToastOptions) => void) | null>(null)

const variantIcon: Record<ToastVariant, LucideIcon> = { success: CheckCircle2, info: Info, error: TriangleAlert }
const variantColor: Record<ToastVariant, string> = { success: 'text-success', info: 'text-info', error: 'text-danger' }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = ++counter.current
      setToasts((t) => [...t.slice(-3), { ...opts, id }])
      window.setTimeout(() => dismiss(id), opts.duration ?? 3800)
    },
    [dismiss],
  )

  const value = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-atomic="false"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.75rem)] z-toast flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:right-6 lg:left-auto lg:items-end"
        >
          {toasts.map((t) => {
            const variant = t.variant ?? 'success'
            const Icon = t.icon ?? variantIcon[variant]
            return (
              <div
                key={t.id}
                role="status"
                className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl border border-line-strong/70 bg-surface-2/95 p-3.5 pr-2.5 shadow-pop backdrop-blur-xl"
              >
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', variantColor[variant])} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fg">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">{t.description}</p>}
                </div>
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action?.onClick()
                      dismiss(t.id)
                    }}
                    className="shrink-0 rounded-md px-2 py-1 text-[13px] font-semibold text-accent-soft hover:bg-surface-3"
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label={tr('Dismiss notification')}
                  className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-surface-3 hover:text-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
