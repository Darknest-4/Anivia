import { t } from '@/i18n'
import { BellOff, BellRing } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui'
import { useAuth } from '@/providers/AuthProvider'
import { useFlag } from '@/providers/PlatformProvider'
import { useToast } from '@/providers/ToastProvider'
import { currentSubscription, disablePush, enablePush, pushSupported } from '@/services/platform/push'

/**
 * Push notifications for new episodes of titles you watch or plan to watch — they arrive even
 * when ANIVIA is closed. Without an account, falls back to pop-ups while the site is open.
 */
export function BrowserNotifications() {
  const { status } = useAuth()
  const pushOn = useFlag('push_notifications')
  const toast = useToast()
  const supported = typeof Notification !== 'undefined'
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const canPush = pushOn && status === 'signed-in' && pushSupported()

  useEffect(() => {
    if (canPush) void currentSubscription().then((s) => setSubscribed(Boolean(s)))
  }, [canPush])

  const toggle = async () => {
    setBusy(true)
    try {
      if (subscribed) {
        await disablePush()
        setSubscribed(false)
        toast({ title: t('Push notifications off'), variant: 'info' })
      } else {
        await enablePush()
        setSubscribed(true)
        setPermission('granted')
        toast({ title: t('Push notifications on'), description: t('You’ll be notified when a new episode from your list is out — even when ANIVIA is closed.') })
      }
    } catch (e) {
      toast({ title: t('Couldn’t change notifications'), description: (e as Error).message, variant: 'error' })
      if (supported) setPermission(Notification.permission)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-fg">{canPush ? 'Push notifications' : 'Browser notifications'}</p>
        <p className="text-[13px] text-fg-subtle">
          {!supported
            ? t('This browser does not support notifications.')
            : permission === 'denied'
              ? t('Blocked — allow notifications for this site in your browser settings.')
              : canPush
                ? subscribed
                  ? t('On — new episodes of titles you watch or plan to watch reach you even when ANIVIA is closed.')
                  : t('Get notified about new episodes of your Watching / Plan to watch titles, even when ANIVIA is closed. On iPhone, add ANIVIA to your Home Screen first.')
                : permission === 'granted'
                  ? t('Enabled while ANIVIA is open. Sign in to get them even when it’s closed.')
                  : t('Get a pop-up when a new episode from your watchlist is out.')}
        </p>
      </div>
      {supported && permission !== 'denied' && (canPush ? (
        <Button variant={subscribed ? 'ghost' : 'secondary'} size="sm" loading={busy} leftIcon={subscribed ? <BellOff className="h-4 w-4" /> : <BellRing className="h-4 w-4" />} onClick={() => void toggle()}>
          {subscribed ? t('Turn off') : t('Turn on')}
        </Button>
      ) : permission === 'default' ? (
        <Button variant="secondary" size="sm" leftIcon={<BellRing className="h-4 w-4" />} onClick={async () => setPermission(await Notification.requestPermission())}>
          {t('Enable')}
        </Button>
      ) : null)}
    </div>
  )
}
