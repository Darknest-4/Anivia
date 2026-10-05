import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Crumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  eyebrow?: string
  crumbs?: Crumb[]
  actions?: ReactNode
  className?: string
  children?: ReactNode
}

/** Consistent page title block with optional breadcrumbs and actions. */
export function PageHeader({ title, description, eyebrow, crumbs, actions, className, children }: PageHeaderProps) {
  return (
    <header className={cn('relative pb-6 pt-8 sm:pt-10', className)}>
      <div className="pointer-events-none absolute -top-24 left-0 h-56 w-[min(600px,80vw)] rounded-full bg-accent/10 blur-3xl" aria-hidden />
      {crumbs && <Breadcrumbs items={crumbs} className="relative mb-4" />}
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-2 text-accent-soft">{eyebrow}</p>}
          <h1 className="text-3xl font-bold text-fg sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-[15px]">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-fg-subtle">
        {items.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            {c.to ? (
              <Link to={c.to} className="hover:text-fg">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-fg-muted">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
