import { useEffect, useRef } from 'react'

/** Registers a global keyboard shortcut. `combo` examples: "mod+k", "/", "escape". */
export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void, enabled = true) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    if (!enabled) return
    const parts = combo.toLowerCase().split('+')
    const key = parts[parts.length - 1]
    const needsMod = parts.includes('mod')
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key) return
      if (needsMod !== (e.metaKey || e.ctrlKey)) return
      if (!needsMod) {
        const t = e.target as HTMLElement | null
        if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      }
      ref.current(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [combo, enabled])
}
