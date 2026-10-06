import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ListPlus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button, Dialog, Input } from '@/components/ui'
import { useAuth } from '@/providers/AuthProvider'
import { useFlag } from '@/providers/PlatformProvider'
import { useToast } from '@/providers/ToastProvider'
import { community } from '@/services/community'

/** "Add to list" — pick one of your lists or create a new one on the spot. */
export function AddToList({ animeId, title, className }: { animeId: string; title: string; className?: string }) {
  const on = useFlag('social')
  const { status } = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const client = useQueryClient()
  const toast = useToast()
  const lists = useQuery({ queryKey: ['lists', 'mine'], queryFn: () => community.myLists(), enabled: open })
  const toggle = useMutation({
    mutationFn: async (v: { id: string; items: string[] }) => {
      const has = v.items.includes(animeId)
      await community.updateList(v.id, { items: has ? v.items.filter((x) => x !== animeId) : [...v.items, animeId] })
      return !has
    },
    onSuccess: (added) => {
      toast({ title: added ? 'Added to list' : 'Removed from list', description: title, duration: 2000 })
      void client.invalidateQueries({ queryKey: ['lists'] })
    },
    onError: (e: Error) => toast({ title: 'Couldn’t update the list', description: e.message, variant: 'error' }),
  })
  const create = useMutation({
    mutationFn: () => community.createList({ title: name.trim(), items: [animeId] }),
    onSuccess: () => {
      setName('')
      toast({ title: 'List created', description: title })
      void client.invalidateQueries({ queryKey: ['lists'] })
    },
    onError: (e: Error) => toast({ title: 'Couldn’t create the list', description: e.message, variant: 'error' }),
  })
  if (!on || status !== 'signed-in') return null
  return (
    <>
      <Button variant="glass" size="icon-lg" aria-label="Add to list" title="Add to list" onClick={() => setOpen(true)} className={className}>
        <ListPlus className="h-5 w-5" />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="sm" icon={<ListPlus className="h-5 w-5" />} title="Add to list" description={title}>
        <ul className="space-y-1.5">
          {(lists.data ?? []).map((l) => {
            const has = l.items.includes(animeId)
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => toggle.mutate({ id: l.id, items: l.items })}
                  className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left text-sm font-medium text-fg-muted hover:border-line-strong hover:text-fg"
                >
                  <span className="truncate">{l.title}</span>
                  {has ? <Check className="h-4 w-4 text-accent-soft" /> : <span className="text-xs text-fg-subtle">{l.items.length}</span>}
                </button>
              </li>
            )
          })}
          {lists.isLoading && <li className="text-sm text-fg-subtle">Loading…</li>}
        </ul>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) create.mutate()
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="New list name" aria-label="New list name" />
          <Button type="submit" variant="secondary" loading={create.isPending} disabled={!name.trim()} leftIcon={<Plus className="h-4 w-4" />}>
            Create
          </Button>
        </form>
      </Dialog>
    </>
  )
}
