import { t } from '@/i18n'
import { AlertTriangle, PlugZap, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { lastProviderError } from '@/lib/diagnostics'
import { Button, ButtonLink } from './Button'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div className={cn('relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line-strong/70 bg-surface/40 px-6 text-center', compact ? 'py-10' : 'py-16 sm:py-20', className)}>
      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" aria-hidden />
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface-2 text-accent-soft shadow-card [&>svg]:h-7 [&>svg]:w-7">
        {icon}
      </div>
      <h3 className="relative text-lg font-semibold text-fg">{title}</h3>
      {description && <p className="relative mt-2 max-w-md text-sm leading-relaxed text-fg-muted">{description}</p>}
      {action && <div className="relative mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
  variant?: 'error' | 'no-api'
}

export function ErrorState({ title, description, onRetry, className, variant = 'error' }: ErrorStateProps) {
  const isApi = variant === 'no-api'
  const last = isApi ? null : lastProviderError()
  return (
    <EmptyState
      className={className}
      icon={isApi ? <PlugZap /> : <AlertTriangle />}
      title={title ?? (isApi ? t('No API configured') : t('Something went wrong.'))}
      description={
        description ??
        (isApi
          ? t('Set VITE_API_BASE_URL and register your AnimeProvider to load live data.')
          : t('Please try again. If the problem persists, check your connection or API configuration.'))
      }
      action={
        <div className="flex flex-col items-center gap-3">
          {last && (
            <p className="max-w-md break-words rounded-lg bg-surface-3 px-3 py-2 font-mono text-[11px] leading-relaxed text-fg-muted">
              {last.status ? `${last.status} · ` : ''}
              {last.message} — {last.url}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {onRetry && (
              <Button variant="secondary" onClick={onRetry} leftIcon={<RefreshCw className="h-4 w-4" />}>
                {t('Try again')}
              </Button>
            )}
            {!isApi && (
              <ButtonLink to="/status" variant="ghost">
                {t('Run diagnostics')}
              </ButtonLink>
            )}
          </div>
        </div>
      }
    />
  )
}
