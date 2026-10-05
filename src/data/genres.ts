import type { Genre } from '@/types'

/** Fictional demo catalog — genre definitions. */
export const genreRecords: Omit<Genre, 'animeCount'>[] = [
  { id: 'g-action', slug: 'action', name: 'Action', hue: 350, description: 'High-stakes battles, kinetic choreography and heroes pushed past their limits.' },
  { id: 'g-adventure', slug: 'adventure', name: 'Adventure', hue: 28, description: 'Uncharted lands, long roads and companions forged along the journey.' },
  { id: 'g-comedy', slug: 'comedy', name: 'Comedy', hue: 48, description: 'Sharp timing, warm chaos and characters who never quite get it right.' },
  { id: 'g-drama', slug: 'drama', name: 'Drama', hue: 215, description: 'Character-driven stories about loss, ambition and the choices that define us.' },
  { id: 'g-fantasy', slug: 'fantasy', name: 'Fantasy', hue: 268, description: 'Magic systems, ancient kingdoms and myths that refuse to stay buried.' },
  { id: 'g-romance', slug: 'romance', name: 'Romance', hue: 335, description: 'Slow burns, confessions under fireworks and hearts out of sync.' },
  { id: 'g-sci-fi', slug: 'sci-fi', name: 'Sci-Fi', hue: 190, description: 'Starships, synthetic minds and futures that feel uncomfortably close.' },
  { id: 'g-mystery', slug: 'mystery', name: 'Mystery', hue: 250, description: 'Locked rooms, unreliable witnesses and truths hidden in plain sight.' },
  { id: 'g-horror', slug: 'horror', name: 'Horror', hue: 140, description: 'Dread that creeps in slowly — and stays long after the credits roll.' },
  { id: 'g-sports', slug: 'sports', name: 'Sports', hue: 20, description: 'Rivalries, training arcs and the final seconds that change everything.' },
  { id: 'g-slice-of-life', slug: 'slice-of-life', name: 'Slice of Life', hue: 95, description: 'Quiet moments, small victories and the beauty of ordinary days.' },
  { id: 'g-thriller', slug: 'thriller', name: 'Thriller', hue: 5, description: 'Relentless tension, impossible deadlines and nobody you can fully trust.' },
  { id: 'g-mecha', slug: 'mecha', name: 'Mecha', hue: 205, description: 'Towering machines, pilot bonds and wars fought in steel and light.' },
  { id: 'g-supernatural', slug: 'supernatural', name: 'Supernatural', hue: 285, description: 'Spirits, curses and the thin veil between our world and the next.' },
  { id: 'g-psychological', slug: 'psychological', name: 'Psychological', hue: 230, description: 'Mind games, fractured identities and stories that question reality.' },
  { id: 'g-music', slug: 'music', name: 'Music', hue: 315, description: 'Bands, idols and the songs that carry a generation forward.' },
  { id: 'g-historical', slug: 'historical', name: 'Historical', hue: 38, description: 'Reimagined eras, warring clans and legends rooted in the past.' },
]
