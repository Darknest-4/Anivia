import { BellRing, Bookmark, MonitorSmartphone, Sparkles } from 'lucide-react'
import { ButtonLink } from '@/components/ui'
import { config } from '@/config'

const perks = [
  { icon: Bookmark, title: 'Smart watchlist', body: 'Track status, favorites and progress.' },
  { icon: BellRing, title: 'Release reminders', body: 'Never miss a new episode again.' },
  { icon: MonitorSmartphone, title: 'Any screen', body: 'Designed for phone, tablet and TV-size displays.' },
  { icon: Sparkles, title: 'Up to 4K', body: 'Cinematic quality on supported titles.' },
]

export function JoinBanner() {
  return (
    <section aria-labelledby="join-heading" className="container-app">
      <div className="relative isolate overflow-hidden rounded-3xl border border-line bg-surface px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <div className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-accent/25 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 left-1/3 -z-10 h-72 w-72 rounded-full bg-info/10 blur-3xl" aria-hidden />
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow text-accent-soft">Your anime universe</p>
            <h2 id="join-heading" className="mt-2 text-3xl font-bold leading-tight text-fg sm:text-4xl">
              Everything you watch.
              <br />
              <span className="text-gradient-accent">Remembered.</span>
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-muted sm:text-[15px]">
              Create a free account to sync your watchlist, history and preferences — then pick up right where you left off.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink to="/register" size="lg">
                Create free account
              </ButtonLink>
              {config.enablePricing && (
                <ButtonLink to="/pricing" size="lg" variant="outline">
                See plans
              </ButtonLink>
              )}
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {perks.map((p) => (
              <li key={p.title} className="rounded-2xl border border-line bg-surface-2/60 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12 text-accent-soft">
                  <p.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-fg">{p.title}</p>
                <p className="mt-1 text-[13px] text-fg-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
