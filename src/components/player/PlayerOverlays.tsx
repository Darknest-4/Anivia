import { t } from '@/i18n'
import { AlertTriangle, Loader2, PlugZap, RotateCcw, SkipForward } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function LoadingOverlay({ label = 'Loading episode…' }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60" role="status">
      <Loader2 className="h-10 w-10 animate-spin text-white/90" aria-hidden />
      <p className="text-sm font-medium text-white/80">{label}</p>
    </div>
  )
}

export function BufferingIndicator() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status" aria-label={t('Buffering')}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </span>
    </div>
  )
}

function Panel({ icon, title, body, children, tone = 'accent' }: { icon: React.ReactNode; title: string; body: string; children?: React.ReactNode; tone?: 'accent' | 'danger' }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/75 p-6 text-center backdrop-blur-sm">
      <div className="max-w-sm">
        <span className={cn('mx-auto flex h-14 w-14 items-center justify-center rounded-2xl', tone === 'danger' ? 'bg-danger/20 text-danger' : 'bg-accent/20 text-accent-soft')}>{icon}</span>
        <p className="mt-4 text-base font-semibold text-white sm:text-lg">{title}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/70 sm:text-sm">{body}</p>
        {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    </div>
  )
}

export function NoSourceOverlay({ locked }: { locked?: boolean }) {
  return (
    <Panel
      icon={<PlugZap className="h-7 w-7" />}
      title={locked ? t('This episode hasn’t aired yet') : t('Connect your video provider to start playback.')}
      body={
        locked
          ? t('It will become available after its scheduled broadcast. Add the series to your watchlist to get a reminder.')
          : t('No playable source was returned for this episode. Implement the VideoProvider interface with your own licensed media backend.')
      }
    >
      <Link to="/about#api" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90">
        {t('Integration guide')}
      </Link>
    </Panel>
  )
}

export function ErrorOverlay({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <Panel tone="danger" icon={<AlertTriangle className="h-7 w-7" />} title={t('Playback error')} body={message ?? 'Something went wrong while loading this episode. Please try again.'}>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90">
        <RotateCcw className="h-4 w-4" />
        {t('Try again')}
      </button>
    </Panel>
  )
}

interface FinishedProps {
  onReplay: () => void
  next?: { title: string; number: number; thumbnail: string; href: string }
  countdown: number | null
  onCancel: () => void
}

export function FinishedOverlay({ onReplay, next, countdown, onCancel }: FinishedProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        {next ? (
          <>
            <p className="eyebrow text-white/60">{countdown !== null ? t('Up next in {p0}s', { p0: countdown }) : t('Up next')}</p>
            <Link to={next.href} className="group flex w-full items-center gap-3 rounded-xl bg-white/10 p-2 text-left ring-1 ring-white/15 hover:bg-white/15">
              <img src={next.thumbnail} alt="" className="aspect-video w-28 rounded-lg object-cover sm:w-36" />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-accent-soft">{t('Episode {p0}', { p0: next.number })}</span>
                <span className="line-clamp-2 block text-sm font-semibold text-white">{next.title}</span>
              </span>
              <SkipForward className="ml-auto mr-2 h-5 w-5 shrink-0 text-white" />
            </Link>
            <div className="flex gap-2">
              <button type="button" onClick={onReplay} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
                <RotateCcw className="h-4 w-4" />
                {t('Replay')}
              </button>
              {countdown !== null && (
                <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
                  {t('Cancel autoplay')}
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-white">{t('You’re all caught up')}</p>
            <p className="text-sm text-white/70">{t('That was the latest available episode.')}</p>
            <button type="button" onClick={onReplay} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black">
              <RotateCcw className="h-4 w-4" />
              {t('Watch again')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
