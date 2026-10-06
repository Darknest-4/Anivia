import { t } from '@/i18n'
import { Check, Copy, Link2, Mail, MessageCircle, Send, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Dialog, Input } from '@/components/ui'
import { config } from '@/config'
import { useToast } from '@/providers/ToastProvider'
import { thumb } from '@/lib/images'
interface ShareDialogProps {
  /** What is being shared. */
  title: string
  /** App path, e.g. `/anime/celestial-eclipse`. */
  path: string
  image?: string
  open: boolean
  onClose: () => void
  heading?: string
}

/** Share sheet. Social targets are generic placeholders — wire them to your preferred services. */
export function ShareDialog({ title, path, image, open, onClose, heading = 'Share anime' }: ShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  const url = `${typeof window !== 'undefined' ? window.location.origin : config.siteUrl}${path}`
  const text = t('Check out “{p0}” on {p1}', { p0: title, p1: config.appName })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      /* Clipboard unavailable — the input remains selectable. */
    }
    setCopied(true)
    toast({ title: t('Link copied'), description: url })
    window.setTimeout(() => setCopied(false), 2000)
  }

  const targets = [
    { label: t('Message'), icon: MessageCircle, href: `sms:?&body=${encodeURIComponent(`${text} ${url}`)}` },
    { label: t('Email'), icon: Mail, href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n${url}`)}` },
    { label: t('Post'), icon: Send, href: '#', disabled: true },
    {
      label: t('More'),
      icon: Share2,
      onClick: () => {
        if (navigator.share) navigator.share({ title, text, url }).catch(() => undefined)
        else copy()
      },
    },
  ]

  return (
    <Dialog open={open} onClose={onClose} title={heading} description={t('Send this link to a friend.')} icon={<Share2 className="h-5 w-5" />}>
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
        {image && <img src={thumb(image)} alt="" className="h-16 w-11 rounded-md object-cover" />}
        <div className="min-w-0">
          <p className="truncate font-semibold text-fg">{title}</p>
          <p className="truncate text-xs text-fg-subtle">{url}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2">
        {targets.map((tg) => {
          const inner = (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-3 text-fg transition-colors group-hover:bg-accent group-hover:text-white">
                <tg.icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-medium text-fg-muted">{tg.label}</span>
            </>
          )
          return tg.href && !tg.disabled ? (
            <a key={tg.label} href={tg.href} className="group flex flex-col items-center gap-2 rounded-xl p-2 hover:bg-surface-2">
              {inner}
            </a>
          ) : (
            <button
              key={tg.label}
              type="button"
              disabled={tg.disabled}
              title={tg.disabled ? t('Connect your social integration') : undefined}
              onClick={tg.onClick}
              className="group flex flex-col items-center gap-2 rounded-xl p-2 hover:bg-surface-2 disabled:opacity-40"
            >
              {inner}
            </button>
          )
        })}
      </div>
      <div className="mt-5">
        <label htmlFor="share-url" className="mb-1.5 block text-[13px] font-medium text-fg">
          {t('Page link')}
        </label>
        <Input
          id="share-url"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          leftIcon={<Link2 />}
          rightSlot={
            <button type="button" onClick={copy} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t('Copied') : t('Copy')}
            </button>
          }
          className="pr-24"
        />
      </div>
    </Dialog>
  )
}
