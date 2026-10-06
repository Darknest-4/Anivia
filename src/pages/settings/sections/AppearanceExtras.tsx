import { t } from '@/i18n'
import { Check } from 'lucide-react'
import { Switch } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { AccentColor, Preferences } from '@/types'
import { Card, Choice, Row } from '../parts'

const ACCENTS: { value: AccentColor; label: string; color: string }[] = [
  { value: 'crimson', label: t('Crimson'), color: 'hsl(348 83% 54%)' },
  { value: 'pink', label: t('Sakura'), color: 'hsl(325 82% 56%)' },
  { value: 'violet', label: t('Violet'), color: 'hsl(265 85% 62%)' },
  { value: 'blue', label: t('Azure'), color: 'hsl(217 91% 58%)' },
  { value: 'cyan', label: t('Cyan'), color: 'hsl(192 85% 40%)' },
  { value: 'emerald', label: t('Emerald'), color: 'hsl(155 70% 38%)' },
  { value: 'amber', label: t('Sunset'), color: 'hsl(28 92% 50%)' },
]

type Set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => void

export function AppearanceExtras({ prefs, set }: { prefs: Preferences; set: Set }) {
  return (
    <>
      <Card title={t('Language')} description={t('The page reloads to switch the language.')}>
        <Row>
          <Choice
            label={t('Interface language')}
            value={prefs.language}
            onChange={(v) => {
              set('language', v)
              // The language is fixed per page load; give the store a tick to persist first.
              window.setTimeout(() => window.location.reload(), 150)
            }}
            options={[
              { value: 'auto', label: t('Auto (browser)') },
              { value: 'en', label: 'English' },
              { value: 'hu', label: 'Magyar' },
            ]}
          />
        </Row>
      </Card>
      <Card title={t('Accent color')} description={t('Buttons, highlights, progress bars and focus rings.')}>
        <Row>
          <div role="radiogroup" aria-label={t('Accent color')} className="flex flex-wrap gap-3">
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
      <Card title={t('Layout')}>
        <Row>
          <Choice
            label={t('Text size')}
            value={prefs.fontScale}
            onChange={(v) => set('fontScale', v)}
            options={[
              { value: 'sm', label: t('Small') },
              { value: 'md', label: t('Default') },
              { value: 'lg', label: t('Large') },
            ]}
          />
        </Row>
        <Row>
          <Choice
            label={t('Poster grid density')}
            description={t('Compact fits more titles per row.')}
            value={prefs.density}
            onChange={(v) => set('density', v)}
            options={[
              { value: 'comfortable', label: t('Comfortable') },
              { value: 'compact', label: t('Compact') },
            ]}
          />
        </Row>
        <Row>
          <Switch label={t('Rotate the home spotlight')} description={t('Automatically cycle featured titles on the home page.')} checked={prefs.heroAutoplay} onChange={(v) => set('heroAutoplay', v)} />
        </Row>
      </Card>
    </>
  )
}
