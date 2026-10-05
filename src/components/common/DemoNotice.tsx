import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Small inline notice that clearly separates demo-only UI from real backend functionality. */
export function DemoNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border border-info/25 bg-info/10 px-3.5 py-3 text-[13px] leading-relaxed text-fg-muted', className)} role="note">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
      <div>{children}</div>
    </div>
  )
}
