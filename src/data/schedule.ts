/**
 * Weekly broadcast slots for airing demo titles.
 * day: 0 = Monday … 6 = Sunday. time: 24h local time.
 */
export const broadcastSlots: Record<string, { day: number; time: string; delayed?: boolean }> = {
  'mistral-academy': { day: 0, time: '18:30' },
  'seven-seas-kitchen': { day: 0, time: '21:00' },
  'starfall-idols': { day: 0, time: '23:30' },
  'gearheart-rebellion': { day: 1, time: '19:00' },
  'hanabi-detective-agency': { day: 1, time: '22:00' },
  'narukami-rising': { day: 2, time: '17:30' },
  'glass-garden-academy': { day: 2, time: '22:30' },
  'moonlit-protocol': { day: 2, time: '23:45', delayed: true },
  'neon-ronin': { day: 3, time: '00:30' },
  'spirit-court': { day: 3, time: '20:00' },
  'ghostlight-express': { day: 3, time: '23:00' },
  'phantom-signal': { day: 4, time: '01:00' },
  'after-the-rain-cafe': { day: 4, time: '21:30' },
  'starlight-relay': { day: 4, time: '23:00' },
  'celestial-eclipse': { day: 5, time: '23:00' },
  'frostbound-oath': { day: 5, time: '21:30' },
  'crimson-orbit': { day: 5, time: '17:00' },
  'wolves-of-the-northern-gate': { day: 6, time: '22:00' },
  'shadowline-tokyo': { day: 6, time: '23:30' },
  'quiet-blade': { day: 6, time: '00:15' },
  'lotus-engine': { day: 6, time: '18:00' },
}
