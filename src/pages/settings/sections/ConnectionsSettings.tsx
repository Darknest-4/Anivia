import { t } from '@/i18n'
import { ExternalLink, Link2Off, RefreshCw } from 'lucide-react'
import { AniListButton, AniListMark } from '@/components/auth/AniListButton'
import { Avatar, Button, Switch } from '@/components/ui'
import { useStore } from '@/hooks/useUserData'
import { formatRelative } from '@/lib/format'
import { useAniList } from '@/providers/AniListProvider'
import { useAuth } from '@/providers/AuthProvider'
import { anilistOptionsStore, anilistSnapshotStore } from '@/services/anilistAccount/store'
import { Card, Row } from '../parts'

const statusText = { idle: t('Waiting…'), syncing: t('Syncing with AniList…'), synced: t('In sync'), error: t('Sync failed') } as const

export function ConnectionsSettings() {
  const al = useAniList()
  const { status } = useAuth()
  const opts = useStore(anilistOptionsStore)
  const snap = useStore(anilistSnapshotStore)
  const set = (k: keyof typeof opts, v: boolean) => anilistOptionsStore.set({ ...opts, [k]: v })

  return (
    <Card
      title={t('AniList')}
      description={
        status === 'signed-in'
          ? t('Two-way sync: changes on ANIVIA appear on AniList and vice versa. The connection is saved to your account, so it works on every device until you disconnect it.')
          : t('Two-way sync: changes on ANIVIA appear on AniList and vice versa. Sign in to keep the connection on all your devices.')
      }
    >
      {!al.account ? (
        <Row>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <AniListMark className="h-10 w-10 text-lg" />
              <div>
                <p className="text-sm font-medium text-fg">{t('Connect your AniList account')}</p>
                <p className="text-[13px] text-fg-subtle">{t('Sync your list, scores, episode progress and favorites. Titles already in your ANIVIA watchlist are added to AniList too.')}</p>
              </div>
            </div>
            <div className="sm:w-56">
              <AniListButton label={t('Connect AniList')} returnTo="/settings?tab=connections" />
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
                      <a href={al.account.siteUrl} target="_blank" rel="noopener noreferrer" aria-label={t('Open AniList profile')} className="text-fg-subtle hover:text-fg">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </p>
                  <p className="text-xs text-fg-subtle" role="status">
                    {al.syncSupported ? statusText[al.status] : t('Sync paused — switch the data source to AniList (Settings → Content).')}
                    {al.status === 'error' && al.message ? ` — ${al.message}` : ''}
                    {snap.syncedAt && al.status !== 'syncing' ? t(' · last sync {p0}', { p0: formatRelative(snap.syncedAt) }) : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={!al.syncSupported} loading={al.status === 'syncing'} leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void al.syncNow()}>
                  {t('Sync now')}
                </Button>
                <Button variant="ghost" size="sm" leftIcon={<Link2Off className="h-4 w-4" />} onClick={() => void al.disconnect()}>
                  {t('Disconnect')}
                </Button>
              </div>
            </div>
          </Row>
          <Row>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <Switch label={t('Watchlist & statuses')} description={t('Watching, planning, completed, paused, dropped.')} checked={opts.watchlist} onChange={(v) => set('watchlist', v)} />
              <Switch label={t('Scores')} description={t('Your 1–10 ratings.')} checked={opts.scores} onChange={(v) => set('scores', v)} />
              <Switch label={t('Episode progress')} description={t('Finished episodes update your AniList progress.')} checked={opts.progress} onChange={(v) => set('progress', v)} />
              <Switch label={t('Favorites')} description={t('Hearted titles become AniList favourites.')} checked={opts.favorites} onChange={(v) => set('favorites', v)} />
            </div>
          </Row>
          <Row>
            <p className="text-xs text-fg-subtle">
              {t('{p0} titles on your AniList list · {p1} favourites', { p0: Object.keys(snap.entries).length, p1: snap.favorites.length })}
              {al.linkedToAccount ? ' · saved to your ANIVIA account — stays connected on every device until you disconnect' : ' · connected on this device only (sign in to keep it on your account)'}
            </p>
          </Row>
        </>
      )}
    </Card>
  )
}
