import { t } from '@/i18n'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Bug, CheckCircle2, Clock, Database, Eye, Flag, Inbox, Search, ShieldCheck, Trash2, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, EmptyState, ErrorState, Input, Select, Skeleton, Switch, Tabs } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { formatNumber, formatRelative } from '@/lib/format'
import { getSupabase, useAuth } from '@/providers/AuthProvider'
import { usePlatform, type Permission, type Role } from '@/providers/PlatformProvider'
import { useToast } from '@/providers/ToastProvider'
import type { FeatureFlag } from '@/services/platform/flags'

type Tab = 'overview' | 'errors' | 'flags' | 'users' | 'inbox' | 'data'

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const client = await getSupabase()
  const { data, error } = await client.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

/** Staff dashboard: analytics, feature flags, roles, inbox and the anime data store. */
export default function AdminPage() {
  useDocumentMeta({ title: t('Admin'), noindex: true })
  const { status } = useAuth()
  const { can, role } = usePlatform()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'overview'

  if (status === 'loading') return <div className="container-app py-10"><Skeleton className="h-64 rounded-2xl" /></div>
  if (status !== 'signed-in') return <Navigate to="/login?redirect=/admin" replace />
  if (!can('admin.access'))
    return (
      <div className="container-app py-16">
        <EmptyState icon={<ShieldCheck />} title={t('Staff only')} description={t('Your account doesn’t have access to the admin area.')} />
      </div>
    )

  const items: { value: Tab; label: string; perm: Permission }[] = [
    { value: 'overview', label: t('Analytics'), perm: 'analytics.view' },
    { value: 'errors', label: t('Errors'), perm: 'analytics.view' },
    { value: 'flags', label: t('Feature flags'), perm: 'flags.manage' },
    { value: 'users', label: t('Users & roles'), perm: 'users.manage' },
    { value: 'inbox', label: t('Inbox'), perm: 'reports.manage' },
    { value: 'data', label: t('Anime data'), perm: 'cache.manage' },
  ]
  const visible = items.filter((i) => can(i.perm))
  const active = visible.some((i) => i.value === tab) ? tab : visible[0]?.value

  return (
    <div className="container-app pb-16">
      <PageHeader eyebrow={t('Staff area · signed in as {p0}', { p0: role })} title={t('Dashboard')} description={t('Visitors, features, people and data — all stored in Supabase.')} />
      <Tabs items={visible} value={active} onChange={(t) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true })} label={t('Admin sections')} idPrefix="admin" />
      <div className="mt-6">
        {active === 'overview' && <Overview />}
        {active === 'errors' && <ErrorsPanel />}
        {active === 'flags' && <Flags />}
        {active === 'users' && <UsersPanel />}
        {active === 'inbox' && <InboxPanel />}
        {active === 'data' && <DataPanel />}
      </div>
    </div>
  )
}

/* ─────────────────────────────── Analytics ─────────────────────────────── */

interface Overview {
  online_now: number
  visitors_today: number
  pageviews_today: number
  visitors_period: number
  pageviews_period: number
  avg_session_seconds: number
  avg_time_on_page_seconds: number
  signed_in_share: number
  total_users: number
  new_users_period: number
  daily: { day: string; visitors: number; pageviews: number }[]
  top_pages: { path: string; views: number; avg_seconds: number | null }[]
  top_anime: { anime_id: string; title: string | null; views: number; viewers: number }[]
  devices: { device: string; sessions: number }[]
  referrers: { source: string; sessions: number }[]
}

const duration = (s: number | null | undefined) => {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  return m ? `${m}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`
}

function Stat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold text-fg">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-fg">{title}</h2>
      {children}
    </section>
  )
}

function Overview() {
  const [days, setDays] = useState('14')
  const q = useQuery({ queryKey: ['admin', 'overview', days], queryFn: () => rpc<Overview>('analytics_overview', { p_days: Number(days) }), refetchInterval: 60_000 })
  if (q.isError) return <ErrorState title={t('Couldn’t load analytics')} description={(q.error as Error).message} onRetry={() => q.refetch()} />
  const d = q.data
  const max = Math.max(1, ...(d?.daily ?? []).map((x) => x.pageviews))
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select
          size="sm"
          aria-label={t('Period')}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          options={[
            { value: '1', label: t('Last 24 hours') },
            { value: '7', label: t('Last 7 days') },
            { value: '14', label: t('Last 14 days') },
            { value: '30', label: t('Last 30 days') },
            { value: '90', label: t('Last 90 days') },
          ]}
        />
      </div>
      {!d ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Activity />} label={t('Online now')} value={formatNumber(d.online_now)} hint={t('active in the last 5 minutes')} />
            <Stat icon={<Users />} label={t('Visitors today')} value={formatNumber(d.visitors_today)} hint={t('{p0} page views', { p0: formatNumber(d.pageviews_today) })} />
            <Stat icon={<Eye />} label={t('Visitors (period)')} value={formatNumber(d.visitors_period)} hint={t('{p0} page views', { p0: formatNumber(d.pageviews_period) })} />
            <Stat icon={<Clock />} label={t('Avg. time on page')} value={duration(d.avg_time_on_page_seconds)} hint={t('avg. visit {p0}', { p0: duration(d.avg_session_seconds) })} />
            <Stat icon={<ShieldCheck />} label={t('Accounts')} value={formatNumber(d.total_users)} hint={t('+{p0} in this period', { p0: formatNumber(d.new_users_period) })} />
            <Stat icon={<Users />} label={t('Signed-in visits')} value={`${d.signed_in_share}%`} />
          </div>
          <Panel title={t('Daily traffic')}>
            {d.daily.length === 0 ? (
              <p className="text-sm text-fg-subtle">{t('No data yet.')}</p>
            ) : (
              <>
                <div className="flex h-40 items-end gap-1" role="img" aria-label={`Page views per day, peak ${formatNumber(max)}`}>
                  {d.daily.map((x) => (
                    // h-full gives the bars a definite height to size their percentages against.
                    <div key={x.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${x.day}: ${x.visitors} visitors · ${x.pageviews} views`}>
                      <div className="relative w-full overflow-hidden rounded-t bg-accent/35 transition-colors group-hover:bg-accent/50" style={{ height: `${Math.max(2, (x.pageviews / max) * 100)}%` }}>
                        <div className="absolute inset-x-0 bottom-0 bg-accent" style={{ height: `${x.pageviews ? Math.min(100, (x.visitors / x.pageviews) * 100) : 0}%` }} />
                      </div>
                      <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-surface-3 px-2 py-1 text-2xs text-fg shadow group-hover:block">
                        {x.day}: {x.visitors} visitors · {x.pageviews} views
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-2xs text-fg-subtle">
                  <span>{d.daily[0].day}</span>
                  <span className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-accent" /> visitors
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-accent/35" /> page views
                    </span>
                  </span>
                  <span>{d.daily[d.daily.length - 1].day}</span>
                </div>
              </>
            )}
          </Panel>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title={t('Top pages')}>
              <Table head={['Page', 'Views', 'Avg. time']} rows={d.top_pages.map((p) => [<code key="p" className="text-xs">{p.path}</code>, formatNumber(p.views), duration(p.avg_seconds)])} />
            </Panel>
            <Panel title={t('Most viewed anime')}>
              <Table
                head={['Anime', 'Views', 'Visitors']}
                rows={d.top_anime.map((a) => [
                  <Link key="a" to={`/anime/${a.anime_id}`} className="hover:text-accent-soft">
                    {a.title || `#${a.anime_id}`}
                  </Link>,
                  formatNumber(a.views),
                  formatNumber(a.viewers),
                ])}
              />
            </Panel>
            <Panel title={t('Devices')}>
              <Table head={['Device', 'Visits']} rows={d.devices.map((x) => [x.device, formatNumber(x.sessions)])} />
            </Panel>
            <Panel title={t('Traffic sources')}>
              <Table head={['Source', 'Visits']} rows={d.referrers.map((x) => [x.source, formatNumber(x.sessions)])} />
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return <p className="text-sm text-fg-subtle">{t('No data yet.')}</p>
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-fg-subtle">
            {head.map((h, i) => (
              <th key={h} className={`px-1 pb-2 font-semibold ${i ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`px-1 py-2 ${j ? 'whitespace-nowrap text-right tabular-nums text-fg-muted' : 'max-w-[16rem] truncate text-fg'}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────────── Feature flags ─────────────────────────────── */

function Flags() {
  const { flags, refreshFlags } = usePlatform()
  const toast = useToast()
  const save = useMutation({
    mutationFn: async (f: Partial<FeatureFlag> & { key: string }) => {
      const client = await getSupabase()
      const { error } = await client.from('feature_flags').update(f).eq('key', f.key)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => refreshFlags(),
    onError: (e: Error) => toast({ title: t('Couldn’t save the flag'), description: e.message, variant: 'error' }),
  })
  if (!flags.length) return <EmptyState icon={<Flag />} title={t('No flags found')} description={t('Run supabase/migrations/0003_anivia_platform.sql to create them.')} />
  return (
    <ul className="space-y-3">
      {flags.map((f) => (
        <FlagRow key={f.key} flag={f} onSave={(patch) => save.mutate({ key: f.key, ...patch })} />
      ))}
    </ul>
  )
}

function FlagRow({ flag, onSave }: { flag: FeatureFlag; onSave: (patch: Partial<FeatureFlag>) => void }) {
  const [payload, setPayload] = useState(() => JSON.stringify(flag.payload ?? {}, null, 0))
  const [rollout, setRollout] = useState(String(flag.rollout))
  const payloadKeys = Object.keys(flag.payload ?? {})
  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-mono text-sm font-semibold text-fg">
            {flag.key}
            <Badge variant={flag.enabled ? 'success' : 'default'}>{flag.enabled ? 'on' : 'off'}</Badge>
          </p>
          <p className="mt-1 text-[13px] text-fg-subtle">{flag.description}</p>
          {flag.updated_at && <p className="mt-1 text-2xs text-fg-subtle">updated {formatRelative(flag.updated_at)}</p>}
        </div>
        <Switch label={t('Toggle {p0}', { p0: flag.key })} hideLabel checked={flag.enabled} onChange={(v) => onSave({ enabled: v })} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_8rem_minmax(0,1fr)]">
        <Select
          size="sm"
          aria-label={t('Audience')}
          value={flag.audience}
          onChange={(e) => onSave({ audience: e.target.value as FeatureFlag['audience'] })}
          options={[
            { value: 'all', label: t('Everyone') },
            { value: 'signed_in', label: t('Signed-in users') },
            { value: 'staff', label: t('Staff only') },
          ]}
        />
        <Input
          aria-label={t('Rollout percentage')}
          type="number"
          min={0}
          max={100}
          value={rollout}
          onChange={(e) => setRollout(e.target.value)}
          onBlur={() => Number(rollout) !== flag.rollout && onSave({ rollout: Math.min(100, Math.max(0, Math.round(Number(rollout) || 0))) })}
          rightSlot={<span className="pr-3 text-xs text-fg-subtle">%</span>}
        />
        {payloadKeys.length > 0 && (
          <Input
            aria-label={t('Payload (JSON)')}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            onBlur={() => {
              try {
                const next = JSON.parse(payload) as Record<string, unknown>
                if (JSON.stringify(next) !== JSON.stringify(flag.payload)) onSave({ payload: next })
              } catch {
                setPayload(JSON.stringify(flag.payload ?? {}))
              }
            }}
            className="font-mono text-xs"
          />
        )}
      </div>
    </li>
  )
}

/* ─────────────────────────────── Users & roles ─────────────────────────────── */

interface AdminUser {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
  role: Role
  display_name: string | null
  username: string | null
  anilist_name: string | null
}

function UsersPanel() {
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const client = useQueryClient()
  const toast = useToast()
  const { session } = useAuth()
  const q = useQuery({ queryKey: ['admin', 'users', term], queryFn: () => rpc<AdminUser[]>('admin_list_users', { p_search: term, p_limit: 100 }) })
  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => rpc('admin_set_role', { p_user: id, p_role: role }),
    onSuccess: () => {
      toast({ title: t('Role updated') })
      void client.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (e: Error) => toast({ title: t('Couldn’t change the role'), description: e.message, variant: 'error' }),
  })
  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setTerm(search.trim())
        }}
        className="flex max-w-md gap-2"
      >
        <Input aria-label={t('Search users')} placeholder={t('Email, name or username')} value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
        <Button type="submit" variant="secondary">
          {t('Search')}
        </Button>
      </form>
      {q.isError ? (
        <ErrorState title={t('Couldn’t load users')} description={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">{t('User')}</th>
                <th className="px-4 py-3 font-semibold">{t('AniList')}</th>
                <th className="px-4 py-3 font-semibold">{t('Joined')}</th>
                <th className="px-4 py-3 font-semibold">{t('Last sign-in')}</th>
                <th className="px-4 py-3 font-semibold">{t('Role')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {q.data.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-fg">{u.display_name ?? '—'}</p>
                    <p className="text-xs text-fg-subtle">
                      {u.email}
                      {u.username && (
                        <>
                          {' · '}
                          <Link to={`/u/${u.username}`} className="hover:text-fg">
                            @{u.username}
                          </Link>
                        </>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{u.anilist_name ?? '—'}</td>
                  <td className="px-4 py-3 text-fg-muted">{formatRelative(u.created_at)}</td>
                  <td className="px-4 py-3 text-fg-muted">{u.last_sign_in_at ? formatRelative(u.last_sign_in_at) : '—'}</td>
                  <td className="px-4 py-3">
                    <Select
                      size="sm"
                      aria-label={t('Role of {p0}', { p0: u.email ?? u.id })}
                      value={u.role}
                      disabled={u.id === session?.user.id || setRole.isPending}
                      onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value as Role })}
                      options={[
                        { value: 'user', label: t('User') },
                        { value: 'moderator', label: t('Moderator') },
                        { value: 'admin', label: t('Admin') },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {q.data.length === 0 && <p className="p-6 text-center text-sm text-fg-subtle">{t('No users found.')}</p>}
        </div>
      )}
      <p className="text-xs text-fg-subtle">{t('Moderators can see analytics and handle the inbox. Admins can also manage flags, roles and the data cache.')}</p>
    </div>
  )
}

/* ─────────────────────────────── Inbox ─────────────────────────────── */

interface Message {
  id: number
  created_at: string
  name: string
  email: string
  topic: string
  message: string
  status: 'new' | 'read' | 'done'
}
interface Report {
  id: number
  created_at: string
  subject: string
  page_url: string | null
  reason: string
  details: string
  status: 'new' | 'triaged' | 'resolved'
}

function InboxPanel() {
  const [kind, setKind] = useState<'messages' | 'reports'>('messages')
  const client = useQueryClient()
  const table = kind === 'messages' ? 'contact_messages' : 'reports'
  const q = useQuery({
    queryKey: ['admin', 'inbox', kind],
    queryFn: async () => {
      const c = await getSupabase()
      const { data, error } = await c.from(table).select('*').order('created_at', { ascending: false }).limit(100)
      if (error) throw new Error(error.message)
      return data as (Message | Report)[]
    },
  })
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const c = await getSupabase()
      const { error } = await c.from(table).update({ status }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'inbox', kind] }),
  })
  const statuses = kind === 'messages' ? ['new', 'read', 'done'] : ['new', 'triaged', 'resolved']
  return (
    <div className="space-y-4">
      <Tabs
        variant="segmented"
        size="sm"
        items={[
          { value: 'messages', label: t('Contact messages') },
          { value: 'reports', label: t('Reports') },
        ]}
        value={kind}
        onChange={setKind}
        label={t('Inbox type')}
        idPrefix="inbox"
      />
      {q.isError ? (
        <ErrorState title={t('Couldn’t load the inbox')} description={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : q.data.length === 0 ? (
        <EmptyState icon={<Inbox />} title={t('Inbox zero')} description={t('Nothing here yet.')} />
      ) : (
        <ul className="space-y-3">
          {q.data.map((m) => (
            <li key={m.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {'email' in m ? (
                    <p className="text-sm font-semibold text-fg">
                      {m.name} · <a href={`mailto:${m.email}`} className="font-normal text-accent-soft hover:underline">{m.email}</a> <Badge>{m.topic}</Badge>
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-fg">
                      {m.subject} <Badge variant="warning">{m.reason}</Badge>
                    </p>
                  )}
                  <p className="text-xs text-fg-subtle">{formatRelative(m.created_at)}</p>
                </div>
                <Select size="sm" aria-label={t('Status')} value={m.status} onChange={(e) => update.mutate({ id: m.id, status: e.target.value })} options={statuses.map((s) => ({ value: s, label: s }))} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-fg-muted">{'message' in m ? m.message : m.details || '—'}</p>
              {'page_url' in m && m.page_url && (
                <a href={m.page_url} className="mt-2 inline-block text-xs text-accent-soft hover:underline">
                  {m.page_url}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ─────────────────────────────── Anime data ─────────────────────────────── */

interface CacheStats {
  cached_responses: number
  expired_responses: number
  catalog_titles: number
  catalog_updated: string | null
}

function DataPanel() {
  const toast = useToast()
  const q = useQuery({ queryKey: ['admin', 'cache'], queryFn: () => rpc<CacheStats>('admin_cache_stats') })
  const clear = useMutation({
    mutationFn: () => rpc('admin_clear_cache'),
    onSuccess: () => {
      toast({ title: t('Cache cleared'), description: t('Fresh data will be fetched from AniList.') })
      void q.refetch()
    },
  })
  if (q.isError) return <ErrorState title={t('Couldn’t load cache stats')} description={(q.error as Error).message} onRetry={() => q.refetch()} />
  const d = q.data
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={<Database />} label={t('Titles in database')} value={d ? formatNumber(d.catalog_titles) : '…'} hint={d?.catalog_updated ? t('last update {p0}', { p0: formatRelative(d.catalog_updated) }) : 'filled by the anilist-proxy function'} />
        <Stat icon={<Database />} label={t('Cached responses')} value={d ? formatNumber(d.cached_responses) : '…'} hint={d ? t('{p0} expired', { p0: formatNumber(d.expired_responses) }) : undefined} />
        <div className="flex items-center rounded-2xl border border-line bg-surface p-4">
          <Button variant="secondary" leftIcon={<Trash2 className="h-4 w-4" />} loading={clear.isPending} onClick={() => clear.mutate()}>
            {t('Clear response cache')}
          </Button>
        </div>
      </div>
      <p className="text-sm text-fg-muted">
        Anime data is fetched through the <code>{t('anilist-proxy')}</code>{' '}{t('Edge Function, cached in')}{' '}<code>{t('api_cache')}</code> and every title is stored in{' '}
        <code>{t('anime_catalog')}</code>{t('. Episode titles and artwork come from ani.zip. See')}{' '}<Link to="/status" className="text-accent-soft hover:underline">{t('/status')}</Link> for live checks.
      </p>
    </div>
  )
}

/* ─────────────────────────────── Errors ─────────────────────────────── */

interface ErrorRow {
  id: number
  message: string
  stack: string | null
  url: string | null
  user_agent: string | null
  release: string | null
  count: number
  first_seen: string
  last_seen: string
  resolved: boolean
}

function ErrorsPanel() {
  const client = useQueryClient()
  const [showResolved, setShowResolved] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const q = useQuery({
    queryKey: ['admin', 'errors', showResolved],
    queryFn: async () => {
      const c = await getSupabase()
      let req = c.from('error_logs').select('*').order('last_seen', { ascending: false }).limit(100)
      if (!showResolved) req = req.eq('resolved', false)
      const { data, error } = await req
      if (error) throw new Error(/does not exist|schema cache/.test(error.message) ? t('Run supabase/migrations/0006_anivia_community.sql first.') : error.message)
      return data as ErrorRow[]
    },
    refetchInterval: 60_000,
  })
  const act = useMutation({
    mutationFn: async (v: { id: number; op: 'resolve' | 'delete' }) => {
      const c = await getSupabase()
      const { error } = v.op === 'resolve' ? await c.from('error_logs').update({ resolved: true }).eq('id', v.id) : await c.from('error_logs').delete().eq('id', v.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'errors'] }),
  })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">{t('Errors that happened in visitors’ browsers. Identical errors are grouped and counted.')}</p>
        <Switch label={t('Show resolved')} checked={showResolved} onChange={setShowResolved} />
      </div>
      {q.isError ? (
        <ErrorState title={t('Couldn’t load errors')} description={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : q.data.length === 0 ? (
        <EmptyState icon={<CheckCircle2 />} title={t('No errors')} description={t('Nothing has gone wrong in anyone’s browser. 🎉')} />
      ) : (
        <ul className="space-y-3">
          {q.data.map((e) => (
            <li key={e.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" onClick={() => setOpen(open === e.id ? null : e.id)} className="min-w-0 flex-1 text-left">
                  <p className="flex items-start gap-2 break-words font-mono text-sm text-fg">
                    <Bug className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    {e.message}
                  </p>
                  <p className="mt-1 text-xs text-fg-subtle">
                    {e.count}× · last {formatRelative(e.last_seen)} · first {formatRelative(e.first_seen)} · {e.url}
                  </p>
                </button>
                <div className="flex gap-1">
                  {!e.resolved && (
                    <Button size="sm" variant="secondary" onClick={() => act.mutate({ id: e.id, op: 'resolve' })}>
                      {t('Resolve')}
                    </Button>
                  )}
                  <Button size="icon-sm" variant="ghost" aria-label={t('Delete')} onClick={() => act.mutate({ id: e.id, op: 'delete' })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {open === e.id && (
                <div className="mt-3 space-y-2 text-xs text-fg-muted">
                  <p>
                    <strong className="text-fg">{t('Browser:')}</strong> {e.user_agent}
                  </p>
                  <p>
                    <strong className="text-fg">{t('Release:')}</strong> {e.release}
                  </p>
                  {e.stack && <pre className="max-h-64 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-2xs leading-relaxed">{e.stack}</pre>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
