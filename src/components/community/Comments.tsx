import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Reply, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, ButtonLink, EmptyState, Skeleton, Switch, Textarea } from '@/components/ui'
import { useAuth } from '@/providers/AuthProvider'
import { useFlag } from '@/providers/PlatformProvider'
import { usePlatform } from '@/providers/PlatformProvider'
import { useToast } from '@/providers/ToastProvider'
import { community, type Comment } from '@/services/community'
import { AuthorLine, SpoilerText } from './parts'

/** Discussion thread for a title or a single episode (one level of replies). */
export function Comments({ animeId, episode, heading = 'Discussion' }: { animeId: string; episode: number | null; heading?: string }) {
  const on = useFlag('comments')
  const { status } = useAuth()
  const { can } = usePlatform()
  const client = useQueryClient()
  const toast = useToast()
  const key = ['comments', animeId, episode]
  const q = useQuery({ queryKey: key, queryFn: () => community.comments(animeId, episode), enabled: on && status !== 'disabled' })
  const [replyTo, setReplyTo] = useState<Comment | null>(null)

  const add = useMutation({
    mutationFn: (v: { body: string; spoiler: boolean; parent: number | null }) => community.addComment(animeId, episode, v.body, v.spoiler, v.parent),
    onSuccess: () => {
      setReplyTo(null)
      void client.invalidateQueries({ queryKey: key })
    },
    onError: (e: Error) => toast({ title: 'Couldn’t post', description: e.message, variant: 'error' }),
  })
  const remove = useMutation({ mutationFn: (id: number) => community.deleteComment(id), onSuccess: () => client.invalidateQueries({ queryKey: key }) })

  if (!on || status === 'disabled') return null
  const all = q.data ?? []
  const roots = all.filter((c) => !c.parent_id).reverse()
  const replies = (id: number) => all.filter((c) => c.parent_id === id)

  const item = (c: Comment, nested = false) => (
    <li key={c.id} className={nested ? 'ml-9 mt-3' : 'rounded-2xl border border-line bg-surface p-4'}>
      <div className="flex items-start justify-between gap-2">
        <AuthorLine author={c.author} at={c.created_at} />
        <div className="flex items-center">
          {!nested && status === 'signed-in' && (
            <Button variant="ghost" size="icon-sm" aria-label="Reply" onClick={() => setReplyTo(c)}>
              <Reply className="h-4 w-4" />
            </Button>
          )}
          {(c.mine || can('reports.manage')) && (
            <Button variant="ghost" size="icon-sm" aria-label="Delete comment" onClick={() => remove.mutate(c.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <SpoilerText text={c.body} spoiler={c.spoiler} className="mt-2 pl-[42px]" />
      {!nested && replies(c.id).length > 0 && <ul>{replies(c.id).map((r) => item(r, true))}</ul>}
    </li>
  )

  return (
    <section aria-labelledby={`comments-${episode ?? 'all'}`} className="space-y-4">
      <h2 id={`comments-${episode ?? 'all'}`} className="flex items-center gap-2 text-lg font-semibold text-fg">
        <MessageCircle className="h-5 w-5 text-accent-soft" />
        {heading}
        {all.length > 0 && <span className="text-sm font-normal text-fg-subtle">({all.length})</span>}
      </h2>
      {status === 'signed-in' ? (
        <CommentForm key={replyTo?.id ?? 'root'} replyTo={replyTo} onCancel={() => setReplyTo(null)} busy={add.isPending} onSubmit={(body, spoiler) => add.mutate({ body, spoiler, parent: replyTo?.id ?? null })} />
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-fg-muted">
          <ButtonLink to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} size="sm" className="mr-3">
            Sign in
          </ButtonLink>
          to join the discussion.
        </div>
      )}
      {q.isLoading ? <Skeleton className="h-24 rounded-2xl" /> : roots.length === 0 ? <EmptyState compact icon={<MessageCircle />} title="No comments yet" description="Start the conversation." /> : <ul className="space-y-3">{roots.map((c) => item(c))}</ul>}
    </section>
  )
}

function CommentForm({ replyTo, onCancel, onSubmit, busy }: { replyTo: Comment | null; onCancel: () => void; onSubmit: (body: string, spoiler: boolean) => void; busy: boolean }) {
  const [body, setBody] = useState('')
  const [spoiler, setSpoiler] = useState(false)
  return (
    <form
      className="space-y-3 rounded-2xl border border-line bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!body.trim()) return
        onSubmit(body.trim(), spoiler)
        setBody('')
      }}
    >
      {replyTo && (
        <p className="text-xs text-fg-subtle">
          Replying to <strong className="text-fg">{replyTo.author.display_name}</strong> ·{' '}
          <button type="button" onClick={onCancel} className="font-semibold text-accent-soft hover:underline">
            cancel
          </button>
        </p>
      )}
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={2000} placeholder="Say something nice…" aria-label="Your comment" />
      <div className="flex items-center justify-between gap-3">
        <Switch label="Spoiler" checked={spoiler} onChange={setSpoiler} />
        <Button type="submit" size="sm" loading={busy} disabled={!body.trim()}>
          Post
        </Button>
      </div>
    </form>
  )
}
