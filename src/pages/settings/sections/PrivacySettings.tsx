import { t } from '@/i18n'
import { Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ButtonLink, Switch } from '@/components/ui'
import { useStore } from '@/hooks/useUserData'
import { useAuth } from '@/providers/AuthProvider'
import { useFlag } from '@/providers/PlatformProvider'
import { consentStore } from '@/services/platform/analytics'
import { useToast } from '@/providers/ToastProvider'
import { Card, Row } from '../parts'

/** Opt in / out of first-party usage statistics. */
function StatisticsCard() {
  const consent = useStore(consentStore)
  const on = useFlag('analytics')
  if (!on) return null
  return (
    <Card title={t('Usage statistics')} description={t('Anonymous page views and time on page, stored on ANIVIA’s own database. No ads, no third-party trackers.')}>
      <Row>
        <Switch
          label={t('Share anonymous usage statistics')}
          description={consent === null ? t('You haven’t chosen yet.') : t('You can change this at any time.')}
          checked={consent === 'granted'}
          onChange={(v) => consentStore.set(v ? 'granted' : 'denied')}
        />
      </Row>
    </Card>
  )
}

/** Profile visibility, stored on the account so it applies to the public profile page. */
export function PrivacySettings() {
  return (
    <div className="space-y-6">
      <StatisticsCard />
      <ProfileVisibility />
    </div>
  )
}

function ProfileVisibility() {
  const auth = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const profile = auth.profile
  const isPublic = Boolean(profile?.is_public)
  const showHistory = profile?.show_history ?? true
  const url = profile?.username ? `${window.location.origin}/u/${profile.username}` : null

  const update = async (patch: { is_public?: boolean; show_history?: boolean }) => {
    setBusy(true)
    try {
      await auth.updateProfile(patch)
      toast({ title: t('Privacy updated'), duration: 2000 })
    } catch (e) {
      toast({ title: t('Couldn’t update privacy'), description: (e as Error).message, variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  if (auth.status !== 'signed-in')
    return (
      <Card title={t('Profile visibility')} description={t('Sign in to create a shareable public profile.')}>
        <Row>
          <ButtonLink to="/login?redirect=%2Fsettings%3Ftab%3Dprivacy" size="sm">
            {t('Sign in')}
          </ButtonLink>
        </Row>
      </Card>
    )

  return (
    <Card title={t('Profile visibility')} description={t('Your profile is private unless you make it public.')}>
      <Row>
        <Switch
          label={t('Public profile')}
          description={profile?.username ? t('Anyone with the link can see your watchlist, favorites and scores.') : t('Set a username in Account first.')}
          checked={isPublic}
          disabled={busy || !profile?.username}
          onChange={(v) => void update({ is_public: v })}
        />
        {isPublic && url && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-xs text-fg-muted">{url}</code>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Copy className="h-3.5 w-3.5" />}
              onClick={() => void navigator.clipboard?.writeText(url).then(() => toast({ title: t('Link copied'), duration: 1800 }))}
            >
              {t('Copy')}
            </Button>
            <Link to={`/u/${profile!.username}`} className="inline-flex items-center gap-1 text-xs font-semibold text-accent-soft hover:underline">
              Open <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </Row>
      <Row>
        <Switch label={t('Show watch history on my public profile')} checked={showHistory} disabled={busy || !isPublic} onChange={(v) => void update({ show_history: v })} />
      </Row>
    </Card>
  )
}
