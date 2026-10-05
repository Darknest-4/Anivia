import type { ReactNode } from 'react'
import { PageHeader } from '@/components/common/PageHeader'

interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

/** Shared layout for legal documents: sticky table of contents + readable prose column. */
export function LegalLayout({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="container-app">
      <PageHeader crumbs={[{ label: 'Home', to: '/' }, { label: title }]} eyebrow={`Last updated ${updated}`} title={title} description={intro} />
      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ol className="sticky top-[calc(var(--header-h)+1.5rem)] space-y-1 border-l border-line">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-fg-subtle hover:border-fg-subtle hover:text-fg">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="max-w-3xl space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-fg">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-fg-muted">{s.body}</div>
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}
