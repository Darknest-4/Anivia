import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Resets scroll on route changes (keeps hash anchors and query-only updates in place). */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      return
    }
    // Pages are lazy-loaded, so the anchor may not exist yet — keep looking for a moment.
    let tries = 0
    let timer: number | undefined
    const find = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) el.scrollIntoView()
      else if (tries++ < 20) timer = window.setTimeout(find, 100)
    }
    find()
    return () => window.clearTimeout(timer)
  }, [pathname, hash])
  return null
}
