import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePreferences } from '@/hooks/useUserData'
import type { ThemePreference } from '@/types'

interface ThemeContextValue {
  theme: ThemePreference
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: ThemePreference) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { prefs, update } = usePreferences()
  const systemLight = useMediaQuery('(prefers-color-scheme: light)')
  const resolvedTheme = prefs.theme === 'system' ? (systemLight ? 'light' : 'dark') : prefs.theme

  useEffect(() => {
    const root = document.documentElement
    if (root.getAttribute('data-theme') === resolvedTheme) return
    root.classList.add('theme-switching')
    root.setAttribute('data-theme', resolvedTheme)
    root.style.colorScheme = resolvedTheme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'dark' ? '#0b0b10' : '#f6f7fb')
    const id = window.setTimeout(() => root.classList.remove('theme-switching'), 60)
    return () => window.clearTimeout(id)
  }, [resolvedTheme])

  useEffect(() => {
    document.documentElement.toggleAttribute('data-reduce-motion', prefs.reduceMotion)
  }, [prefs.reduceMotion])

  // Appearance preferences are applied as attributes so CSS tokens handle the rest.
  useEffect(() => {
    const root = document.documentElement
    if (prefs.accent === 'crimson') root.removeAttribute('data-accent')
    else root.setAttribute('data-accent', prefs.accent)
    root.setAttribute('data-font', prefs.fontScale)
    root.toggleAttribute('data-blur-synopsis', prefs.blurSynopsis)
  }, [prefs.accent, prefs.fontScale, prefs.blurSynopsis])

  const setTheme = useCallback((t: ThemePreference) => update('theme', t), [update])
  const toggleTheme = useCallback(() => update('theme', resolvedTheme === 'dark' ? 'light' : 'dark'), [update, resolvedTheme])

  const value = useMemo(() => ({ theme: prefs.theme, resolvedTheme, setTheme, toggleTheme }), [prefs.theme, resolvedTheme, setTheme, toggleTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
