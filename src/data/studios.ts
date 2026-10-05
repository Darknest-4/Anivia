import type { Studio } from '@/types'

/** Fictional demo studios. Any resemblance to real companies is coincidental. */
export const studioRecords: Omit<Studio, 'animeCount'>[] = [
  { id: 'lumen-arc', name: 'Lumen Arc', country: 'Japan', founded: 2004, logoHue: 350, employees: 320, description: 'Known for luminous color scripts and cinematic large-scale action, Lumen Arc is the studio behind several of the decade’s most talked-about fantasy epics.' },
  { id: 'hoshikage-works', name: 'Hoshikage Works', country: 'Japan', founded: 1998, logoHue: 220, employees: 410, description: 'A veteran studio celebrated for meticulous mecha animation and grounded science fiction storytelling.' },
  { id: 'kitsune-frame', name: 'Kitsune Frame', country: 'Japan', founded: 2011, logoHue: 25, employees: 180, description: 'A boutique studio blending traditional folklore aesthetics with modern compositing techniques.' },
  { id: 'polaris-pictures', name: 'Polaris Pictures', country: 'Japan', founded: 1989, logoHue: 200, employees: 560, description: 'One of the oldest independent studios in the demo catalog, with a library spanning theatrical films and long-running TV series.' },
  { id: 'aozora-motion', name: 'Aozora Motion', country: 'Japan', founded: 2015, logoHue: 195, employees: 140, description: 'Bright palettes and expressive character acting make Aozora Motion a favorite for slice-of-life and sports titles.' },
  { id: 'red-lantern', name: 'Red Lantern Animation', country: 'South Korea', founded: 2009, logoHue: 5, employees: 260, description: 'A Seoul-based studio known for sharp action direction and stylish urban thrillers.' },
  { id: 'nightglass', name: 'Nightglass Studio', country: 'Japan', founded: 2017, logoHue: 265, employees: 120, description: 'An experimental studio exploring horror, mystery and psychological drama with bold visual language.' },
  { id: 'tessellate', name: 'Tessellate Animation', country: 'Canada', founded: 2019, logoHue: 165, employees: 95, description: 'An international co-production house specializing in hybrid 2D/3D pipelines and web-first series.' },
  { id: 'mirage-seven', name: 'Mirage Seven', country: 'Japan', founded: 2001, logoHue: 40, employees: 290, description: 'Mirage Seven balances blockbuster shōnen adaptations with a growing slate of original anime.' },
  { id: 'kazehana', name: 'Kazehana Animation', country: 'Japan', founded: 1994, logoHue: 330, employees: 230, description: 'Famous for soft lighting, delicate romance and award-winning musical sequences.' },
  { id: 'ironleaf', name: 'Ironleaf Studios', country: 'France', founded: 2013, logoHue: 120, employees: 110, description: 'A European studio bringing painterly backgrounds and literary adaptations to the anime format.' },
  { id: 'velvet-comet', name: 'Velvet Comet', country: 'Japan', founded: 2020, logoHue: 290, employees: 85, description: 'A young, fast-rising studio behind several breakout original series and music-driven projects.' },
]
