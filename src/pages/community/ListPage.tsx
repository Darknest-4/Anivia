import { t } from '@/i18n'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ListX, Lock, Share2, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimeCard } from '@/components/anime'
import { ShareDialog } from '@/components/anime'
import { AuthorLine } from '@/components/community'
import { PageHeader } from '@/components/common/PageHeader'
import { Button, Dialog, EmptyState, ErrorState, Skeleton, Switch } from '@/components/ui'
import { useAnimeByIds } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useToast } from '@/providers/ToastProvider'
import { community } from '@/services/community'

export default function ListPage() {
  const { id = '' } = useParams()
  const client = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const q = useQuery({ queryKey: ['list', id], queryFn: () => community.list(id), retry: false })
  const list = q.data?.list
  const anime = useAnimeByIds(list?.items ?? [])
  const byId = new Map((anime.data ?? []).map((a) => [a.id, a]))
  const [share, setShare] = useState(false)
  const [confirm, setConfirm] = useState(false)
  useDocumentMeta({ title: list?.title ?? t('List'), description: list?.description })

  const update = useMutation({
    mutationFn: (patch: Parameters<typeof community.updateList>[1]) => community.updateList(id, patch),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['list', id] })
      void client.invalidateQueries({ queryKey: ['lists'] })
    },
    onError: (e: Error) => toast({ title: t('Couldn’t save'), description: e.message, variant: 'error' }),
  })

  if (q.isLoading) return <div className="container-app py-10"><Skeleton className="h-40 rounded-2xl" /></div>
  if (q.isError) return <div className="container-app py-16"><ErrorState title={t('Couldn’t load the list')} description={(q.error as Error).message} onRetry={() => q.refetch()} /></div>
  if (!list) return <div className="container-app py-16"><EmptyState icon={<ListX />} title={t('List not found')} description={t('It may be private or deleted.')} /></div>

  const mine = q.data!.mine
  const move = (i: number, d: -1 | 1) => {
    const items = [...list.items]
    const j = i + d
    if (j < 0 || j >= items.length) return
    ;[items[i], items[j]] = [items[j], items[i]]
    update.mutate({ items })
  }

  return (
    <div className="container-app pb-10">
      <PageHeader
        crumbs={[{ label: t('Lists'), to: '/lists' }, { label: list.title }]}
        title={
          <span className="flex items-center gap-2">
            {!list.is_public && <Lock className="h-5 w-5 text-fg-subtle" />}
            {list.title}
          </span>
        }
        description={list.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {list.is_public && (
              <Button variant="secondary" size="sm" leftIcon={<Share2 className="h-4 w-4" />} onClick={() => setShare(true)}>
                {t('Share')}
              </Button>
            )}
            {mine && (
              <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>
                {t('Delete')}
              </Button>
            )}
          </div>
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <AuthorLine author={q.data!.author} at={list.updated_at} />
        {mine && <Switch label={t('Public')} checked={list.is_public} onChange={(v) => update.mutate({ is_public: v })} />}
      </div>
      {!list.items.length ? (
        <EmptyState icon={<ListX />} title={t('This list is empty')} description={mine ? t('Open any anime and use “Add to list”.') : t('Nothing here yet.')} />
      ) : (
        <ol className="grid grid-cols-2 gap-x-3 gap-y-6 xs:grid-cols-3 sm:gap-x-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {list.items.map((aid, i) => {
            const a = byId.get(aid)
            return (
              <li key={aid} className="min-w-0">
                {a ? <AnimeCard anime={a} /> : <Skeleton className="aspect-[2/3] rounded-xl" />}
                {mine && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-fg-subtle">#{i + 1}</span>
                    <span className="flex">
                      <Button variant="ghost" size="icon-sm" aria-label={t('Move up')} disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={t('Move down')} disabled={i === list.items.length - 1} onClick={() => move(i, 1)}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={t('Remove from list')} onClick={() => update.mutate({ items: list.items.filter((x) => x !== aid) })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </span>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}
      <ShareDialog heading={t('Share list')} title={list.title} path={`/lists/${list.id}`} open={share} onClose={() => setShare(false)} />
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title={t('Delete this list?')}
        description={t('This can’t be undone.')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await community.deleteList(list.id)
                void client.invalidateQueries({ queryKey: ['lists'] })
                navigate('/lists')
              }}
            >
              {t('Delete')}
            </Button>
          </>
        }
      />
    </div>
  )
}
