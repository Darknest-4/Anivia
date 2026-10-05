import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { config } from '@/config'

interface Meta {
  title?: string
  description?: string
  image?: string
  type?: 'website' | 'video.tv_show' | 'video.episode' | 'profile' | 'article'
  noindex?: boolean
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = href
}

const DEFAULT_DESCRIPTION =
  'ANIVIA — discover trending anime, follow weekly release schedules, track your watchlist and pick up right where you left off.'

/** Sets document title, description, canonical URL and Open Graph / Twitter tags for the current page. */
export function useDocumentMeta({ title, description, image, type = 'website', noindex }: Meta) {
  const { pathname } = useLocation()
  useEffect(() => {
    const fullTitle = title ? `${title} · ${config.appName}` : `${config.appName} — ${config.tagline}`
    const desc = description ?? DEFAULT_DESCRIPTION
    const url = `${config.siteUrl.replace(/\/$/, '')}${pathname}`
    document.title = fullTitle
    setMeta('name', 'description', desc)
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:url', url)
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', desc)
    // Data-URI demo artwork is not a valid OG image; only emit real URLs.
    if (image && /^https?:/.test(image)) setMeta('property', 'og:image', image)
    setCanonical(url)
  }, [title, description, image, type, noindex, pathname])
}
