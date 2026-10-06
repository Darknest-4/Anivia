import { t } from '@/i18n'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquareText, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, ButtonLink, EmptyState, ErrorState, Skeleton, Switch, Textarea } from '@/components/ui'
import { useMyRating } from '@/hooks/useUserData'
import { useAuth } from '@/providers/AuthProvider'
import { useFlag } from '@/providers/PlatformProvider'
import { useToast } from '@/providers/ToastProvider'
import { community } from '@/services/community'
import { emitActivity } from '@/services/user/activity'
import { AuthorLine, SpoilerText } from './parts'

/** Member reviews of a title, with a form to write (or edit) your own. */
export function Reviews({ animeId, title }: { animeId: string; title: string }) {
  const on = useFlag('reviews')
  const { status } = useAuth()
  const client = useQueryClient()
  const toast = useToast()
  const myScore = useMyRating(animeId)
  const q = useQuery({ queryKey: ['reviews', animeId], queryFn: () => community.reviews(animeId), enabled: on && status !== 'disabled' })
  const mine = q.data?.find((r) => r.mine)
  const [body, setBody] = useState('')
  const [spoiler, setSpoiler] = useState(false)
  const [editing, setEditing] = useState(false)

  const save = useMutation({
    mutationFn: () => community.saveReview(animeId, { body: body.trim(), spoiler, score: myScore.value ?? null }),
    onSuccess: () => {
      toast({ title: mine ? t('Review updated') : t('Review published') })
      if (!mine) emitActivity({ kind: 'review', animeId, data: { title } })
      setEditing(false)
      void client.invalidateQueries({ queryKey: ['reviews', animeId] })
    },
    onError: (e: Error) => toast({ title: t('Couldn’t save the review'), description: e.message, variant: 'error' }),
  })
  const remove = useMutation({
    mutationFn: (id: number) => community.deleteReview(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['reviews', animeId] }),
  })

  if (!on || status === 'disabled') return null
  const showForm = status === 'signed-in' && (!mine || editing)

  return (
    <section aria-labelledby="reviews-heading" className="space-y-4">
      <h2 id="reviews-heading" className="text-lg font-semibold text-fg">
        {t('Reviews')}
      </h2>
      {status !== 'signed-in' ? (
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-fg-muted">
          <ButtonLink to={`/login?redirect=${encodeURIComponent(`/anime/${animeId}?tab=reviews`)}`} size="sm" className="mr-3">
            {t('Sign in')}
          </ButtonLink>
          {t('to write a review.')}
        </div>
      ) : showForm ? (
        <form
          className="space-y-3 rounded-2xl border border-line bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (body.trim().length >= 20) save.mutate()
          }}
        >
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={5000} placeholder={t('What did you think of {p0}? (at least 20 characters)', { p0: title })} aria-label={t('Your review')} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs text-fg-subtle">
              <Switch label={t('Contains spoilers')} checked={spoiler} onChange={setSpoiler} />
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                {myScore.value ? t('Your score: {p0}/10', { p0: myScore.value }) : t('Add a score above to include it')}
              </span>
            </div>
            <div className="flex gap-2">
              {editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  {t('Cancel')}
                </Button>
              )}
              <Button type="submit" size="sm" loading={save.isPending} disabled={body.trim().length < 20}>
                {mine ? t('Update review') : t('Publish review')}
              </Button>
            </div>
          </div>
        </form>
      ) : null}

      {q.isError ? (
        <ErrorState title={t('Reviews are unavailable')} description={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <Skeleton className="h-28 rounded-2xl" />
      ) : !q.data?.length ? (
        <EmptyState compact icon={<MessageSquareText />} title={t('No reviews yet')} description={t('Be the first to share what you think.')} />
      ) : (
        <ul className="space-y-3">
          {q.data.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <AuthorLine author={r.author} at={r.created_at} />
                <div className="flex items-center gap-1">
                  {r.score && <span className="rounded-md bg-warning px-1.5 py-0.5 font-display text-xs font-bold text-black">{r.score}/10</span>}
                  {r.mine && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBody(r.body)
                          setSpoiler(r.spoiler)
                          setEditing(true)
                        }}
                      >
                        {t('Edit')}
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={t('Delete your review')} onClick={() => remove.mutate(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <SpoilerText text={r.body} spoiler={r.spoiler} className="mt-3" />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
