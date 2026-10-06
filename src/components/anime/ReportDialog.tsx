import { t } from '@/i18n'
import { Flag } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, Dialog, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useToast } from '@/providers/ToastProvider'
import { backend } from '@/services/backend'

const reasons = ['Wrong information', 'Playback issue', 'Subtitle problem', 'Missing episode', 'Inappropriate content', 'Other']

/** Content/playback issue report, stored in the Supabase `reports` table. */
export function ReportDialog({ open, onClose, subject }: { open: boolean; onClose: () => void; subject: string }) {
  const [reason, setReason] = useState(reasons[0])
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const toast = useToast()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await backend.sendReport({ subject, reason, details: details.trim(), page_url: window.location.pathname + window.location.search })
      setDetails('')
      onClose()
      toast({ title: t('Report submitted'), description: t('Thanks! Our team will review it shortly.') })
    } catch (err) {
      toast({ title: t('Report not sent'), description: (err as Error).message, variant: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('Report an issue')} description={subject} icon={<Flag className="h-5 w-5" />}>
      <form id="report-form" onSubmit={submit} className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-fg">{t('What’s wrong?')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {reasons.map((r) => (
              <label
                key={r}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                  reason === r ? 'border-accent/60 bg-accent/10 text-fg' : 'border-line text-fg-muted hover:border-line-strong',
                )}
              >
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[hsl(var(--accent))]" />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="report-details" className="mb-1.5 block text-[13px] font-medium text-fg">
            Details <span className="font-normal text-fg-subtle">{t('(optional)')}</span>
          </label>
          <Textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder={t('Tell us a little more…')} maxLength={500} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button type="submit" loading={sending}>
            {t('Submit report')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
