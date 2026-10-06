import { t } from '@/i18n'
import { Search, UserX } from 'lucide-react'
import { useState } from 'react'
import { CharacterCard } from '@/components/anime'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, Input, Select, Skeleton, Tabs } from '@/components/ui'
import { useBrowse, useCharacters } from '@/hooks/queries'
import { useDebounce } from '@/hooks/useDebounce'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import type { Character } from '@/types'

type Role = 'all' | Character['role']

export default function CharactersPage() {
  useDocumentMeta({ title: t('Characters'), description: t('Meet the heroes, rivals and villains of the ANIVIA catalog.') })
  const [text, setText] = useState('')
  const [role, setRole] = useState<Role>('all')
  const [animeId, setAnimeId] = useState('')
  const query = useDebounce(text.trim(), 250)
  const { data, isLoading, isError, refetch } = useCharacters({ query: query || undefined, role: role === 'all' ? undefined : role, animeId: animeId || undefined })
  const all = useBrowse({ perPage: 100, sort: 'title-asc' })
  const titles = new Map((all.data?.items ?? []).map((a) => [a.id, a.title]))
  const everyone = useCharacters()
  const animeWithCast = [...new Set((everyone.data ?? []).map((c) => c.animeId).filter(Boolean))]
    .map((id) => ({ value: id, label: titles.get(id) ?? everyone.data?.find((c) => c.animeId === id)?.animeTitle ?? id }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return (
    <div className="container-app">
      <PageHeader crumbs={[{ label: t('Home'), to: '/' }, { label: t('Characters') }]} eyebrow={t('Directory')} title={t('Characters')} description={t('Heroes, rivals and villains — search the full cast directory.')} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex-1">
          <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Search characters, voice actors or anime…')} aria-label={t('Search characters')} leftIcon={<Search />} />
        </div>
        <Select aria-label={t('Filter by anime')} value={animeId} onChange={(e) => setAnimeId(e.target.value)} placeholder={t('All anime')} options={animeWithCast} className="lg:w-64" />
      </div>
      <Tabs
        className="mt-4"
        items={[
          { value: 'all', label: t('All roles') },
          { value: 'Main', label: t('Main') },
          { value: 'Supporting', label: t('Supporting') },
          { value: 'Antagonist', label: t('Antagonist') },
        ]}
        value={role}
        onChange={setRole}
        label={t('Role')}
        variant="pill"
        idPrefix="char-role"
      />
      <div className="mt-8">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-4 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : !data?.length ? (
          <EmptyState icon={<UserX />} title={t('No characters found')} description={t('Try a different name, role or anime.')} />
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {data.map((c) => (
              <li key={c.id}>
                <CharacterCard character={c} animeTitle={titles.get(c.animeId)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
