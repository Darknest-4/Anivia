import { hu } from './hu'

/**
 * Tiny i18n: English text is the key, `hu.ts` holds the Hungarian translations.
 * The language is chosen once per page load (Settings → Appearance → Language reloads the page),
 * so module-level labels translate too. "auto" follows the browser language.
 */
export type Lang = 'en' | 'hu'
export type LangSetting = 'auto' | Lang

function setting(): LangSetting {
  try {
    const p = JSON.parse(localStorage.getItem('anivia:preferences') ?? '{}') as { language?: string }
    if (p.language === 'en' || p.language === 'hu') return p.language
  } catch {
    /* storage unavailable */
  }
  return 'auto'
}

function detect(): Lang {
  const s = setting()
  if (s !== 'auto') return s
  return typeof navigator !== 'undefined' && /^hu\b/i.test(navigator.language) ? 'hu' : 'en'
}

export const lang: Lang = typeof window === 'undefined' ? 'en' : detect()
/** BCP-47 locale for dates and numbers. */
export const locale = lang === 'hu' ? 'hu-HU' : 'en-US'
if (typeof document !== 'undefined') document.documentElement.lang = lang

export function t(text: string, vars?: Record<string, unknown>): string {
  let out = lang === 'hu' ? (hu[text] ?? text) : text
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? "") : m))
  return out
}
