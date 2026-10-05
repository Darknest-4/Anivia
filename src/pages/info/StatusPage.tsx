import { CheckCircle2, Copy, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui'
import { config } from '@/config'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { lastProviderError } from '@/lib/diagnostics'
import { useToast } from '@/providers/ToastProvider'
import { activeDataSource, animeProvider, providerName } from '@/services/anime'

interface Check {
  id: string
  label: string
  run: () => Promise<string>
}

type Result = { state: 'pending' | 'ok' | 'fail' | 'skip'; detail: string; ms?: number }

async function timedFetch(url: string, init?: RequestInit) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 15_000)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

const describe = async (res: Response) => {
  const text = await res.text()
  return `HTTP ${res.status} ${res.headers.get('content-type') ?? ''} — ${text.slice(0, 160).replace(/\s+/g, ' ')}`
}

const SIMPLE = JSON.stringify({ query: '{ Page(perPage: 1) { media(type: ANIME, sort: TRENDING_DESC) { id title { romaji } } } }' })

const CHECKS: Check[] = [
  {
    id: 'anilist',
    label: 'AniList API (direct)',
    run: async () => {
      const res = await timedFetch(config.anilistUrl, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: SIMPLE })
      if (!res.ok) throw new Error(await describe(res))
      const j = (await res.json()) as { data?: { Page: { media: { title: { romaji: string } }[] } } }
      return `OK — ${j.data?.Page.media[0]?.title.romaji ?? 'no data'} · rate limit left: ${res.headers.get('x-ratelimit-remaining') ?? '?'}`
    },
  },
  {
    id: 'proxy-health',
    label: 'Edge cache (Worker /api/anilist/health)',
    run: async () => {
      if (!config.anilistProxy) return 'SKIP — disabled in this build'
      const res = await timedFetch(`${config.anilistProxy}/health`)
      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('json')) throw new Error(`Worker not deployed (got ${ct || 'no content-type'}) — the app falls back to AniList directly`)
      return `OK — ${await res.text()}`
    },
  },
  {
    id: 'proxy',
    label: 'Edge cache → AniList',
    run: async () => {
      if (!config.anilistProxy) return 'SKIP — disabled in this build'
      const res = await timedFetch(config.anilistProxy, { method: 'POST', headers: { 'content-type': 'application/json' }, body: SIMPLE })
      if (!res.ok) throw new Error(await describe(res))
      return `OK — cache ${res.headers.get('x-anivia-cache') ?? '?'}`
    },
  },
  {
    id: 'provider',
    label: `App data (${providerName}): trending list`,
    run: async () => `OK — ${(await animeProvider.getTrending()).length} titles`,
  },
  {
    id: 'provider-genres',
    label: `App data (${providerName}): genres`,
    run: async () => `OK — ${(await animeProvider.getGenres()).length} genres`,
  },
  {
    id: 'jikan',
    label: 'Jikan (MyAnimeList) API',
    run: async () => {
      const res = await timedFetch(`${config.jikanUrl}/anime/1`)
      if (!res.ok) throw new Error(await describe(res))
      return 'OK'
    },
  },
  {
    id: 'supabase',
    label: 'Accounts (Supabase)',
    run: async () => {
      if (!config.supabaseUrl) return 'SKIP — accounts disabled'
      const res = await timedFetch(`${config.supabaseUrl}/auth/v1/health`, { headers: { apikey: config.supabaseKey } })
      if (!res.ok) throw new Error(await describe(res))
      return 'OK'
    },
  },
]

/** Self-service connectivity check — shows exactly which data source fails and why. */
export default function StatusPage() {
  useDocumentMeta({ title: 'System status', noindex: true })
  const toast = useToast()
  const [results, setResults] = useState<Record<string, Result>>({})
  const [running, setRunning] = useState(false)

  const run = useCallback(async () => {
    setRunning(true)
    setResults(Object.fromEntries(CHECKS.map((c) => [c.id, { state: 'pending', detail: 'Checking…' } as Result])))
    for (const c of CHECKS) {
      const start = performance.now()
      try {
        const detail = await c.run()
        setResults((r) => ({ ...r, [c.id]: { state: detail.startsWith('SKIP') ? 'skip' : 'ok', detail, ms: Math.round(performance.now() - start) } }))
      } catch (err) {
        const e = err as Error
        setResults((r) => ({ ...r, [c.id]: { state: 'fail', detail: e.name === 'AbortError' ? 'Timed out after 15 s' : e.message, ms: Math.round(performance.now() - start) } }))
      }
    }
    setRunning(false)
  }, [])

  useEffect(() => void run(), [run])

  const report = () =>
    [
      `ANIVIA status — ${new Date().toISOString()}`,
      `Site: ${window.location.origin} · data source: ${activeDataSource} · UA: ${navigator.userAgent}`,
      ...CHECKS.map((c) => `${(results[c.id]?.state ?? '?').toUpperCase().padEnd(5)} ${c.label}: ${results[c.id]?.detail ?? ''}${results[c.id]?.ms !== undefined ? ` (${results[c.id]!.ms} ms)` : ''}`),
      lastProviderError() ? `Last app error: ${JSON.stringify(lastProviderError())}` : 'Last app error: none',
    ].join('\n')

  return (
    <div className="container-app max-w-3xl">
      <PageHeader eyebrow="Diagnostics" title="System status" description="Checks every service ANIVIA depends on, from your browser." />
      <ul className="space-y-2">
        {CHECKS.map((c) => {
          const r = results[c.id]
          return (
            <li key={c.id} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
              <span className="mt-0.5 shrink-0">
                {!r || r.state === 'pending' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-fg-subtle" />
                ) : r.state === 'ok' ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : r.state === 'skip' ? (
                  <CheckCircle2 className="h-5 w-5 text-fg-subtle" />
                ) : (
                  <XCircle className="h-5 w-5 text-danger" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">
                  {c.label}
                  {r?.ms !== undefined && <span className="ml-2 text-xs font-normal text-fg-subtle">{r.ms} ms</span>}
                </p>
                <p className="mt-0.5 break-words font-mono text-xs text-fg-muted">{r?.detail ?? 'Waiting…'}</p>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => void run()} loading={running} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Run again
        </Button>
        <Button
          variant="secondary"
          leftIcon={<Copy className="h-4 w-4" />}
          onClick={() => void navigator.clipboard?.writeText(report()).then(() => toast({ title: 'Report copied', description: 'Paste it to support.' }))}
        >
          Copy report
        </Button>
      </div>
    </div>
  )
}
