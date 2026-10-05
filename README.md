# ANIVIA — Premium Anime Streaming & Discovery UI Template

> **Discover. Watch. Remember.**
> ANIVIA is a premium, responsive, frontend-only anime streaming and discovery UI template that developers can connect to their own API and backend.

ANIVIA gives you a complete, production-quality anime frontend — not just a homepage. It ships with a cinematic design system, 30 routes, a full catalog with search and filtering, title and episode pages, a fully interactive player UI, watchlist, history, schedule, seasons, genres, characters, studios, profile, settings, auth screens and pricing. Everything runs on **fictional local demo data** behind a clean provider layer, so you can swap in your own legitimate backend without touching the UI.

---

## Table of contents

1. [Product overview](#1-product-overview)
2. [Features](#2-features)
3. [Technology](#3-technology)
4. [Requirements](#4-requirements)
5. [Installation](#5-installation)
6. [Development](#6-development)
7. [Production build](#7-production-build)
8. [Environment variables](#8-environment-variables)
9. [Project structure](#9-project-structure)
10. [Customization](#10-customization)
11. [Theme customization](#11-theme-customization)
12. [Mock data](#12-mock-data)
13. [API integration](#13-api-integration)
14. [AnimeProvider integration](#14-animeprovider-integration)
15. [VideoProvider integration](#15-videoprovider-integration)
16. [Local storage](#16-local-storage)
17. [Deployment](#17-deployment)
18. [Troubleshooting](#18-troubleshooting)
19. [License](#19-license)

---

## 1. Product overview

ANIVIA is the frontend foundation for:

- anime catalog and database websites
- anime discovery platforms and community sites
- **legal** streaming services
- watchlist and tracking applications
- release-schedule websites
- personal anime media dashboards

**What it is:** a polished React + TypeScript interface with an API-ready architecture.

**What it is not:** a streaming service. ANIVIA contains **no backend, no database, no authentication server, no payment processing, no video hosting, no copyrighted anime artwork or video, no scrapers and no third-party streaming sources.** All titles, characters, studios, episodes and artwork are fictional and generated specifically for this template.

---

## 2. Features

**Experience**

- Cinematic home page: auto-rotating hero spotlight, Continue Watching, Trending, Latest Releases, Editor’s Spotlight, Top Rated, Popular This Week, Seasonal, Genres, Recently Updated, Coming Soon, Recommended for You and Studios
- Dedicated mobile compositions — mobile hero, bottom tab bar, slide-in drawer, bottom-sheet filters and episode drawer
- Dark (signature), Light and System themes with zero-flash theme bootstrapping
- `Cmd/Ctrl + K` command palette with navigation, actions and live anime search
- Toast notifications, accessible dialogs, drawers, popovers and tabs

**Catalog**

- Browse with combinable filters (genre, year, season, status, type, rating, language), 8 sort orders, grid/list views and 12/24/48 pagination — all URL-synced and shareable
- Search page with debounced client-side relevance search across title, alternative title, genre, studio, character, tags and description; result categories; recent searches; suggestions; and initial / searching / results / no-results / error states
- Autocomplete combobox with grouped suggestions (anime, genres, characters, studios)
- Genres, seasons (current / previous / upcoming / any season), weekly release schedule (Today / Tomorrow / This Week), characters and studios directories with detail pages

**Titles & playback**

- Anime details: backdrop, poster, full metadata panel, stats, next-episode countdown, synopsis, tags, episodes, characters, staff, studios, related titles and recommendations
- Episode system: search, season & range selectors, sort, watch progress, watched indicators, filler and locked (unaired) states
- Watch page: cinematic player with play/pause, seek with buffered range and hover preview, volume, fullscreen (with iOS fallback), settings (quality, subtitles, speed, autoplay), subtitles UI, previous/next, skip intro, autoplay-next countdown, double-tap seek on touch and keyboard shortcuts
- Player states: playing, paused, loading, buffering, finished, no source, error and fullscreen — plus an in-page **state preview** for demos

**Library (frontend-only, persisted in `localStorage`)**

- Watchlist with statuses (Watching, Plan to Watch, Completed, On Hold, Dropped), search, filter, sort, grid/list, confirm-to-remove and undo
- Watch history, Continue Watching and per-episode progress
- Favorites, profile with statistics and genre breakdown
- Settings: appearance, playback, notifications, privacy, language and account

**Quality**

- TypeScript strict mode, small composable components, centralized design tokens
- Lazy-loaded routes, lazy images, memoized cards, skeleton loaders everywhere
- Semantic HTML, a single `h1` per page, keyboard navigation, focus states, ARIA labels, focus-trapped dialogs, reduced-motion support
- Per-page SEO: title, description, canonical URL, Open Graph and Twitter tags

---

## 3. Technology

| Layer | Choice |
| --- | --- |
| Framework | React 18 + TypeScript (strict) |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 with CSS-variable design tokens |
| Routing | React Router 6 (data router, lazy routes) |
| Data layer | TanStack Query 5 on top of the provider interfaces |
| Icons | Lucide React |

No UI kit dependencies (no MUI/Bootstrap/jQuery). Dialogs, drawers, tabs, toasts, popovers, the command palette and the player are all built in.

---

## 4. Requirements

- **Node.js 18.18+** (Node 20 or 22 LTS recommended)
- npm 9+ (or pnpm / yarn)
- A modern browser: Chrome, Edge, Firefox, Safari, iOS Safari, Android Chrome

---

## 5. Installation

```bash
# 1. Unzip the package and enter the folder
cd anivia

# 2. Install dependencies
npm install

# 3. (Optional) create your local environment file
cp .env.example .env.local
```

---

## 6. Development

```bash
npm run dev        # start the dev server on http://localhost:5173
npm run typecheck  # TypeScript project check
```

The app works immediately with the built-in mock provider — no environment variables required.

Demo tips:

- Press **Ctrl/⌘ K** anywhere to open the command palette.
- Search for **`!error`** to preview the search error state.
- On any watch page, use **Player state preview** to inspect every player state.
- **Settings → Account → Reset demo data** restores the seeded library.

---

## 7. Production build

```bash
npm run build      # type-checks, then builds to /dist
npm run preview    # serve the production build locally
```

The output in `dist/` is a static single-page application that can be hosted anywhere.

---

## 8. Environment variables

All variables are optional. Copy `.env.example` to `.env.local` to override them.

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | *(empty)* | Base URL of **your** API. When empty, the mock providers are always used. |
| `VITE_ANIME_PROVIDER` | `mock` | `mock` or `api` (uses `ApiAnimeProvider` when a base URL is set). |
| `VITE_VIDEO_PROVIDER` | `mock` | `mock` or `api` (uses `ApiVideoProvider` when a base URL is set). |
| `VITE_MOCK_LATENCY` | `350` | Artificial latency (ms) of mock providers so loading states are visible. Use `0` to disable. |
| `VITE_SITE_URL` | `https://anivia.example.com` | Public URL used for canonical and Open Graph tags. |

> Variables prefixed with `VITE_` are embedded in the client bundle. **Never put secrets in them.**

All configuration is read in one place: `src/config/index.ts`.

---

## 9. Project structure

```
src/
├─ App.tsx                     Root route element (router-aware providers)
├─ main.tsx                    Entry: providers, router, demo seed
├─ config/                     Runtime configuration (env with safe defaults)
├─ routes/                     Route table with lazy-loaded pages
├─ layouts/                    MainLayout, LibraryLayout (sidebar), AuthLayout (split screen)
├─ pages/
│  ├─ public/                  Home page + home sections
│  ├─ catalog/                 Browse, Search, Genres, Season, Schedule, Characters, Studios…
│  ├─ anime/                   Details (+ tabs), Watch, Episodes
│  ├─ profile/                 Watchlist, History, Profile
│  ├─ settings/                Settings
│  ├─ auth/                    Login, Register, Forgot password (UI-only)
│  └─ info/                    Pricing, About, Contact, Privacy, Terms, 404
├─ components/
│  ├─ ui/                      Design-system primitives (Button, Dialog, Drawer, Tabs, Select…)
│  ├─ anime/                   AnimeCard variants, Hero, Grid, Row, Episode list, Share…
│  ├─ player/                  VideoPlayer, SeekBar, settings menu, overlays, usePlayback
│  ├─ navigation/              Navbar, MobileNav, MobileDrawer, Footer, CommandMenu, sidebar
│  ├─ search/                  SearchAutocomplete, FilterPanel, CatalogBrowser, ViewToggle
│  ├─ schedule/                ScheduleList
│  ├─ profile/                 Profile header, stats, genre breakdown
│  ├─ auth/                    Auth form helpers
│  └─ common/                  PageHeader, SectionHeader, ErrorBoundary, DemoNotice…
├─ providers/                  Theme, Toast, Command menu, App providers
├─ hooks/                      queries.ts (data hooks), user-data hooks, utilities
├─ services/
│  ├─ anime/                   AnimeProvider interface, MockAnimeProvider, ApiAnimeProvider, mappers
│  ├─ video/                   VideoProvider interface, MockVideoProvider, ApiVideoProvider
│  ├─ user/                    Watchlist, history, favorites, preferences, recent searches
│  └─ storage/                 Safe localStorage wrapper + observable persistent stores
├─ data/                       Fictional demo records (anime, characters, studios, genres…)
├─ lib/                        Filters, search, formatting, seasons, procedural artwork
├─ types/                      Domain models (Anime, Episode, Character, Studio…)
└─ styles/                     Tailwind entry + design tokens
```

**The golden rule:** pages never import from `src/data`. They read data only through the hooks in `src/hooks/queries.ts`, which call the active provider.

---

## 10. Customization

- **Brand name & tagline** — `src/config/index.ts` and `index.html`.
- **Logo** — `src/components/ui/Logo.tsx` (pure SVG) and `public/favicon.svg`.
- **Navigation** — every menu (top bar, mobile tabs, drawer, sidebar, command palette) is driven by `src/components/navigation/navItems.ts`.
- **Footer** — `src/components/navigation/Footer.tsx`.
- **Home sections** — reorder or remove sections in `src/pages/public/HomePage.tsx`; each section is its own component in `src/pages/public/home/`.
- **Card styles** — all card variants live in `src/components/anime/` (`AnimeCard`, `AnimeCardCompact`, `AnimeCardHorizontal`, `AnimeCardFeatured`, `AnimeCardContinueWatching`, `AnimeCardList`, `AnimeCardGrid`).
- **Fonts** — loaded in `index.html` (Inter + Sora) and mapped in `tailwind.config.js → fontFamily`.

---

## 11. Theme customization

All colors are CSS variables (HSL channels) defined in `src/styles/index.css` for both themes:

```css
:root, [data-theme='dark'] {
  --bg: 236 16% 4.5%;
  --surface: 236 13% 7.5%;
  --accent: 348 83% 54%;      /* brand accent */
  --accent-soft: 350 100% 74%; /* accent used for text on dark */
  /* … */
}
[data-theme='light'] { /* light overrides */ }
```

Tailwind maps them to utilities (`bg-surface`, `text-fg-muted`, `bg-accent/15`, `border-line`…) in `tailwind.config.js`, along with radius, shadow, z-index, transition and breakpoint tokens. Change the accent once and the whole UI — buttons, badges, focus rings, progress bars, glows — follows.

Theme behavior:

- Preference (`dark` / `light` / `system`) is saved in `localStorage` (`anivia:preferences`).
- An inline script in `index.html` applies the theme **before first paint** to prevent flashes.
- Cinematic areas (hero, details backdrop, 404) intentionally render in the dark scheme in both themes via a scoped `data-theme="dark"` wrapper.

---

## 12. Mock data

The demo catalog lives in `src/data/` and is entirely fictional:

| File | Content |
| --- | --- |
| `anime.ts` | 48 titles with descriptions, ratings, popularity, seasons, studios, tags and relations |
| `characters.ts` | 29 characters with fictional voice cast |
| `studios.ts` | 12 fictional studios |
| `genres.ts` | 17 genres |
| `schedule.ts` | 21 weekly broadcast slots |
| `episodes.ts` | Episode titles (≈720 episodes are generated) and demo subtitle lines |

`src/services/anime/mock/catalog.ts` hydrates these records into full domain models, generating episodes, ranks, counts and schedule state.

**Artwork** is procedurally generated SVG (`src/lib/artwork.ts`) — posters, backdrops, episode thumbnails and character portraits — so the repository contains **no copyrighted images**. Real providers simply return image URLs instead.

---

## 13. API integration

ANIVIA talks to data exclusively through two interfaces:

```
UI (pages/components)
   └─ hooks/queries.ts  (TanStack Query: caching, loading & error states)
        ├─ AnimeProvider  ← MockAnimeProvider | ApiAnimeProvider | YourProvider
        └─ VideoProvider  ← MockVideoProvider | ApiVideoProvider | YourProvider
```

The quickest path:

1. Set `VITE_API_BASE_URL=https://api.your-domain.com` and `VITE_ANIME_PROVIDER=api`.
2. Make your API follow the endpoint conventions documented in `src/services/anime/apiAnimeProvider.ts` **or** edit those paths.
3. Adjust the response shapes and mapping functions in `src/services/anime/apiMappers.ts`.

> Only connect content and media you are licensed to use. This template does not — and must not be used to — scrape protected services, bypass DRM or embed unauthorized streams.

---

## 14. AnimeProvider integration

The full contract is in `src/services/anime/AnimeProvider.ts`:

```ts
export interface AnimeProvider {
  getFeatured(): Promise<Anime[]>
  getTrending(): Promise<Anime[]>
  getPopular(): Promise<Anime[]>
  getRecent(): Promise<Anime[]>
  getTopRated(): Promise<Anime[]>
  getUpcoming(): Promise<Anime[]>
  getLatestEpisodes(limit?: number): Promise<EpisodeRelease[]>
  getCurrentSeason(): Promise<SeasonInfo>
  getSeason(season: SeasonName, year: number): Promise<Anime[]>
  getAnime(id: string): Promise<Anime | null>
  getAnimeByIds(ids: string[]): Promise<Anime[]>
  getRelated(id: string): Promise<Anime[]>
  getRecommendations(seedIds: string[], limit?: number): Promise<Anime[]>
  browse(query: BrowseQuery): Promise<Paginated<Anime>>
  search(query: string): Promise<Anime[]>
  getSuggestions(query: string): Promise<SearchSuggestions>
  getGenres(): Promise<Genre[]>
  getGenre(slug: string): Promise<Genre | null>
  getSchedule(): Promise<ScheduleItem[]>
  getEpisodes(animeId: string): Promise<Episode[]>
  getEpisode(animeId: string, episodeId: string): Promise<Episode | null>
  getCharacters(query?: CharacterQuery): Promise<Character[]>
  getCharacter(id: string): Promise<Character | null>
  getStudios(): Promise<Studio[]>
  getStudio(id: string): Promise<Studio | null>
}
```

### Creating a `CustomAnimeProvider`

```ts
// src/services/anime/customAnimeProvider.ts
import type { AnimeProvider } from './AnimeProvider'
import { ApiAnimeProvider } from './apiAnimeProvider'
import { mapAnime, type ApiAnime } from './apiMappers'

/** Start from the REST reference provider and override what differs in your API. */
export class CustomAnimeProvider extends ApiAnimeProvider implements AnimeProvider {
  async getTrending() {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/v2/charts/trending?limit=20`)
    if (!res.ok) throw new Error(`Trending failed: ${res.status}`)
    const json: { data: ApiAnime[] } = await res.json()
    return json.data.map(mapAnime)
  }
}
```

Register it in `src/services/anime/index.ts`:

```ts
function createAnimeProvider(): AnimeProvider {
  return new CustomAnimeProvider()
}
```

You can also implement the interface from scratch (GraphQL, Firebase, Supabase, a CMS…). TypeScript will tell you exactly which methods remain.

### Mapping external data

Keep API-specific shapes out of the UI by mapping them in one place (`apiMappers.ts`):

| ANIVIA model | Required fields | Notes |
| --- | --- | --- |
| `Anime` | `id`, `slug`, `title`, `description`, `poster`, `status`, `type`, `genres`, `studios`, `languages`, `quality`, `popularity`, `updatedAt` | `backdrop`, `rating`, `episodes`, `nextEpisodeAt`, `staff`, `relatedIds` are optional but enrich the UI. `artwork` is only used by the demo generator. |
| `Episode` | `id`, `animeId`, `number`, `season`, `title`, `synopsis`, `airDate`, `duration` (seconds), `thumbnail` | Set `locked: true` for unreleased episodes. |
| `Character` | `id`, `name`, `role`, `animeId`, `description`, `voiceActor`, `favorites`, `image` | |
| `Genre` | `id`, `slug`, `name`, `description`, `hue` | `hue` (0–360) colors chips and tiles. |
| `Studio` | `id`, `name`, `country`, `founded`, `description`, `logoHue` | |

Status values map to `'airing' | 'finished' | 'upcoming' | 'hiatus'` and formats to `'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special'` — see `STATUS` and `TYPES` in `apiMappers.ts`.

### Errors

Throw (or reject) from any provider method and the UI shows a friendly error state with **Try again**. `ProviderError` carries an optional HTTP status.

---

## 15. VideoProvider integration

```ts
export interface VideoProvider {
  getSource(animeId: string, episodeId: string): Promise<VideoSource | null>
}

interface VideoSource {
  kind: 'mp4' | 'hls' | 'dash' | 'demo'
  url?: string
  duration: number
  qualities: string[]
  subtitles: SubtitleTrack[]
  poster?: string
}
```

- **`MockVideoProvider`** (default) returns a `demo` source: playback is **simulated** over generated artwork so every control and state can be demonstrated. No media file is involved. Locked episodes return `null`.
- **Returning `null`** shows: *“Connect your video provider to start playback.”*
- **`ApiVideoProvider`** is a reference implementation that requests `GET {API}/anime/:animeId/episodes/:episodeId/source` from **your own licensed media backend** and plays `mp4` sources through a native `<video>` element.

Connecting your backend:

```ts
// src/services/video/index.ts
export const videoProvider: VideoProvider = {
  async getSource(animeId, episodeId) {
    const res = await fetch(`${config.apiBaseUrl}/playback/${episodeId}`, { credentials: 'include' })
    if (res.status === 404) return null
    if (!res.ok) throw new Error('Playback unavailable')
    return res.json() // { kind: 'mp4', url, duration, qualities, subtitles }
  },
}
```

**HLS / DASH:** Safari plays HLS natively. For other browsers, add a library such as `hls.js` (or `dash.js`) and attach it to the `<video>` element in `src/components/player/VideoPlayer.tsx` when `source.kind === 'hls'`. Use signed URLs and your platform’s licensed DRM solution; ANIVIA does not include, and must not be used for, DRM circumvention.

Progress is reported through the player’s `onProgress` callback (see `WatchPage.tsx`), which writes to the history service — replace it with a call to your user API to sync across devices.

---

## 16. Local storage

ANIVIA persists only non-sensitive, per-device data. All keys are prefixed with `anivia:`.

| Key | Content |
| --- | --- |
| `anivia:preferences` | Theme, playback, notification, privacy and language preferences |
| `anivia:watchlist` | `{ animeId, status, addedAt, updatedAt }[]` |
| `anivia:history` | `{ animeId, episodeId, episodeNumber, progress, duration, lastWatched, completed }[]` |
| `anivia:favorites` | Anime ids |
| `anivia:recent-searches` | Recent search terms |
| `anivia:view-mode` | Grid / list preference |
| `anivia:demo-seeded` | Whether the demo library was seeded |

No passwords, tokens, payment data or API secrets are ever stored. The stores (`src/services/user/stores.ts`) are observable, sync across browser tabs, and can be replaced with API-backed implementations that keep the same method signatures.

To start with an empty library instead of demo data, remove the `seedDemoLibrary()` call in `src/main.tsx`.

---

## 17. Deployment

`npm run build` produces a static SPA in `dist/`. Configure your host to **rewrite all routes to `index.html`**:

- **Netlify** — `public/_redirects` is included (`/*  /index.html  200`)
- **Vercel** — `vercel.json` with the SPA rewrite is included
- **Nginx** — `location / { try_files $uri /index.html; }`
- **Apache** — `FallbackResource /index.html`
- **Cloudflare Pages / GitHub Pages / S3 + CloudFront** — configure a SPA fallback to `index.html`

Set `VITE_*` variables in your host’s build settings before building.

---

## 18. Troubleshooting

| Problem | Solution |
| --- | --- |
| Blank page on refresh of a deep link | Configure the SPA fallback (see Deployment). |
| Still seeing demo data after setting an API URL | Set **both** `VITE_API_BASE_URL` and `VITE_ANIME_PROVIDER=api`, then restart the dev server (env vars are read at build time). |
| CORS errors | Allow your site’s origin on your API, or proxy requests through Vite’s `server.proxy` during development. |
| Player shows “Connect your video provider…” | Your `VideoProvider` returned `null`. Check the episode id and your source endpoint. |
| HLS doesn’t play in Chrome/Firefox | Add `hls.js` (see VideoProvider integration). |
| Theme or library looks stale | Clear site data, or use **Settings → Account → Reset demo data**. |
| Loading states flash too briefly / too long | Tune `VITE_MOCK_LATENCY`. |
| `npm install` fails | Use Node 18.18+ and delete `node_modules` + the lockfile before reinstalling. |

---

## 19. License

This template is distributed under the license provided by the marketplace where you purchased it (e.g. Envato Regular or Extended License). In short: you may use it to build end products for yourself or a client; you may not redistribute or resell the template itself.

All demo titles, characters, studios, names and artwork are fictional and generated for the template. Any resemblance to real works, companies or persons is coincidental. You are responsible for ensuring that any content, media and data you connect to ANIVIA is properly licensed.

Icons by [Lucide](https://lucide.dev) (ISC license). Fonts Inter and Sora via Google Fonts (SIL Open Font License).
