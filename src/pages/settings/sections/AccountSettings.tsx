import { Cloud, KeyRound, LogIn, LogOut, Mail } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { PasswordInput } from '@/components/auth/AuthBits'
import { Avatar, Button, ButtonLink, Field, Input, Textarea } from '@/components/ui'
import { formatDate } from '@/lib/format'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import { Card, Row } from '../parts'

const syncText = { idle: 'Waiting…', syncing: 'Syncing now…', synced: 'Everything is up to date', error: 'Last sync failed — will retry on the next change' } as const

/** Real account management (Supabase). Shown when accounts are enabled. */
export function AccountSettings() {
  const auth = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ display_name: '', username: '', bio: '', avatar_hue: 348 })
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (auth.profile)
      setForm({ display_name: auth.profile.display_name, username: auth.profile.username ?? '', bio: auth.profile.bio, avatar_hue: auth.profile.avatar_hue })
    setEmail(auth.email ?? '')
  }, [auth.profile, auth.email])

  if (auth.status !== 'signed-in')
    return (
      <Card title="Account" description="Sign in to sync your watchlist, history, favorites and settings across devices.">
        <Row>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/login?redirect=%2Fsettings%3Ftab%3Daccount" leftIcon={<LogIn className="h-4 w-4" />}>
              Sign in
            </ButtonLink>
            <ButtonLink to="/register" variant="secondary">
              Create free account
            </ButtonLink>
          </div>
        </Row>
      </Card>
    )

  const attempt = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key)
    try {
      await fn()
      toast({ title: ok })
    } catch (e) {
      toast({ title: 'Something went wrong', description: (e as Error).message, variant: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (form.username && !/^[a-zA-Z0-9_.-]{3,24}$/.test(form.username)) {
      toast({ title: 'Invalid username', description: '3–24 characters: letters, numbers, . _ -', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      await auth.updateProfile({ display_name: form.display_name.trim() || 'Member', username: form.username || null, bio: form.bio, avatar_hue: form.avatar_hue })
      toast({ title: 'Profile saved' })
    } catch (err) {
      toast({ title: 'Couldn’t save profile', description: (err as Error).message, variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card title="Profile" description={auth.profile ? `Member since ${formatDate(auth.profile.created_at, { month: 'long', year: 'numeric' })}` : undefined}>
        <Row>
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-4 sm:col-span-2">
              <Avatar name={form.display_name || 'Member'} hue={form.avatar_hue} size="lg" />
              <label className="flex-1">
                <span className="mb-1.5 block text-[13px] font-medium text-fg">Avatar color</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={form.avatar_hue}
                  onChange={(e) => setForm({ ...form, avatar_hue: Number(e.target.value) })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full"
                  style={{ background: 'linear-gradient(90deg, hsl(0 80% 55%), hsl(60 80% 55%), hsl(120 80% 45%), hsl(180 80% 45%), hsl(240 80% 60%), hsl(300 80% 55%), hsl(360 80% 55%))' }}
                  aria-label="Avatar color"
                />
              </label>
            </div>
            <Field label="Display name">{(p) => <Input {...p} maxLength={48} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} autoComplete="name" />}</Field>
            <Field label="Username" hint="3–24 characters">{(p) => <Input {...p} maxLength={24} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="username" />}</Field>
            <Field label="Bio" className="sm:col-span-2" hint={`${form.bio.length}/280`}>
              {(p) => <Textarea {...p} maxLength={280} rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />}
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving}>
                Save profile
              </Button>
            </div>
          </form>
        </Row>
      </Card>

      <Card title="Sign-in details">
        <Row>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              void attempt('email', () => auth.updateEmail(email.trim()), 'Check both inboxes to confirm the new address')
            }}
          >
            <Field label="Email" className="flex-1">
              {(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail />} autoComplete="email" />}
            </Field>
            <Button type="submit" variant="secondary" loading={busy === 'email'} disabled={email.trim() === auth.email}>
              Change email
            </Button>
          </form>
        </Row>
        <Row>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              if (password.length < 8) return toast({ title: 'Use at least 8 characters', variant: 'error' })
              void attempt('password', () => auth.updatePassword(password).then(() => setPassword('')), 'Password updated')
            }}
          >
            <Field label="New password" className="flex-1">
              {(p) => <PasswordInput {...p} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            </Field>
            <Button type="submit" variant="secondary" loading={busy === 'password'} leftIcon={<KeyRound className="h-4 w-4" />}>
              Update password
            </Button>
          </form>
        </Row>
      </Card>

      <Card title="Cloud sync">
        <Row>
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Cloud className="h-4 w-4 text-accent-soft" />
            {syncText[auth.syncStatus]}
          </p>
          <p className="mt-1 text-xs text-fg-subtle">Watchlist, history, favorites and settings sync automatically while you’re signed in.</p>
        </Row>
      </Card>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-fg">Sessions</h2>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" leftIcon={<LogOut className="h-4 w-4" />} loading={busy === 'out'} onClick={() => void attempt('out', () => auth.signOut(), 'Signed out')}>
            Sign out
          </Button>
          <Button variant="ghost" loading={busy === 'all'} onClick={() => void attempt('all', () => auth.signOut(true), 'Signed out on all devices')}>
            Sign out everywhere
          </Button>
        </div>
      </section>
    </>
  )
}
