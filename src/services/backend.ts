import { getSupabase } from '@/providers/AuthProvider'

/** Thin wrappers around Supabase tables/RPCs used outside the auth flow. */
export const backend = {
  async sendContact(input: { name: string; email: string; topic: string; message: string }) {
    const client = await getSupabase()
    const { error } = await client.from('contact_messages').insert(input)
    if (error) throw new Error(error.message.includes('Too many') ? error.message : 'Could not send your message. Please try again.')
  },
  async sendReport(input: { subject: string; reason: string; details: string; page_url: string }) {
    const client = await getSupabase()
    const { error } = await client.from('reports').insert(input)
    if (error) throw new Error(error.message.includes('Too many') ? error.message : 'Could not submit the report. Please try again.')
  },
  async deleteMyAccount() {
    const client = await getSupabase()
    const { error } = await client.rpc('delete_my_account')
    if (error) throw new Error(error.message)
    await client.auth.signOut({ scope: 'local' })
  },
  async setProfileVisibility(userId: string, isPublic: boolean, showHistory: boolean) {
    const client = await getSupabase()
    const { error } = await client.from('profiles').update({ is_public: isPublic, show_history: showHistory }).eq('id', userId)
    if (error) throw new Error(error.message)
  },
  async publicProfile(username: string) {
    const client = await getSupabase()
    const { data, error } = await client.rpc('public_profile', { p_username: username })
    if (error) throw new Error(error.message)
    return data as PublicProfile | null
  },
}

export interface PublicProfile {
  profile: { id: string; username: string; display_name: string; bio: string; avatar_hue: number; created_at: string; show_history: boolean }
  watchlist: { animeId: string; status: string; updatedAt: string }[]
  favorites: string[]
  ratings: Record<string, number>
  history: { animeId: string; episodeNumber: number; lastWatched: string }[]
}
