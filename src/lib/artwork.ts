/**
 * Procedural, copyright-free SVG artwork (data URIs) generated from a small seed
 * (hue, secondary hue and motif) — used for decorative backgrounds such as the 404 page.
 */
import type { ArtworkMotif, ArtworkSeed } from '@/types'
import { createRng, type Rng } from './random'

const cache = new Map<string, string>()

const c = (h: number, s: number, l: number, a = 1) =>
  `hsla(${Math.round(((h % 360) + 360) % 360)},${s}%,${l}%,${a})`

const toDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

function memo(key: string, build: () => string) {
  const hit = cache.get(key)
  if (hit) return hit
  const value = toDataUri(build())
  cache.set(key, value)
  return value
}

interface SceneCtx {
  rng: Rng
  w: number
  h: number
  hue: number
  hue2: number
  groundY: number
}

/* ----------------------------------------------------------------------------
 * Scene layers
 * ------------------------------------------------------------------------- */

function sky({ w, h, hue, hue2, groundY }: SceneCtx) {
  return `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c(hue2, 55, 7)}"/>
      <stop offset="${(groundY / h) * 0.55}" stop-color="${c(hue2 + 10, 50, 16)}"/>
      <stop offset="${groundY / h}" stop-color="${c(hue, 70, 42)}"/>
      <stop offset="1" stop-color="${c(hue, 60, 18)}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${c(hue + 25, 95, 80, 0.85)}"/>
      <stop offset="0.35" stop-color="${c(hue + 10, 90, 60, 0.35)}"/>
      <stop offset="1" stop-color="${c(hue, 90, 50, 0)}"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.85"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>`
}

function stars({ rng, w, groundY }: SceneCtx, count = 60) {
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = rng.range(0, w)
    const y = rng.range(0, groundY * 0.85)
    const r = rng.range(0.4, 1.7)
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${rng.range(0.25, 0.9).toFixed(2)}"/>`
  }
  return out
}

function glowOrb(cx: number, cy: number, r: number, fill: string) {
  return `<circle cx="${cx}" cy="${cy}" r="${r * 2.6}" fill="url(#glow)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`
}

function ridge(ctx: SceneCtx, baseY: number, amp: number, steps: number, fill: string) {
  const { rng, w, h } = ctx
  let d = `M0 ${h} L0 ${baseY}`
  for (let i = 1; i <= steps; i++) {
    const x = (w / steps) * i
    const y = baseY - rng.range(0.15, 1) * amp
    const mx = x - w / steps / 2
    d += ` L${mx.toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(baseY - rng.range(0, 0.35) * amp).toFixed(1)}`
  }
  d += ` L${w} ${h} Z`
  return `<path d="${d}" fill="${fill}"/>`
}

const motifs: Record<ArtworkMotif, (ctx: SceneCtx) => string> = {
  moon(ctx) {
    const { rng, w, h, hue, groundY } = ctx
    const r = Math.min(w, h) * rng.range(0.17, 0.23)
    const cx = w * rng.range(0.55, 0.72)
    const cy = groundY * rng.range(0.38, 0.5)
    let craters = ''
    for (let i = 0; i < 6; i++) {
      craters += `<circle cx="${cx + rng.range(-r, r) * 0.6}" cy="${cy + rng.range(-r, r) * 0.6}" r="${r * rng.range(0.06, 0.18)}" fill="${c(hue + 30, 30, 70, 0.35)}"/>`
    }
    return (
      stars(ctx, 80) +
      glowOrb(cx, cy, r, c(hue + 35, 80, 90)) +
      craters +
      ridge(ctx, groundY + h * 0.02, h * 0.12, 7, c(ctx.hue2, 35, 10))
    )
  },
  peaks(ctx) {
    const { w, h, hue, hue2, groundY } = ctx
    return (
      stars(ctx, 40) +
      glowOrb(w * 0.3, groundY * 0.55, Math.min(w, h) * 0.12, c(hue + 30, 90, 85)) +
      ridge(ctx, groundY - h * 0.08, h * 0.3, 5, c(hue2 + 15, 30, 26, 0.9)) +
      ridge(ctx, groundY + h * 0.02, h * 0.22, 6, c(hue2 + 10, 35, 16)) +
      ridge(ctx, groundY + h * 0.1, h * 0.12, 9, c(hue2, 40, 8))
    )
  },
  city(ctx) {
    const { rng, w, h, hue, hue2, groundY } = ctx
    let out = stars(ctx, 30) + glowOrb(w * 0.5, groundY * 0.7, Math.min(w, h) * 0.18, c(hue + 20, 90, 70, 0.9))
    for (let layer = 0; layer < 2; layer++) {
      let x = -10
      while (x < w) {
        const bw = rng.range(w * 0.05, w * 0.13)
        const bh = rng.range(h * 0.12, h * (layer ? 0.32 : 0.48))
        const top = groundY + h * 0.08 * layer - bh
        out += `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${(h - top).toFixed(1)}" fill="${c(hue2, 30, layer ? 6 : 12)}"/>`
        for (let wy = top + 8; wy < groundY + 20; wy += 12) {
          for (let wx = x + 5; wx < x + bw - 6; wx += 9) {
            if (rng.chance(layer ? 0.22 : 0.12)) {
              out += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="3.5" height="5" fill="${c(rng.chance(0.5) ? hue + 40 : hue2 + 160, 95, 72, 0.9)}"/>`
            }
          }
        }
        if (layer === 1 && rng.chance(0.18)) {
          out += `<rect x="${(x + 4).toFixed(1)}" y="${(top + 14).toFixed(1)}" width="${(bw - 8).toFixed(1)}" height="7" rx="2" fill="none" stroke="${c(hue, 100, 65)}" stroke-width="2"/>`
        }
        x += bw + rng.range(0, 6)
      }
    }
    return out
  },
  orbit(ctx) {
    const { rng, w, h, hue, hue2, groundY } = ctx
    const r = Math.min(w, h) * 0.2
    const cx = w * rng.range(0.55, 0.7)
    const cy = groundY * 0.42
    return (
      `<defs><linearGradient id="planet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c(hue + 30, 85, 70)}"/><stop offset="1" stop-color="${c(hue2, 60, 20)}"/></linearGradient></defs>` +
      stars(ctx, 110) +
      `<circle cx="${cx}" cy="${cy}" r="${r * 2.2}" fill="url(#glow)" opacity="0.6"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.9}" ry="${r * 0.42}" fill="none" stroke="${c(hue + 40, 80, 80, 0.35)}" stroke-width="${r * 0.12}" transform="rotate(-16 ${cx} ${cy})"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#planet)"/>` +
      `<circle cx="${w * 0.2}" cy="${groundY * 0.22}" r="${r * 0.18}" fill="${c(hue2 + 30, 40, 70)}"/>` +
      ridge(ctx, groundY + h * 0.08, h * 0.06, 12, c(hue2, 30, 7))
    )
  },
  waves(ctx) {
    const { w, h, hue, hue2, groundY } = ctx
    let out = stars(ctx, 40) + glowOrb(w * 0.5, groundY - h * 0.02, Math.min(w, h) * 0.2, c(hue + 30, 95, 82))
    for (let i = 0; i < 5; i++) {
      const y = groundY + i * h * 0.07
      const a = h * 0.025 + i * 4
      const k = w / (2 + i * 0.5)
      let d = `M0 ${y}`
      for (let x = 0; x <= w + k; x += k) {
        d += ` Q ${x + k / 4} ${y - a} ${x + k / 2} ${y} T ${x + k} ${y}`
      }
      d += ` L${w} ${h} L0 ${h} Z`
      out += `<path d="${d}" fill="${c(hue2 + i * 6, 50, 22 - i * 3.5, 0.92)}"/>`
    }
    return out
  },
  sakura(ctx) {
    const { rng, w, h, hue, hue2, groundY } = ctx
    let out = glowOrb(w * 0.62, groundY * 0.48, Math.min(w, h) * 0.22, c(hue + 20, 75, 88))
    out += ridge(ctx, groundY + h * 0.06, h * 0.08, 6, c(hue2, 30, 10))
    out += `<path d="M -10 ${h * 0.08} C ${w * 0.25} ${h * 0.12}, ${w * 0.35} ${h * 0.2}, ${w * 0.55} ${h * 0.18} M ${w * 0.2} ${h * 0.11} C ${w * 0.3} ${h * 0.02}, ${w * 0.38} 0, ${w * 0.45} -5" stroke="${c(hue2, 35, 8)}" stroke-width="${w * 0.02}" fill="none" stroke-linecap="round"/>`
    for (let i = 0; i < 70; i++) {
      const x = rng.range(0, w)
      const y = rng.range(0, h)
      const s = rng.range(2.5, 6.5) * (w / 400)
      out += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${s.toFixed(1)}" ry="${(s * 0.55).toFixed(1)}" fill="${c(340 + rng.range(-10, 10), 85, rng.range(78, 90), rng.range(0.5, 0.95))}" transform="rotate(${rng.int(0, 180)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`
    }
    return out
  },
  blade(ctx) {
    const { rng, w, h, hue, hue2, groundY } = ctx
    let out = stars(ctx, 30)
    out += `<polygon points="${w * 0.02},${h * 0.92} ${w * 0.98},${h * 0.06} ${w},${h * 0.09} ${w * 0.06},${h * 0.95}" fill="${c(hue + 20, 100, 85, 0.95)}"/>`
    out += `<polygon points="${w * -0.1},${h * 0.98} ${w * 1.05},${h * 0.0} ${w * 1.1},${h * 0.1} ${w * 0},${h * 1.05}" fill="${c(hue, 100, 60, 0.25)}"/>`
    for (let i = 0; i < 14; i++) {
      const x = rng.range(0.1, 0.9) * w
      const y = h - (x / w) * h * 0.86 + rng.range(-40, 40)
      const s = rng.range(4, 14)
      out += `<polygon points="${x},${y} ${x + s},${y + s * 0.4} ${x + s * 0.2},${y + s}" fill="${c(hue + 30, 90, 80, 0.8)}"/>`
    }
    out += ridge(ctx, groundY + h * 0.12, h * 0.05, 10, c(hue2, 35, 6))
    return out
  },
  grid(ctx) {
    const { w, h, hue, hue2, groundY } = ctx
    const r = Math.min(w, h) * 0.24
    const cx = w * 0.5
    const cy = groundY - r * 0.35
    let out = stars(ctx, 50)
    out += `<defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c(hue + 50, 100, 70)}"/><stop offset="1" stop-color="${c(hue, 100, 55)}"/></linearGradient></defs>`
    out += `<circle cx="${cx}" cy="${cy}" r="${r * 2}" fill="url(#glow)" opacity="0.7"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sun)"/>`
    for (let i = 0; i < 6; i++) {
      const y = cy + r * 0.1 + i * r * 0.16
      out += `<rect x="${cx - r}" y="${y}" width="${r * 2}" height="${2 + i * 1.6}" fill="${c(hue2 + 10, 50, 16)}"/>`
    }
    out += `<rect x="0" y="${groundY}" width="${w}" height="${h - groundY}" fill="${c(hue2, 55, 7)}"/>`
    for (let i = -12; i <= 12; i++) {
      out += `<line x1="${cx}" y1="${groundY}" x2="${cx + i * w * 0.12}" y2="${h}" stroke="${c(hue, 100, 62, 0.55)}" stroke-width="1.2"/>`
    }
    for (let i = 1; i < 9; i++) {
      const y = groundY + (h - groundY) * Math.pow(i / 8, 2)
      out += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${c(hue, 100, 62, 0.5)}" stroke-width="1.2"/>`
    }
    return out
  },
  forest(ctx) {
    const { rng, w, h, hue, hue2, groundY } = ctx
    let out = stars(ctx, 40) + glowOrb(w * 0.4, groundY * 0.45, Math.min(w, h) * 0.13, c(hue + 30, 70, 88))
    for (let layer = 0; layer < 3; layer++) {
      const base = groundY + layer * h * 0.07
      const size = h * (0.13 + layer * 0.05)
      for (let x = -20; x < w + 20; x += size * rng.range(0.35, 0.55)) {
        const th = size * rng.range(0.7, 1.15)
        out += `<polygon points="${x},${base - th} ${x - th * 0.28},${base + 4} ${x + th * 0.28},${base + 4}" fill="${c(hue2 + 20, 35, 18 - layer * 5)}"/>`
      }
      out += `<rect x="0" y="${base}" width="${w}" height="${h - base}" fill="${c(hue2 + 20, 35, 18 - layer * 5)}"/>`
      out += `<rect x="0" y="${base - h * 0.05}" width="${w}" height="${h * 0.06}" fill="${c(hue, 40, 70, 0.08)}"/>`
    }
    return out
  },
  storm(ctx) {
    const { rng, w, h, hue, hue2, groundY } = ctx
    let out = ''
    for (let i = 0; i < 20; i++) {
      out += `<ellipse cx="${rng.range(-0.1, 1.1) * w}" cy="${rng.range(0.02, 0.3) * h}" rx="${rng.range(0.15, 0.35) * w}" ry="${rng.range(0.04, 0.08) * h}" fill="${c(hue2, 25, rng.range(10, 22), 0.85)}"/>`
    }
    let x = w * rng.range(0.4, 0.7)
    let y = h * 0.22
    let bolt = `M${x} ${y}`
    while (y < groundY) {
      x += rng.range(-30, 30) * (w / 400)
      y += rng.range(20, 45) * (h / 600)
      bolt += ` L${x.toFixed(1)} ${y.toFixed(1)}`
    }
    out += `<path d="${bolt}" stroke="${c(hue + 40, 100, 70, 0.4)}" stroke-width="10" fill="none" stroke-linejoin="round"/>`
    out += `<path d="${bolt}" stroke="#fff" stroke-width="2.5" fill="none" stroke-linejoin="round"/>`
    for (let i = 0; i < 80; i++) {
      const rx = rng.range(0, w)
      const ry = rng.range(0, h)
      out += `<line x1="${rx}" y1="${ry}" x2="${rx - 6}" y2="${ry + 18}" stroke="${c(hue2 + 20, 40, 80, 0.25)}" stroke-width="1"/>`
    }
    out += ridge(ctx, groundY + h * 0.06, h * 0.1, 8, c(hue2, 30, 7))
    return out
  },
}

/** A stylised character silhouette standing on the horizon. */
function figure(ctx: SceneCtx, x: number, scale: number, variant: number) {
  const { hue, hue2, groundY } = ctx
  const fill = c(hue2, 40, 4)
  const rim = c(hue + 25, 95, 72, 0.7)
  const hair =
    variant % 2 === 0
      ? 'M-13 -132 L-21 -143 L-8 -140 L-6 -153 L2 -142 L10 -155 L12 -140 L23 -145 L13 -129 Z'
      : 'M-13 -136 C -16 -150, 14 -152, 13 -134 C 18 -110, 16 -95, 20 -80 C 8 -92, -4 -100, -13 -118 Z'
  const prop =
    variant % 3 === 0
      ? '<path d="M-22 -62 L-72 -2 L-68 1 L-19 -58 Z"/>'
      : variant % 3 === 1
        ? '<path d="M14 -114 C 36 -96, 52 -60, 64 -6 C 46 -12, 32 -8, 18 -2 Z"/>'
        : '<path d="M24 -70 L30 -150 L33 -150 L28 -68 Z"/>'
  return `<g transform="translate(${x.toFixed(1)} ${(groundY + 6).toFixed(1)}) scale(${scale.toFixed(3)})" fill="${fill}" stroke="${rim}" stroke-width="1.2" stroke-linejoin="round">
    ${prop}
    <path d="M-15 -116 C -18 -100,-22 -70,-26 -30 L -29 0 L -8 0 L -4 -40 L 4 -40 L 8 0 L 29 0 L 26 -30 C 22 -70, 18 -100, 15 -116 Z"/>
    <circle cx="0" cy="-130" r="12"/>
    <path d="${hair}"/>
  </g>`
}

function wrapTitle(title: string, max = 13): string[] {
  const upper = title.toUpperCase()
  if (upper.length <= max || !upper.includes(' ')) return [upper]
  const words = upper.split(' ')
  let best: string[] = [upper]
  let bestDiff = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    const diff = Math.abs(a.length - b.length)
    if (diff < bestDiff) {
      bestDiff = diff
      best = [a, b]
    }
  }
  return best
}

function buildScene(seed: ArtworkSeed, key: string, w: number, h: number, figureX: number | null) {
  const rng = createRng(key)
  const ctx: SceneCtx = { rng, w, h, hue: seed.hue, hue2: seed.hue2, groundY: h * 0.68 }
  let body = sky(ctx) + motifs[seed.motif](ctx)
  if (figureX !== null) body += figure(ctx, figureX, (h / 600) * rng.range(0.9, 1.1), rng.int(0, 5))
  return body
}

/* ----------------------------------------------------------------------------
 * Public generators
 * ------------------------------------------------------------------------- */

export function createPoster(seed: ArtworkSeed, title: string, subtitle?: string) {
  return memo(`poster:${title}:${seed.hue}:${seed.motif}`, () => {
    const w = 400
    const h = 600
    const lines = wrapTitle(title)
    const longest = Math.max(...lines.map((l) => l.length))
    const size = Math.min(50, Math.floor(340 / (longest * 0.66)))
    const lineH = size * 1.02
    const baseY = h - 78 - (lines.length - 1) * lineH
    const text = lines
      .map(
        (l, i) =>
          `<text x="200" y="${baseY + i * lineH}" text-anchor="middle" font-family="Sora, Inter, 'Segoe UI', Arial, sans-serif" font-weight="800" font-size="${size}" letter-spacing="-0.5" fill="#fff">${escapeXml(l)}</text>`,
      )
      .join('')
    const sub = subtitle
      ? `<text x="200" y="${baseY - size - 2}" text-anchor="middle" font-family="Inter, 'Segoe UI', Arial, sans-serif" font-weight="600" font-size="11" letter-spacing="3.5" fill="${c(seed.hue + 30, 95, 78)}">${escapeXml(subtitle.toUpperCase())}</text>`
      : ''
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${buildScene(seed, title, w, h, w * 0.5)}
      <rect y="${h * 0.5}" width="${w}" height="${h * 0.5}" fill="url(#fade)"/>
      <rect width="${w}" height="${h}" fill="url(#vignette)"/>
      ${sub}${text}
    </svg>`
  })
}

export function createBackdrop(seed: ArtworkSeed, title: string) {
  return memo(`backdrop:${title}:${seed.hue}:${seed.motif}`, () => {
    const w = 1600
    const h = 900
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">${buildScene(seed, `${title}-wide`, w, h, w * 0.74)}
      <rect width="${w}" height="${h}" fill="url(#vignette)"/>
    </svg>`
  })
}

export function createEpisodeThumbnail(seed: ArtworkSeed, title: string, episode: number) {
  const motifsList = Object.keys(motifs) as ArtworkMotif[]
  const motif = episode % 4 === 0 ? motifsList[(motifsList.indexOf(seed.motif) + episode) % motifsList.length] : seed.motif
  const shifted: ArtworkSeed = { hue: seed.hue + ((episode * 17) % 50) - 25, hue2: seed.hue2, motif }
  return memo(`thumb:${title}:${episode}`, () => {
    const w = 640
    const h = 360
    const rng = createRng(`${title}-${episode}`)
    const figX = rng.chance(0.6) ? w * rng.range(0.2, 0.8) : null
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${buildScene(shifted, `${title}-ep${episode}`, w, h, figX)}<rect width="${w}" height="${h}" fill="url(#vignette)"/></svg>`
  })
}

export function createPortrait(hue: number, key: string) {
  return memo(`portrait:${key}`, () => {
    const rng = createRng(key)
    const w = 300
    const h = 400
    const hairVariants = [
      'M95 150 C 90 70, 210 60, 205 150 L 215 120 L 200 175 L 190 140 L 175 170 L 165 135 L 150 165 L 140 132 L 125 168 L 112 135 L 100 172 L 88 125 Z',
      'M92 160 C 85 70, 215 70, 208 160 C 214 220, 222 260, 232 300 L 205 290 C 200 240, 198 200, 195 170 L 105 170 C 102 200, 100 240, 95 290 L 68 300 C 78 260, 86 220, 92 160 Z',
      'M96 150 C 92 80, 208 78, 204 150 C 206 175, 208 190, 210 205 L 192 200 L 190 150 L 110 150 L 108 200 L 90 205 C 92 190, 94 175, 96 150 Z',
      'M100 140 C 110 80, 200 70, 205 140 L 230 110 L 205 160 L 100 160 L 70 112 Z',
    ]
    const hair = rng.pick(hairVariants)
    const hue2 = hue + rng.range(140, 220)
    const eyeY = rng.range(168, 176)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c(hue, 60, 30)}"/><stop offset="1" stop-color="${c(hue2, 50, 10)}"/></linearGradient>
        <radialGradient id="halo" cx="0.5" cy="0.42" r="0.5"><stop offset="0" stop-color="${c(hue + 30, 90, 75, 0.7)}"/><stop offset="1" stop-color="${c(hue, 90, 50, 0)}"/></radialGradient>
        <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c(hue2, 25, 22)}"/><stop offset="1" stop-color="${c(hue2, 30, 10)}"/></linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
      <circle cx="150" cy="170" r="150" fill="url(#halo)"/>
      ${Array.from({ length: 18 }, () => `<circle cx="${rng.range(0, w)}" cy="${rng.range(0, h)}" r="${rng.range(0.6, 2)}" fill="#fff" opacity="${rng.range(0.2, 0.7)}"/>`).join('')}
      <path d="M40 400 C 50 320, 95 290, 130 280 L 130 250 L 170 250 L 170 280 C 205 290, 250 320, 260 400 Z" fill="url(#skin)" stroke="${c(hue + 30, 90, 70, 0.6)}" stroke-width="2"/>
      <ellipse cx="150" cy="180" rx="52" ry="64" fill="url(#skin)" stroke="${c(hue + 30, 90, 70, 0.6)}" stroke-width="2"/>
      <path d="${hair}" fill="${c(rng.pick([hue, hue2, 0, 220, 30]), rng.range(40, 80), rng.range(14, 55))}" stroke="${c(hue + 30, 90, 70, 0.5)}" stroke-width="1.5"/>
      <ellipse cx="130" cy="${eyeY}" rx="7" ry="4" fill="${c(hue + 40, 100, 75)}"/>
      <ellipse cx="170" cy="${eyeY}" rx="7" ry="4" fill="${c(hue + 40, 100, 75)}"/>
      <path d="M95 400 L 150 320 L 205 400 Z" fill="${c(hue, 60, 45, 0.5)}"/>
    </svg>`
  })
}

function escapeXml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
