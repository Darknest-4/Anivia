import { getSupabase } from '@/providers/AuthProvider'

/** Community features backed by Supabase (migration 0006). */
export interface Author {
  id: string
  username: string | null
  display_name: string
  avatar_hue: number
  avatar_url: string | null
}
export interface Review {
  id: number
  score: number | null
  body: string
  spoiler: boolean
  created_at: string
  updated_at: string
  mine: boolean
  author: Author
}
export interface Comment {
  id: number
  parent_id: number | null
  body: string
  spoiler: boolean
  created_at: string
  mine: boolean
  author: Author
}
export interface Activity {
  id: number
  kind: 'status' | 'rating' | 'episode' | 'review' | 'list' | 'favorite'
  anime_id: string | null
  data: Record<string, unknown>
  created_at: string
  author?: Author
}
export interface AnimeList {
  id: string
  user_id: string
  title: string
  description: string
  items: string[]
  is_public: boolean
  created_at: string
  updated_at: string
}
export interface ListSummary {
  id: string
  title: string
  description: string
  items: string[]
  updated_at: string
  author: Author
}

function friendly(message: string) {
  if (/does not exist|schema cache|could not find the function/i.test(message)) return 'This feature needs the latest database update (supabase/migrations/0006_anivia_community.sql).'
  if (/row-level security|permission denied/i.test(message)) return 'Please sign in first.'
  if (/too many/i.test(message)) return message
  if (/check constraint.*body/i.test(message)) return 'Your text is too short or too long.'
  return message
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const client = await getSupabase()
  const { data, error } = await client.rpc(fn, args)
  if (error) throw new Error(friendly(error.message))
  return data as T
}

async function table() {
  return getSupabase()
}

export const community = {
  communityScore: (animeId: string) => rpc<{ average: number | null; count: number }>('anime_community_score', { p_anime: animeId }),

  reviews: (animeId: string) => rpc<Review[]>('anime_reviews', { p_anime: animeId, p_limit: 30 }),
  async saveReview(animeId: string, input: { body: string; score: number | null; spoiler: boolean }) {
    const c = await table()
    const { data: s } = await c.auth.getSession()
    if (!s.session) throw new Error('Please sign in first.')
    const { error } = await c.from('reviews').upsert({ user_id: s.session.user.id, anime_id: animeId, ...input }, { onConflict: 'user_id,anime_id' })
    if (error) throw new Error(friendly(error.message))
  },
  async deleteReview(id: number) {
    const c = await table()
    const { error } = await c.from('reviews').delete().eq('id', id)
    if (error) throw new Error(friendly(error.message))
  },

  comments: (animeId: string, episode: number | null) => rpc<Comment[]>('anime_comments', { p_anime: animeId, p_episode: episode, p_limit: 100 }),
  async addComment(animeId: string, episode: number | null, body: string, spoiler: boolean, parentId: number | null = null) {
    const c = await table()
    const { data: s } = await c.auth.getSession()
    if (!s.session) throw new Error('Please sign in first.')
    const { error } = await c.from('comments').insert({ user_id: s.session.user.id, anime_id: animeId, episode, body, spoiler, parent_id: parentId })
    if (error) throw new Error(friendly(error.message))
  },
  async deleteComment(id: number) {
    const c = await table()
    const { error } = await c.from('comments').delete().eq('id', id)
    if (error) throw new Error(friendly(error.message))
  },

  followStats: (userId: string) => rpc<{ followers: number; following: number; is_following: boolean }>('follow_stats', { p_user: userId }),
  async follow(userId: string, on: boolean) {
    const c = await table()
    const { data: s } = await c.auth.getSession()
    if (!s.session) throw new Error('Please sign in to follow people.')
    const { error } = on
      ? await c.from('follows').insert({ follower: s.session.user.id, followee: userId })
      : await c.from('follows').delete().eq('follower', s.session.user.id).eq('followee', userId)
    if (error && !/duplicate key/i.test(error.message)) throw new Error(friendly(error.message))
  },
  feed: (before?: string) => rpc<Activity[]>('activity_feed', { p_before: before ?? new Date().toISOString(), p_limit: 40 }),
  profileActivity: (userId: string) => rpc<Activity[]>('profile_activity', { p_user: userId, p_limit: 20 }),
  async logActivity(kind: Activity['kind'], animeId: string | undefined, data: Record<string, unknown> = {}) {
    const c = await table()
    const { data: s } = await c.auth.getSession()
    if (!s.session) return
    await c.from('activities').insert({ user_id: s.session.user.id, kind, anime_id: animeId ?? null, data })
  },

  async myLists(): Promise<AnimeList[]> {
    const c = await table()
    const { data: s } = await c.auth.getSession()
    if (!s.session) return []
    const { data, error } = await c.from('lists').select('*').eq('user_id', s.session.user.id).order('updated_at', { ascending: false })
    if (error) throw new Error(friendly(error.message))
    return (data ?? []) as AnimeList[]
  },
  publicLists: () => rpc<ListSummary[]>('recent_public_lists', { p_limit: 24 }),
  list: (id: string) => rpc<{ list: AnimeList; author: Author; mine: boolean } | null>('list_with_author', { p_id: id }),
  async createList(input: { title: string; description?: string; is_public?: boolean; items?: string[] }) {
    const c = await table()
    const { data: s } = await c.auth.getSession()
    if (!s.session) throw new Error('Please sign in to create lists.')
    const { data, error } = await c.from('lists').insert({ user_id: s.session.user.id, title: input.title, description: input.description ?? '', is_public: input.is_public ?? true, items: input.items ?? [] }).select().single()
    if (error) throw new Error(friendly(error.message))
    return data as AnimeList
  },
  async updateList(id: string, patch: Partial<Pick<AnimeList, 'title' | 'description' | 'is_public' | 'items'>>) {
    const c = await table()
    const { error } = await c.from('lists').update(patch).eq('id', id)
    if (error) throw new Error(friendly(error.message))
  },
  async deleteList(id: string) {
    const c = await table()
    const { error } = await c.from('lists').delete().eq('id', id)
    if (error) throw new Error(friendly(error.message))
  },
}
