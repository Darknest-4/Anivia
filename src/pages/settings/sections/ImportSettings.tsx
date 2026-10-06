import { t } from '@/i18n'
import { Download } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { activeDataSource } from '@/services/anime'
import { importAniListUser } from '@/services/user/anilistImport'
import { Card, Row } from '../parts'

/** Pulls a public AniList list into the local (and synced) library. */
export function ImportSettings() {
  const toast = useToast()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const supported = activeDataSource === 'anilist' || activeDataSource === 'jikan'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      const r = await importAniListUser(name, activeDataSource === 'jikan' ? 'jikan' : 'anilist')
      toast({
        title: t('Imported @{p0}', { p0: r.username }),
        description: t('{p0} new, {p1} updated, {p2} scores, {p3} favorites.', { p0: r.added, p1: r.updated, p2: r.rated, p3: r.favorites }),
      })
      setName('')
    } catch (err) {
      toast({ title: t('Import failed'), description: (err as Error).message, variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title={t('Import from AniList')} description={t('Bring your existing list over — statuses, scores and favorites. Your AniList profile must be public.')}>
      <Row>
        {supported ? (
          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('AniList username')} aria-label={t('AniList username')} className="sm:max-w-xs" maxLength={40} />
            <Button type="submit" loading={busy} leftIcon={<Download className="h-4 w-4" />}>
              {t('Import list')}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-fg-subtle">{t('Switch the data source to AniList or MyAnimeList to import a list.')}</p>
        )}
      </Row>
    </Card>
  )
}
