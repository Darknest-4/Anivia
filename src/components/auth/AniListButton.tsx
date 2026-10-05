import { cn } from '@/lib/cn'
import { useAniList } from '@/providers/AniListProvider'

/** AniList wordmark-style badge (simple “A” mark — not the official logo). */
export function AniListMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center justify-center rounded-md bg-[#02a9ff] font-display font-extrabold text-white', className)} aria-hidden>
      A
    </span>
  )
}

export function AniListButton({ label = 'Continue with AniList', returnTo, className }: { label?: string; returnTo?: string; className?: string }) {
  const { connect, connecting, account } = useAniList()
  if (account) return null
  return (
    <button
      type="button"
      onClick={() => connect(returnTo)}
      disabled={connecting}
      className={cn(
        'flex h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-[#0b1622] text-sm font-semibold text-white ring-1 ring-inset ring-[#02a9ff]/40 transition-colors hover:bg-[#152232] disabled:opacity-60',
        className,
      )}
    >
      <AniListMark className="h-6 w-6 text-sm" />
      {connecting ? 'Connecting…' : label}
    </button>
  )
}
