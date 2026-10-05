import { Check, Minus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Dialog, Tabs } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { cn } from '@/lib/cn'

type Billing = 'monthly' | 'yearly'

const plans = [
  { id: 'free', name: 'Free', price: 0, tagline: 'Start exploring the catalog.', features: ['Full catalog browsing', 'Watchlist & history', 'HD streaming with ads', '1 screen'], cta: 'Current plan' },
  { id: 'plus', name: 'Plus', price: 6.99, tagline: 'Ad-free viewing for every fan.', features: ['Everything in Free', 'No ads', 'Full HD 1080p', '2 screens at once', 'New episodes 1 hour after Japan'], cta: 'Choose Plus', popular: true },
  { id: 'pro', name: 'Pro', price: 11.99, tagline: 'The ultimate anime experience.', features: ['Everything in Plus', '4K Ultra HD where available', '4 screens at once', 'Offline downloads', 'Early access to premieres'], cta: 'Choose Pro' },
]

const comparison: [string, (string | boolean)[]][] = [
  ['Ad-free playback', [false, true, true]],
  ['Maximum quality', ['720p', '1080p', '4K']],
  ['Simultaneous screens', ['1', '2', '4']],
  ['Offline downloads', [false, false, true]],
  ['Simulcast timing', ['1 week later', '1 hour', '1 hour']],
  ['Early premieres', [false, false, true]],
]

const faqs = [
  ['Can I cancel anytime?', 'Yes. Plans renew automatically and can be cancelled from your account settings at any time.'],
  ['Is there a free trial?', 'Plus and Pro include a 7-day free trial for new members in supported regions.'],
  ['Which devices are supported?', 'ANIVIA runs in any modern browser on desktop, tablet and phone.'],
  ['Is this checkout real?', 'No — this pricing page is part of the ANIVIA UI template. Connect your own payment provider to enable subscriptions.'],
]

export default function PricingPage() {
  useDocumentMeta({ title: 'Pricing', description: 'Compare ANIVIA plans — Free, Plus and Pro.' })
  const [billing, setBilling] = useState<Billing>('monthly')
  const [selected, setSelected] = useState<string | null>(null)
  const price = (p: number) => (billing === 'yearly' ? p * 10 : p)

  return (
    <div className="container-app">
      <PageHeader className="text-center [&>div]:items-center [&>div]:justify-center [&_p]:mx-auto" eyebrow="Plans" title="Pick the plan that fits your watchlist" description="Simple pricing. Upgrade, downgrade or cancel anytime." />
      <div className="flex justify-center">
        <Tabs
          items={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: <span className="flex items-center gap-1.5">Yearly <Badge variant="success">2 months free</Badge></span> },
          ]}
          value={billing}
          onChange={setBilling}
          label="Billing period"
          variant="segmented"
          idPrefix="billing"
        />
      </div>

      <div className="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-3">
        {plans.map((p) => (
          <article
            key={p.id}
            className={cn('relative flex flex-col rounded-3xl border bg-surface p-6 sm:p-8', p.popular ? 'border-accent/60 shadow-glow lg:-translate-y-2' : 'border-line')}
          >
            {p.popular && (
              <Badge variant="solid" size="md" className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Sparkles className="h-3.5 w-3.5" /> Most popular
              </Badge>
            )}
            <h2 className="text-lg font-semibold text-fg">{p.name}</h2>
            <p className="mt-1 text-sm text-fg-subtle">{p.tagline}</p>
            <p className="mt-6 flex items-end gap-1">
              <span className="font-display text-4xl font-bold text-fg">${price(p.price).toFixed(p.price ? 2 : 0)}</span>
              <span className="pb-1 text-sm text-fg-subtle">/{billing === 'yearly' ? 'year' : 'month'}</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-fg-muted">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="mt-8 w-full" size="lg" variant={p.popular ? 'primary' : 'secondary'} disabled={p.id === 'free'} onClick={() => setSelected(p.name)}>
              {p.cta}
            </Button>
          </article>
        ))}
      </div>

      <section aria-labelledby="compare-heading" className="mx-auto mt-20 max-w-5xl">
        <h2 id="compare-heading" className="mb-6 text-center text-2xl font-bold text-fg">
          Compare features
        </h2>
        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-fg">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Feature
                </th>
                {plans.map((p) => (
                  <th key={p.id} scope="col" className="px-5 py-3 text-center font-semibold">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {comparison.map(([label, values]) => (
                <tr key={label}>
                  <th scope="row" className="px-5 py-3.5 font-medium text-fg-muted">
                    {label}
                  </th>
                  {values.map((v, i) => (
                    <td key={i} className="px-5 py-3.5 text-center text-fg">
                      {v === true ? <Check className="mx-auto h-4 w-4 text-success" aria-label="Included" /> : v === false ? <Minus className="mx-auto h-4 w-4 text-fg-subtle" aria-label="Not included" /> : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {plans.map((p, pi) => (
            <div key={p.id} className="rounded-2xl border border-line bg-surface p-4">
              <p className="font-semibold text-fg">{p.name}</p>
              <dl className="mt-3 divide-y divide-line/70">
                {comparison.map(([label, values]) => (
                  <div key={label} className="flex justify-between py-2 text-sm">
                    <dt className="text-fg-muted">{label}</dt>
                    <dd className="font-medium text-fg">{values[pi] === true ? 'Yes' : values[pi] === false ? '—' : values[pi]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="mx-auto mt-20 max-w-3xl">
        <h2 id="faq-heading" className="mb-6 text-center text-2xl font-bold text-fg">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {faqs.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border border-line bg-surface px-5 py-4 open:border-line-strong">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-xl leading-none text-fg-subtle transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`Upgrade to ${selected}`}
        description="Payments are not processed in this template."
        icon={<Sparkles className="h-5 w-5" />}
        footer={<Button onClick={() => setSelected(null)}>Got it</Button>}
      >
        <p className="text-sm leading-relaxed text-fg-muted">
          ANIVIA is a frontend template — no checkout, billing or subscription logic is included. Connect your preferred payment provider and subscription backend to complete this flow.
        </p>
      </Dialog>
    </div>
  )
}
