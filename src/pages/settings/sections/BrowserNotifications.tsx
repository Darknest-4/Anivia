import { BellRing } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'

/** Asks for permission to show desktop/mobile notifications while ANIVIA is open. */
export function BrowserNotifications() {
  const supported = typeof Notification !== 'undefined'
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied')
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-fg">Browser notifications</p>
        <p className="text-[13px] text-fg-subtle">
          {!supported
            ? 'This browser does not support notifications.'
            : permission === 'granted'
              ? 'Enabled — you’ll get a pop-up when a new episode from your watchlist is out while ANIVIA is open.'
              : permission === 'denied'
                ? 'Blocked — allow notifications for this site in your browser settings.'
                : 'Get a pop-up when a new episode from your watchlist is out.'}
        </p>
      </div>
      {supported && permission === 'default' && (
        <Button variant="secondary" size="sm" leftIcon={<BellRing className="h-4 w-4" />} onClick={async () => setPermission(await Notification.requestPermission())}>
          Enable
        </Button>
      )}
    </div>
  )
}
