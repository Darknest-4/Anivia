import { t } from '@/i18n'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Clock, Database, Film, Pause, Play, RefreshCw, RotateCcw, Zap } from 'lucide-react'
import { Badge, Button, ErrorState, Progress, Skeleton } from '@/components/ui'
import { formatNumber, formatRelative } from '@/lib/format'
import { useToast } from '@/providers/ToastProvider'
import { Panel, rpc, Stat } from './parts'

type JobStatus = 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED'

export interface SyncStatus {
  job: {
    id: number
    job_type: 'anizip_full' | 'anizip_incremental'
    status: JobStatus
    phase: 'seed' | 'fetch'
    total: number
    processed: number
    imported: number
    updated: number
    unchanged: number
    skipped: number
    failed: number
    episodes_imported: number
    retry_count: number
    current_item: string | null
    last_error: string | null
    errors: { key: string; error: string; at: string }[]
    rate_limited_until: string | null
    started_at: string | null
    updated_at: string
    completed_at: string | null
  } | null
  worker_active: boolean
  initial_sync_completed: boolean
  enabled: boolean
  items: { total: number; pending: number; done: number; skipped: number; failed: number }
  anime: number
  episodes: number
  per_minute: number
  eta_minutes: number | null
  failed_items: { key: string; attempts: number; last_error: string | null; synced_at: string | null }[]
  worker_calls?: { created: string; status_code: number | null; content: string; error_msg: string | null }[] | null
  cron_runs?: { start_time: string; status: string; message: string }[] | null
  schedule_exists?: boolean
}

/** Plain-language reason for the worker's last answer. */
function diagnose(d: SyncStatus): string | null {
  const last = d.worker_calls?.[0]
  if (d.schedule_exists === false) return t('The schedule (pg_cron) is missing — run the 0008 SQL again.')
  if (!last) return d.job?.status === 'PENDING' ? t('No answer from the worker yet. Check that the anizip-sync function is deployed (with Verify JWT off).') : null
  if (/Requested function was not found/i.test(last.content) || last.status_code === 404) return t('The anizip-sync Edge Function is not deployed (404).')
  if (last.status_code === 401) return t('Verify JWT is still on for anizip-sync — turn it off.')
  if (last.status_code === 403) return t('The worker rejected the call (secret mismatch). Deploy the latest anizip-sync code.')
  if (last.error_msg) return t('The call did not reach the worker: {p0}', { p0: last.error_msg })
  if ((last.status_code ?? 0) >= 500) return t('The worker reported an error — see below.')
  return null
}

const STATUS_VARIANT: Record<JobStatus, 'accent' | 'success' | 'warning' | 'danger' | 'default'> = {
  RUNNING: 'accent',
  PENDING: 'default',
  PAUSED: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
}

function formatEta(minutes: number) {
  if (minutes < 60) return t('{p0} min', { p0: minutes })
  const h = Math.floor(minutes / 60)
  return `${h}${t('h')} ${minutes % 60}${t('m')}`
}

/** Admin → AniZip sync: progress of the background import (migration 0008, Edge Function anizip-sync). */
export function SyncPanel() {
  const toast = useToast()
  const q = useQuery({
    queryKey: ['admin', 'anizip-sync'],
    queryFn: () => rpc<SyncStatus>('admin_anizip_sync_status'),
    refetchInterval: (query) => (query.state.data?.job && ['RUNNING', 'PENDING'].includes(query.state.data.job.status) ? 5000 : 30_000),
  })
  const action = useMutation({
    mutationFn: (a: 'start' | 'incremental' | 'pause' | 'resume' | 'retry') => rpc<SyncStatus>('admin_anizip_sync_action', { p_action: a }),
    onSuccess: (data) => {
      q.refetch()
      toast({ title: t('Sync updated'), description: data.job ? t('Status: {p0}', { p0: data.job.status }) : undefined })
    },
    onError: (e) => toast({ title: t('Couldn’t update the sync'), description: (e as Error).message, variant: 'error' }),
  })

  if (q.isError) {
    const msg = (q.error as Error).message
    return (
      <ErrorState
        title={t('Couldn’t load the sync status')}
        description={/does not exist|schema cache/.test(msg) ? t('Run supabase/migrations/0008_anivia_anizip_sync.sql first.') : msg}
        onRetry={() => q.refetch()}
      />
    )
  }
  if (!q.data) return <Skeleton className="h-72 rounded-2xl" />

  const d = q.data
  const job = d.job
  const active = job && ['PENDING', 'RUNNING', 'PAUSED'].includes(job.status)
  const total = job?.job_type === 'anizip_full' ? d.items.total : job?.total ?? 0
  const remaining = d.items.pending
  const progress = total > 0 ? Math.min(1, Math.max(0, (total - remaining) / total)) : job?.status === 'COMPLETED' ? 1 : 0
  const rateLimited = job?.rate_limited_until && new Date(job.rate_limited_until).getTime() > Date.now()

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{t('AniZip sync')}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {job ? <Badge variant={STATUS_VARIANT[job.status]}>{job.status}</Badge> : <Badge>{t('Not started')}</Badge>}
              {job && <span className="text-sm text-fg-muted">{job.job_type === 'anizip_full' ? t('Full import') : t('Incremental sync')}</span>}
              {job?.status === 'RUNNING' && job.phase === 'seed' && <span className="text-sm text-fg-muted">· {t('loading the title list…')}</span>}
              {!d.enabled && <Badge variant="warning">{t('Turned off (flag anizip_sync)')}</Badge>}
              {rateLimited && <Badge variant="warning">{t('Rate limited — waiting')}</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!active && (
              <>
                <Button size="sm" leftIcon={<Play className="h-4 w-4" />} loading={action.isPending && action.variables === 'start'} onClick={() => action.mutate('start')}>
                  {d.initial_sync_completed ? t('Import missing titles') : t('Start full import')}
                </Button>
                {d.initial_sync_completed && (
                  <Button size="sm" variant="secondary" leftIcon={<Zap className="h-4 w-4" />} loading={action.isPending && action.variables === 'incremental'} onClick={() => action.mutate('incremental')}>
                    {t('Run incremental sync')}
                  </Button>
                )}
              </>
            )}
            {job && ['PENDING', 'RUNNING'].includes(job.status) && (
              <Button size="sm" variant="secondary" leftIcon={<Pause className="h-4 w-4" />} loading={action.isPending && action.variables === 'pause'} onClick={() => action.mutate('pause')}>
                {t('Pause')}
              </Button>
            )}
            {job?.status === 'PAUSED' && (
              <Button size="sm" leftIcon={<Play className="h-4 w-4" />} loading={action.isPending && action.variables === 'resume'} onClick={() => action.mutate('resume')}>
                {t('Resume')}
              </Button>
            )}
            {d.items.failed > 0 && (
              <Button size="sm" variant="secondary" leftIcon={<RotateCcw className="h-4 w-4" />} loading={action.isPending && action.variables === 'retry'} onClick={() => action.mutate('retry')}>
                {t('Retry failed ({p0})', { p0: formatNumber(d.items.failed) })}
              </Button>
            )}
            <Button size="icon-sm" variant="ghost" aria-label={t('Refresh')} onClick={() => q.refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-2xl font-bold text-fg">
              {formatNumber(Math.max(0, total - remaining))} <span className="text-base font-medium text-fg-muted">/ {formatNumber(total)} {t('titles')}</span>
            </p>
            <p className="font-display text-xl font-bold text-fg">{(progress * 100).toFixed(1)}%</p>
          </div>
          <Progress value={progress} size="md" className="mt-2" label={t('Sync progress')} />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-fg-muted">
            {job?.current_item && (
              <span>
                {t('Current:')} <span className="font-semibold text-fg">{job.current_item}</span>
              </span>
            )}
            {job && <span>{t('Last update {p0}', { p0: formatRelative(job.updated_at) })}</span>}
            {d.per_minute > 0 && <span>{t('{p0} titles / min', { p0: d.per_minute })}</span>}
            {active && d.eta_minutes !== null && <span>{t('ETA ~{p0}', { p0: formatEta(d.eta_minutes) })}</span>}
            <span className="inline-flex items-center gap-1">
              <span className={d.worker_active ? 'h-2 w-2 rounded-full bg-success' : 'h-2 w-2 rounded-full bg-fg-subtle'} />
              {d.worker_active ? t('Worker running now') : t('Worker idle — runs every minute')}
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Database />} label={t('Anime in database')} value={formatNumber(d.anime)} />
        <Stat icon={<Film />} label={t('Episodes in database')} value={formatNumber(d.episodes)} hint={job ? t('+{p0} in this run', { p0: formatNumber(job.episodes_imported) }) : undefined} />
        <Stat icon={<CheckCircle2 />} label={t('Imported / updated')} value={job ? `${formatNumber(job.imported)} / ${formatNumber(job.updated)}` : '—'} hint={job ? t('{p0} unchanged', { p0: formatNumber(job.unchanged) }) : undefined} />
        <Stat icon={<AlertTriangle />} label={t('Skipped / failed')} value={`${formatNumber(d.items.skipped)} / ${formatNumber(d.items.failed)}`} hint={job ? t('{p0} retries in this run', { p0: formatNumber(job.retry_count) }) : undefined} />
      </div>

      {(diagnose(d) || (d.worker_calls?.length ?? 0) > 0) && (
        <Panel title={t('Worker diagnostics')}>
          {diagnose(d) && <p className="mb-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">{diagnose(d)}</p>}
          <ul className="space-y-1.5 text-xs">
            {(d.worker_calls ?? []).map((c, i) => (
              <li key={i} className="flex flex-wrap gap-x-3 rounded-lg bg-surface-2 px-3 py-2">
                <code className={(c.status_code ?? 0) >= 400 || c.error_msg ? 'font-semibold text-danger' : 'font-semibold text-success'}>{c.status_code ?? '—'}</code>
                <span className="min-w-0 flex-1 break-all text-fg-muted">{c.error_msg || c.content}</span>
                <span className="text-fg-subtle">{formatRelative(c.created)}</span>
              </li>
            ))}
            {(d.cron_runs ?? []).slice(0, 1).map((c, i) => (
              <li key={`c${i}`} className="text-fg-subtle">
                {t('Scheduler: {p0} ({p1})', { p0: c.status, p1: formatRelative(c.start_time) })}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {(job?.errors?.length ?? 0) > 0 && (
        <Panel title={t('Recent errors')}>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto text-xs">
            {[...job!.errors].reverse().map((e, i) => (
              <li key={i} className="flex flex-wrap gap-x-3 rounded-lg bg-surface-2 px-3 py-2">
                <code className="font-semibold text-fg">{e.key}</code>
                <span className="min-w-0 flex-1 break-words text-danger">{e.error}</span>
                <span className="text-fg-subtle">{formatRelative(e.at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {d.failed_items.length > 0 && (
        <Panel title={t('Failed titles')}>
          <ul className="space-y-1.5 text-xs">
            {d.failed_items.map((f) => (
              <li key={f.key} className="flex flex-wrap gap-x-3 rounded-lg bg-surface-2 px-3 py-2">
                <code className="font-semibold text-fg">{f.key}</code>
                <span className="min-w-0 flex-1 break-words text-fg-muted">{f.last_error}</span>
                <span className="text-fg-subtle">{t('{p0} attempts', { p0: f.attempts })}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <p className="flex items-start gap-2 text-sm text-fg-muted">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        {t('Runs in the background on Supabase (pg_cron → anizip-sync Edge Function, every minute). Progress is saved after every batch, so redeploys never restart it. After the first full import an incremental sync runs daily (airing titles, new titles, oldest data).')}
      </p>
    </div>
  )
}
