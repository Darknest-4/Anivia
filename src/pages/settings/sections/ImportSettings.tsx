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
        title: `Imported @${r.username}`,
        description: `${r.added} new, ${r.updated} updated, ${r.rated} scores, ${r.favorites} favorites.`,
      })
      setName('')
    } catch (err) {
      toast({ title: 'Import failed', description: (err as Error).message, variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Import from AniList" description="Bring your existing list over — statuses, scores and favorites. Your AniList profile must be public.">
      <Row>
        {supported ? (
          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="AniList username" aria-label="AniList username" className="sm:max-w-xs" maxLength={40} />
            <Button type="submit" loading={busy} leftIcon={<Download className="h-4 w-4" />}>
              Import list
            </Button>
          </form>
        ) : (
          <p className="text-sm text-fg-subtle">Switch the data source to AniList or MyAnimeList to import a list.</p>
        )}
      </Row>
    </Card>
  )
}
