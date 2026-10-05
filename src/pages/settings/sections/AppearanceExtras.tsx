import { Check } from 'lucide-react'
import { Switch } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { AccentColor, Preferences } from '@/types'
import { Card, Choice, Row } from '../parts'

const ACCENTS: { value: AccentColor; label: string; color: string }[] = [
  { value: 'crimson', label: 'Crimson', color: 'hsl(348 83% 54%)' },
  { value: 'pink', label: 'Sakura', color: 'hsl(325 82% 56%)' },
  { value: 'violet', label: 'Violet', color: 'hsl(265 85% 62%)' },
  { value: 'blue', label: 'Azure', color: 'hsl(217 91% 58%)' },
  { value: 'cyan', label: 'Cyan', color: 'hsl(192 85% 40%)' },
  { value: 'emerald', label: 'Emerald', color: 'hsl(155 70% 38%)' },
  { value: 'amber', label: 'Sunset', color: 'hsl(28 92% 50%)' },
]

type Set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => void

export function AppearanceExtras({ prefs, set }: { prefs: Preferences; set: Set }) {
  return (
    <>
      <Card title="Accent color" description="Buttons, highlights, progress bars and focus rings.">
        <Row>
          <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                role="radio"
                aria-checked={prefs.accent === a.value}
                aria-label={a.label}
                title={a.label}
                onClick={() => set('accent', a.value)}
                className={cn('flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-colors', prefs.accent === a.value ? 'bg-surface-2' : 'hover:bg-surface-2/60')}
              >
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface', prefs.accent === a.value ? 'ring-fg' : 'ring-transparent')} style={{ background: a.color }}>
                  {prefs.accent === a.value && <Check className="h-5 w-5 text-white" />}
                </span>
                <span className="text-2xs font-semibold text-fg-muted">{a.label}</span>
              </button>
            ))}
          </div>
        </Row>
      </Card>
      <Card title="Layout">
        <Row>
          <Choice
            label="Text size"
            value={prefs.fontScale}
            onChange={(v) => set('fontScale', v)}
            options={[
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Default' },
              { value: 'lg', label: 'Large' },
            ]}
          />
        </Row>
        <Row>
          <Choice
            label="Poster grid density"
            description="Compact fits more titles per row."
            value={prefs.density}
            onChange={(v) => set('density', v)}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        </Row>
        <Row>
          <Switch label="Rotate the home spotlight" description="Automatically cycle featured titles on the home page." checked={prefs.heroAutoplay} onChange={(v) => set('heroAutoplay', v)} />
        </Row>
      </Card>
    </>
  )
}
