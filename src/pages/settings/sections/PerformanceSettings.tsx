import { useQueryClient } from '@tanstack/react-query'
import { Database, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Switch } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import { QUERY_CACHE_KEY } from '@/providers/AppProviders'
import { useToast } from '@/providers/ToastProvider'
import type { Preferences } from '@/types'
import { Card, Row } from '../parts'

type Set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => void

const cacheSize = () => {
  try {
    return new Blob([window.localStorage.getItem(QUERY_CACHE_KEY) ?? '']).size
  } catch {
    return 0
  }
}

export function PerformanceSettings({ prefs, set }: { prefs: Preferences; set: Set }) {
  const client = useQueryClient()
  const toast = useToast()
  const [size, setSize] = useState(0)
  useEffect(() => setSize(cacheSize()), [])

  return (
    <>
      <Card title="Speed" description="Tune how aggressively ANIVIA loads data ahead of time.">
        <Row>
          <Switch
            label="Offline cache"
            description="Keep catalog data in this browser for instant reloads and offline browsing (24 h). Takes effect after a reload."
            checked={prefs.offlineCache}
            onChange={(v) => set('offlineCache', v)}
          />
        </Row>
        <Row>
          <Switch label="Prefetch on hover" description="Start loading a title’s page as soon as you point at it." checked={prefs.prefetchOnHover} onChange={(v) => set('prefetchOnHover', v)} />
        </Row>
        <Row>
          <Switch
            label="Data saver"
            description="Smaller images, no prefetching, no autoplaying trailers or spotlight rotation."
            checked={prefs.dataSaver}
            onChange={(v) => set('dataSaver', v)}
          />
        </Row>
        <Row>
          <Switch label="Autoplay trailers" description="Start a title’s official trailer automatically on its page." checked={prefs.autoplayTrailers} onChange={(v) => set('autoplayTrailers', v)} />
        </Row>
      </Card>
      <Card title="Storage">
        <Row>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-3 text-fg-muted">
                <Database className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-fg">Cached catalog data</p>
                <p className="text-[13px] text-fg-subtle">{size ? `${formatNumber(Math.round(size / 1024))} KB stored in this browser` : 'Nothing cached yet'}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => {
                client.clear()
                try {
                  window.localStorage.removeItem(QUERY_CACHE_KEY)
                } catch {
                  /* ignore */
                }
                setSize(0)
                toast({ title: 'Cache cleared', description: 'Fresh data will be loaded as you browse.', variant: 'info' })
              }}
            >
              Clear cache
            </Button>
          </div>
        </Row>
      </Card>
    </>
  )
}
