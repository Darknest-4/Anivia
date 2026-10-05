import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

interface SectionHeaderProps {
  title: string
  eyebrow?: string
  description?: string
  href?: string
  linkLabel?: string
  icon?: ReactNode
  aside?: ReactNode
  className?: string
  id?: string
}

export function SectionHeader({ title, eyebrow, description, href, linkLabel = 'View all', icon, aside, className, id }: SectionHeaderProps) {
  return (
    <div className={cn('mb-5 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5 text-accent-soft">{eyebrow}</p>}
        <h2 id={id} className="flex items-center gap-2.5 text-xl font-bold text-fg sm:text-2xl">
          {icon && <span className="text-accent-soft [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">{icon}</span>}
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {aside}
      {href && (
        <Link to={href} className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-fg-muted transition-colors hover:text-fg">
          <span className="hidden xs:inline">{linkLabel}</span>
          <span className="xs:hidden">All</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}
