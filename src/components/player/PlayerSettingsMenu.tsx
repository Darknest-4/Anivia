import { t } from '@/i18n'
import { Check, ChevronLeft, ChevronRight, Gauge, MonitorPlay, Repeat, Subtitles } from 'lucide-react'
import { useState } from 'react'
import { Switch } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { SubtitleTrack } from '@/types'

interface Props {
  qualities: string[]
  quality: string
  onQuality: (q: string) => void
  subtitles: SubtitleTrack[]
  subtitle: string | null
  onSubtitle: (id: string | null) => void
  rate: number
  onRate: (r: number) => void
  autoNext: boolean
  onAutoNext: (v: boolean) => void
}

type Panel = 'main' | 'quality' | 'subtitles' | 'speed'
const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

export function PlayerSettingsMenu(props: Props) {
  const [panel, setPanel] = useState<Panel>('main')
  const subLabel = props.subtitles.find((s) => s.id === props.subtitle)?.label ?? t('Off')

  const Row = ({ icon: Icon, label, value, to }: { icon: typeof Gauge; label: string; value: string; to: Panel }) => (
    <button type="button" onClick={() => setPanel(to)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/90 hover:bg-white/10">
      <Icon className="h-4 w-4 text-white/60" />
      <span className="flex-1 text-left">{label}</span>
      <span className="text-white/55">{value}</span>
      <ChevronRight className="h-4 w-4 text-white/40" />
    </button>
  )

  const Back = ({ title }: { title: string }) => (
    <button type="button" onClick={() => setPanel('main')} className="mb-1 flex w-full items-center gap-2 border-b border-white/10 px-2 pb-2 pt-1 text-sm font-semibold text-white">
      <ChevronLeft className="h-4 w-4" />
      {title}
    </button>
  )

  const Option = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={() => {
        onClick()
        setPanel('main')
      }}
      className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/10', active ? 'font-semibold text-white' : 'text-white/75')}
    >
      <Check className={cn('h-4 w-4 text-accent-soft', active ? 'opacity-100' : 'opacity-0')} />
      {label}
    </button>
  )

  return (
    <div role="menu" aria-label={t('Player settings')} className="w-64 animate-scale-in rounded-xl border border-white/10 bg-black/85 p-1.5 shadow-pop backdrop-blur-xl">
      {panel === 'main' && (
        <>
          <Row icon={MonitorPlay} label={t('Quality')} value={props.quality === 'auto' ? t('Auto') : props.quality} to="quality" />
          <Row icon={Subtitles} label={t('Subtitles')} value={subLabel} to="subtitles" />
          <Row icon={Gauge} label={t('Speed')} value={props.rate === 1 ? t('Normal') : `${props.rate}×`} to="speed" />
          <div className="mt-1 flex items-center gap-3 border-t border-white/10 px-3 pb-1 pt-2.5 text-sm text-white/90 [&_p]:text-white/90">
            <Repeat className="h-4 w-4 shrink-0 text-white/60" />
            <Switch label={t('Autoplay next')} checked={props.autoNext} onChange={props.onAutoNext} className="flex-1" />
          </div>
        </>
      )}
      {panel === 'quality' && (
        <>
          <Back title={t('Quality')} />
          {['auto', ...props.qualities].map((q) => (
            <Option key={q} active={props.quality === q} label={q === 'auto' ? t('Auto (recommended)') : q} onClick={() => props.onQuality(q)} />
          ))}
        </>
      )}
      {panel === 'subtitles' && (
        <>
          <Back title={t('Subtitles')} />
          <Option active={props.subtitle === null} label={t('Off')} onClick={() => props.onSubtitle(null)} />
          {props.subtitles.map((s) => (
            <Option key={s.id} active={props.subtitle === s.id} label={s.label} onClick={() => props.onSubtitle(s.id)} />
          ))}
        </>
      )}
      {panel === 'speed' && (
        <>
          <Back title={t('Playback speed')} />
          {RATES.map((r) => (
            <Option key={r} active={props.rate === r} label={r === 1 ? t('Normal') : `${r}×`} onClick={() => props.onRate(r)} />
          ))}
        </>
      )}
    </div>
  )
}
