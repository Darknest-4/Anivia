import { Flag } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, Dialog, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useToast } from '@/providers/ToastProvider'

const reasons = ['Wrong information', 'Playback issue', 'Subtitle problem', 'Missing episode', 'Inappropriate content', 'Other']

/** UI-only report form. Submit sends nothing — connect it to your support/API endpoint. */
export function ReportDialog({ open, onClose, subject }: { open: boolean; onClose: () => void; subject: string }) {
  const [reason, setReason] = useState(reasons[0])
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const toast = useToast()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    window.setTimeout(() => {
      setSending(false)
      setDetails('')
      onClose()
      toast({ title: 'Report submitted', description: 'Thanks! Our team will review it shortly.' })
    }, 700)
  }

  return (
    <Dialog open={open} onClose={onClose} title="Report an issue" description={subject} icon={<Flag className="h-5 w-5" />}>
      <form id="report-form" onSubmit={submit} className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-fg">What’s wrong?</legend>
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
            Details <span className="font-normal text-fg-subtle">(optional)</span>
          </label>
          <Textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Tell us a little more…" maxLength={500} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={sending}>
            Submit report
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
