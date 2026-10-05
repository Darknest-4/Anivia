import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Resets scroll on route changes (keeps hash anchors and query-only updates in place). */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
      return
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
  return null
}
