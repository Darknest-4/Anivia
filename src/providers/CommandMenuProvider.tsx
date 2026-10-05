import { createContext, lazy, Suspense, useContext, useMemo, useState, type ReactNode } from 'react'
import { useHotkey } from '@/hooks/useHotkey'

const CommandMenu = lazy(() => import('@/components/navigation/CommandMenu'))

interface CommandMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const CommandMenuContext = createContext<CommandMenuContextValue | null>(null)

export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useHotkey('mod+k', (e) => {
    e.preventDefault()
    setMounted(true)
    setOpen((o) => !o)
  })

  const value = useMemo(
    () => ({
      open,
      setOpen: (next: boolean) => {
        if (next) setMounted(true)
        setOpen(next)
      },
    }),
    [open],
  )

  return (
    <CommandMenuContext.Provider value={value}>
      {children}
      {mounted && (
        <Suspense fallback={null}>
          <CommandMenu open={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </CommandMenuContext.Provider>
  )
}

export function useCommandMenu() {
  const ctx = useContext(CommandMenuContext)
  if (!ctx) throw new Error('useCommandMenu must be used within CommandMenuProvider')
  return ctx
}
