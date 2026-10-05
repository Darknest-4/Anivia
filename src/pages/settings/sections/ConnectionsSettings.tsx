import { ExternalLink, Link2Off, RefreshCw } from 'lucide-react'
import { AniListButton, AniListMark } from '@/components/auth/AniListButton'
import { Avatar, Button, Switch } from '@/components/ui'
import { useStore } from '@/hooks/useUserData'
import { formatRelative } from '@/lib/format'
import { useAniList } from '@/providers/AniListProvider'
import { anilistOptionsStore, anilistSnapshotStore } from '@/services/anilistAccount/store'
import { Card, Row } from '../parts'

const statusText = { idle: 'Waiting…', syncing: 'Syncing with AniList…', synced: 'In sync', error: 'Sync failed' } as const

export function ConnectionsSettings() {
  const al = useAniList()
  const opts = useStore(anilistOptionsStore)
  const snap = useStore(anilistSnapshotStore)
  const set = (k: keyof typeof opts, v: boolean) => anilistOptionsStore.set({ ...opts, [k]: v })

  return (
    <Card title="AniList" description="Two-way sync: changes on ANIVIA appear on AniList and vice versa. Your AniList login stays in this browser only.">
      {!al.account ? (
        <Row>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <AniListMark className="h-10 w-10 text-lg" />
              <div>
                <p className="text-sm font-medium text-fg">Connect your AniList account</p>
                <p className="text-[13px] text-fg-subtle">Sync your list, scores, episode progress and favorites. Titles already in your ANIVIA watchlist are added to AniList too.</p>
              </div>
            </div>
            <div className="sm:w-56">
              <AniListButton label="Connect AniList" returnTo="/settings?tab=connections" />
            </div>
          </div>
        </Row>
      ) : (
        <>
          <Row>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={al.account.name} src={al.account.avatar} />
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                    {al.account.name}
                    {al.account.siteUrl && (
                      <a href={al.account.siteUrl} target="_blank" rel="noopener noreferrer" aria-label="Open AniList profile" className="text-fg-subtle hover:text-fg">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </p>
                  <p className="text-xs text-fg-subtle" role="status">
                    {al.syncSupported ? statusText[al.status] : 'Sync paused — switch the data source to AniList (Settings → Content).'}
                    {al.status === 'error' && al.message ? ` — ${al.message}` : ''}
                    {snap.syncedAt && al.status !== 'syncing' ? ` · last sync ${formatRelative(snap.syncedAt)}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={!al.syncSupported} loading={al.status === 'syncing'} leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void al.syncNow()}>
                  Sync now
                </Button>
                <Button variant="ghost" size="sm" leftIcon={<Link2Off className="h-4 w-4" />} onClick={al.disconnect}>
                  Disconnect
                </Button>
              </div>
            </div>
          </Row>
          <Row>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <Switch label="Watchlist & statuses" description="Watching, planning, completed, paused, dropped." checked={opts.watchlist} onChange={(v) => set('watchlist', v)} />
              <Switch label="Scores" description="Your 1–10 ratings." checked={opts.scores} onChange={(v) => set('scores', v)} />
              <Switch label="Episode progress" description="Finished episodes update your AniList progress." checked={opts.progress} onChange={(v) => set('progress', v)} />
              <Switch label="Favorites" description="Hearted titles become AniList favourites." checked={opts.favorites} onChange={(v) => set('favorites', v)} />
            </div>
          </Row>
          <Row>
            <p className="text-xs text-fg-subtle">{Object.keys(snap.entries).length} titles on your AniList list · {snap.favorites.length} favourites</p>
          </Row>
        </>
      )}
    </Card>
  )
}
