import { t } from '@/i18n'
import { Compass, Home } from 'lucide-react'
import { ButtonLink } from '@/components/ui'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { createBackdrop } from '@/lib/artwork'

const art = createBackdrop({ hue: 265, hue2: 230, motif: 'moon' }, 'lost-in-another-world')

export default function NotFoundPage() {
  useDocumentMeta({ title: t('Page not found'), noindex: true })
  return (
    <section className="cinematic relative isolate overflow-hidden">
      <div data-theme="dark" className="relative text-fg">
        <img src={art} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-80" />
        <div className="hero-fade-bottom absolute inset-0 -z-10" />
        <div className="absolute inset-0 -z-10 bg-bg/40" />
        <div className="container-app flex min-h-[72vh] flex-col items-center justify-center py-20 text-center">
          <p className="font-display text-[clamp(6rem,22vw,13rem)] font-extrabold leading-none tracking-tighter text-white/90 drop-shadow-[0_8px_40px_rgba(0,0,0,0.5)]">404</p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{t('Lost in another world?')}</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            {t('The page you’re looking for has drifted beyond the map. Let’s get you back to familiar skies.')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink to="/" size="lg" leftIcon={<Home className="h-5 w-5" />}>
              {t('Go Home')}
            </ButtonLink>
            <ButtonLink to="/browse" size="lg" variant="glass" leftIcon={<Compass className="h-5 w-5" />}>
              {t('Browse Anime')}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}
