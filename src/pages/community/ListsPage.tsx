import { t } from '@/i18n'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListPlus, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthorLine } from '@/components/community'
import { PageHeader } from '@/components/common/PageHeader'
import { Button, Dialog, EmptyState, Field, Input, Skeleton, Switch, Textarea } from '@/components/ui'
import { useAnimeByIds } from '@/hooks/queries'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { thumb } from '@/lib/images'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import { community } from '@/services/community'
import { emitActivity } from '@/services/user/activity'

function Covers({ ids }: { ids: string[] }) {
  const { data } = useAnimeByIds(ids.slice(0, 4))
  return (
    <div className="flex -space-x-3">
      {(data ?? []).map((a) => (
        <img key={a.id} src={thumb(a.poster)} alt="" loading="lazy" className="h-20 w-14 rounded-md object-cover ring-2 ring-surface" />
      ))}
      {!ids.length && <span className="flex h-20 w-14 items-center justify-center rounded-md bg-surface-2 text-fg-subtle">—</span>}
    </div>
  )
}

/** Your lists and the newest public lists from the community. */
export default function ListsPage() {
  useDocumentMeta({ title: t('Lists'), description: t('Custom anime lists made by ANIVIA members.') })
  const { status } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const client = useQueryClient()
  const mine = useQuery({ queryKey: ['lists', 'mine'], queryFn: () => community.myLists(), enabled: status === 'signed-in' })
  const recent = useQuery({ queryKey: ['lists', 'public'], queryFn: () => community.publicLists(), enabled: status !== 'disabled' })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', is_public: true })
  const create = useMutation({
    mutationFn: () => community.createList(form),
    onSuccess: (list) => {
      emitActivity({ kind: 'list', data: { title: list.title, id: list.id } })
      void client.invalidateQueries({ queryKey: ['lists'] })
      navigate(`/lists/${list.id}`)
    },
    onError: (e: Error) => toast({ title: t('Couldn’t create the list'), description: e.message, variant: 'error' }),
  })

  return (
    <div className="container-app pb-10">
      <PageHeader
        eyebrow={t('Community')}
        title={t('Lists')}
        description={t('Make your own lists — “Best isekai”, “Cozy winter anime” — and share them.')}
        actions={
          status === 'signed-in' ? (
            <Button leftIcon={<ListPlus className="h-4 w-4" />} onClick={() => setOpen(true)}>
              {t('New list')}
            </Button>
          ) : undefined
        }
      />
      {status === 'signed-in' && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-fg">{t('Your lists')}</h2>
          {mine.isLoading ? (
            <Skeleton className="h-28 rounded-2xl" />
          ) : !mine.data?.length ? (
            <EmptyState compact icon={<ListPlus />} title={t('No lists yet')} description={t('Create one, then add titles from any anime page.')} />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mine.data.map((l) => (
                <li key={l.id}>
                  <Link to={`/lists/${l.id}`} className="flex gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
                    <Covers ids={l.items} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-semibold text-fg">
                        {!l.is_public && <Lock className="h-3.5 w-3.5 text-fg-subtle" />}
                        {l.title}
                      </p>
                      <p className="text-xs text-fg-subtle">{t('{p0} titles', { p0: l.items.length })}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-fg">{t('From the community')}</h2>
        {recent.isLoading ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : !recent.data?.length ? (
          <EmptyState compact icon={<ListPlus />} title={t('No public lists yet')} description={recent.isError ? (recent.error as Error).message: t('Be the first to make one.')} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recent.data.map((l) => (
              <li key={l.id} className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
                <Link to={`/lists/${l.id}`} className="flex gap-4">
                  <Covers ids={l.items} />
                  <div className="min-w-0">
                    <p className="font-semibold text-fg">{l.title}</p>
                    <p className="line-clamp-2 text-xs text-fg-muted">{l.description}</p>
                    <p className="mt-1 text-xs text-fg-subtle">{t('{p0} titles', { p0: l.items.length })}</p>
                  </div>
                </Link>
                <AuthorLine author={l.author} at={l.updated_at} className="mt-3" />
              </li>
            ))}
          </ul>
        )}
      </section>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('New list')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button loading={create.isPending} disabled={!form.title.trim()} onClick={() => create.mutate()}>
              {t('Create')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('Title')}>{(p) => <Input {...p} maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('e.g. Cozy winter anime')} />}</Field>
          <Field label={t('Description')}>{(p) => <Textarea {...p} maxLength={500} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}</Field>
          <Switch label={t('Public')} description={t('Anyone with the link can see it, and it appears under “From the community”.')} checked={form.is_public} onChange={(v) => setForm({ ...form, is_public: v })} />
        </div>
      </Dialog>
    </div>
  )
}
