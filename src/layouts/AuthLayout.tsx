import { ArrowLeft } from 'lucide-react'
import { Suspense } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Logo } from '@/components/ui'
import { useFeatured } from '@/hooks/queries'
import { cn } from '@/lib/cn'

/** Split-screen authentication layout with cinematic artwork collage (desktop). */
export function AuthLayout() {
  const { data } = useFeatured()
  const posters = (data ?? []).slice(0, 6)
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-4 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="ANIVIA home">
            <Logo />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
        </div>
        <main id="main" className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>
        <p className="text-center text-xs text-fg-subtle">Authentication screens are UI-only. Connect your own auth provider.</p>
      </div>
      <div data-theme="dark" className="relative hidden overflow-hidden bg-bg lg:block" aria-hidden>
        <div className="absolute inset-0 grid rotate-[-8deg] scale-125 grid-cols-3 gap-4 opacity-80">
          {[0, 1, 2].map((col) => (
            <div key={col} className={cn('flex flex-col gap-4', col === 1 && 'translate-y-24')}>
              {[...posters, ...posters].slice(col * 2, col * 2 + 5).map((a, i) => (
                <img key={`${a.id}-${i}`} src={a.poster} alt="" className="aspect-[2/3] w-full rounded-2xl object-cover shadow-pop" />
              ))}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-bg/30" />
        <div className="absolute inset-x-12 bottom-14">
          <p className="font-display text-4xl font-extrabold leading-tight text-fg">
            Discover. Watch.
            <br />
            <span className="text-gradient-accent">Remember.</span>
          </p>
          <p className="mt-3 max-w-md text-sm text-fg-muted">Track every series, never miss a release and pick up exactly where you left off — on every device.</p>
        </div>
      </div>
    </div>
  )
}
