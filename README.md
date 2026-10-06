# ANIVIA — anime discovery & tracking

> **Discover. Watch. Remember.** — live at **https://anivia.animehub.hu**

ANIVIA is a fast, responsive anime discovery and tracking site: trending and seasonal catalogs, search and filters, title and episode pages, a weekly release schedule, characters and studios, a watchlist with scores, watch history and notifications. Anime data comes from **[AniList](https://anilist.co)** (or **[Jikan](https://jikan.moe)** / MyAnimeList) with episode details and artwork from **[ani.zip](https://api.ani.zip)**. Accounts, sync, AniList sign-in, feature flags, roles and first-party analytics run on **Supabase**; the site is served by a **Cloudflare Worker**.

ANIVIA does not host or stream episodes: it shows official trailers and links to licensed services (“Where to watch”). Episodes can be marked as watched to keep progress — also on AniList.

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
12. [Data sources](#12-data-sources)
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

**What it is:** a React + TypeScript site with a provider-based data layer, a Supabase backend (see migrations `0001`–`0004` and `supabase/functions`) and a Cloudflare Worker for edge caching and share previews.

**What it is not:** a streaming service. The repository contains no video hosting, no copyrighted artwork or video, no scrapers and no third-party streaming sources; metadata and cover images are loaded at runtime from the public APIs above.

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
- Player states (with your own video provider): playing, paused, loading, buffering, finished, no source, error and fullscreen; without one, official trailers and “Where to watch” links, plus **mark episodes as watched**

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
# 1. Clone the repository and enter the folder
git clone https://github.com/Darknest-4/Anivia.git && cd Anivia

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

The app works immediately without any configuration: it loads live data from AniList (episode details from ani.zip) and uses the project’s Supabase for accounts.

Tips:

- Press **Ctrl/⌘ K** anywhere to open the command palette.
- Open **/status** to check every data source and service from the browser.

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
| `VITE_ANIME_PROVIDER` | `anilist` | `anilist` (AniList + ani.zip episode details), `jikan` or `api` (your REST backend). |
| `VITE_ANILIST_URL` | `https://graphql.anilist.co` | AniList GraphQL endpoint (override for a caching proxy). |
| `VITE_JIKAN_URL` | `https://api.jikan.moe/v4` | Jikan endpoint (override for a self-hosted Jikan instance). |
| `VITE_API_BASE_URL` | *(empty)* | Base URL of **your** API, used by the `api` providers. With `api` selected but no URL, AniList is used. |
| `VITE_VIDEO_PROVIDER` | `none` | `none` (trailers + “Where to watch”) or `api` (uses `ApiVideoProvider` when a base URL is set). |
| `VITE_SITE_URL` | `https://anivia.animehub.hu` | Public URL used for canonical and Open Graph tags. |

> Variables prefixed with `VITE_` are embedded in the client bundle. **Never put secrets in them.**

All configuration is read in one place: `src/config/index.ts`.

---

## 9. Project structure

```
src/
├─ App.tsx                     Root route element (router-aware providers)
├─ main.tsx                    Entry: providers, router
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
│  └─ common/                  PageHeader, SectionHeader, ErrorBoundary, PlatformBits (flags, consent, banners)…
├─ providers/                  Theme, Toast, Command menu, App providers
├─ hooks/                      queries.ts (data hooks), user-data hooks, utilities
├─ services/
│  ├─ anime/                   AnimeProvider interface + implementations
│  │  ├─ anilist/              AniList GraphQL provider (queries, types, mappers)
│  │  ├─ jikan/                Jikan v4 provider (types, mappers)
│  │  ├─ shared/               Rate-limited request queue, genre registry, dates, episode builder
│  │  └─ apiAnimeProvider.ts   Reference REST provider (+ apiMappers.ts)
│  ├─ video/                   VideoProvider interface, ApiVideoProvider
│  ├─ user/                    Watchlist, history, favorites, preferences, recent searches
│  └─ storage/                 Safe localStorage wrapper + observable persistent stores
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

## 12. Data sources

All anime data is live. **AniList** (default) or **Jikan** provides the catalog, **ani.zip** adds episode titles, synopses, air dates and artwork (fanart, clear logos), and the Supabase `anilist-proxy` Edge Function stores what it fetches in the database (`api_cache`, `anime_catalog`). `src/lib/artwork.ts` still generates SVG placeholders for missing images.

---

## 13. API integration

### Built-in public data sources (no API key)

| Provider | Select with | What it uses |
| --- | --- | --- |
| **AniList** *(default)* | `VITE_ANIME_PROVIDER=anilist` | AniList GraphQL for everything; episode titles, synopses, air dates, thumbnails and artwork (fanart, logos) are enriched from ani.zip. |
| **Jikan v4** | `VITE_ANIME_PROVIDER=jikan` | The unofficial MyAnimeList REST API for all data. |

How the integration behaves:

- **Rate limits are handled for you.** Every request goes through a serial queue (`services/anime/shared/requestQueue.ts`) that spaces requests, respects a per-minute window (Jikan: 3 req/s and 60/min; AniList: ~90/min), retries `429`/`5xx` with back-off (honouring `Retry-After`) and caches identical responses for 5 minutes. TanStack Query caches on top of that.
- **Adult content is excluded** (`isAdult: false` on AniList, `sfw=true` on Jikan) and explicit genres are never displayed.
- **Text is cleaned:** HTML, AniList spoiler blocks (`~! … !~`) and source credits are stripped from descriptions.
- **Genres are unified** across both APIs in `services/anime/shared/genres.ts` (for example Jikan’s *Suspense* ↔ *Thriller*, AniList’s *Historical* tag).
- **Episodes:** every planned episode is listed; episodes that haven’t aired yet are locked and show their expected date.
- **IDs:** routes use the provider’s own ids (AniList media ids or MyAnimeList ids), so library entries saved under one provider won’t resolve under another.
- Fields these APIs don’t have (audio languages, stream quality, studio country) are hidden when absent, and the language filter is hidden for live providers.

> ⚠️ **Terms of use.** AniList and Jikan/MyAnimeList data and images belong to those services and the respective rights holders. Review the [AniList API Terms of Use](https://docs.anilist.co/guide/terms-of-use), the [MyAnimeList Terms of Use](https://myanimelist.net/about/terms_of_use) and [Jikan](https://jikan.moe)’s guidelines before deploying — **commercial use may require prior permission**. Keep the attribution shown in the footer, and use your own licensed backend (`VITE_ANIME_PROVIDER=api`) where required.

### Architecture

ANIVIA talks to data exclusively through two interfaces:

```
UI (pages/components)
   └─ hooks/queries.ts  (TanStack Query: caching, loading & error states)
        ├─ AnimeProvider  ← AniListAnimeProvider | JikanAnimeProvider | ApiAnimeProvider | YourProvider
        └─ VideoProvider  ← (none: trailers) | ApiVideoProvider | YourProvider
```

To connect **your own backend** instead, the quickest path:

1. Set `VITE_API_BASE_URL=https://api.your-domain.com` and `VITE_ANIME_PROVIDER=api`.
2. Make your API follow the endpoint conventions documented in `src/services/anime/apiAnimeProvider.ts` **or** edit those paths.
3. Adjust the response shapes and mapping functions in `src/services/anime/apiMappers.ts`.

> Only connect content and media you are licensed to use. ANIVIA does not — and must not be used to — scrape protected services, bypass DRM or embed unauthorized streams.

---

### Accounts & cloud sync (Supabase)

ANIVIA ships with real authentication and library sync through [Supabase](https://supabase.com):

- Email + password sign-up (with email confirmation), sign-in, password reset (`/forgot-password` → email → `/reset-password`)
- Google, Discord and GitHub sign-in (enable each provider in **Supabase → Authentication → Providers**)
- Profile editing (display name, username, bio, avatar color), email and password changes, sign out / sign out everywhere
- Watchlist, history, favorites and **all settings** sync automatically between devices. The local copy keeps the UI instant and offline-friendly; changes are pushed after a short debounce and merged (newest wins) on sign-in and whenever the tab regains focus.

**Setup (one time):**

1. **Create the tables.** Open Supabase → **SQL Editor**, paste `supabase/migrations/0001_anivia_init.sql` and run it.
   Or run it from your machine: create `supabase/.env.local` (git-ignored) containing
   `SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`
   (URL-encode special characters in the password) and run `npm run db:migrate`.
2. **Allow your domains.** Supabase → **Authentication → URL Configuration**: set *Site URL* to your production URL and add `http://localhost:5173/**` and your Cloudflare URL (`https://<your-site>/**`) to *Redirect URLs*.
3. **Point the app at your project** with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (defaults are set in `src/config/index.ts`).

Security model: every table uses **Row Level Security** — users can only read and write their own rows. The publishable key is designed to be public. **Never** put the database password or an `sb_secret_…` key into frontend code or a `VITE_` variable: anything in the bundle is visible to every visitor and would give full access to your database.

### More backend features (Supabase, migration `0002`)

- **Contact form & issue reports** are stored in `contact_messages` / `reports` (insert-only via RLS, flood-limited, honeypot on the form). Read them in the Supabase Table Editor.
- **Your score** (1–10 per title) and **favorite characters** sync with the account.
- **Public profiles** at `/u/<username>` — opt-in in Settings → Privacy; history visibility is configurable. Served through the `public_profile()` RPC, which never exposes email or private data.
- **Self-service account deletion** via the `delete_my_account()` RPC — no service-role key needed in the frontend.
- **Notifications** are derived from the watchlist and live airing data (new episode, airing within 24 h, premieres within 14 days), with optional browser notifications.
- **AniList import**: Settings → Content → *Import from AniList* copies a public AniList list (statuses, scores, favorites) by username — no login or API key required.

### Platform features (Supabase, migration `0003` + Edge Functions)

- **Roles & permissions**: `user_roles`, `role_permissions`, `has_permission()`, `my_access()`. Roles `user` / `moderator` / `admin`; permissions `admin.access`, `analytics.view`, `flags.manage`, `users.manage`, `reports.manage`, `cache.manage`. Make the first admin with the SQL at the end of the migration.
- **Feature flags** (`feature_flags`, public read, admin write): on/off, audience (`all` / `signed_in` / `staff`), percentage rollout and a JSON payload. `useFlag('key')` from `PlatformProvider`. Built-in flags: `maintenance_mode`, `announcement_banner`, `registration`, `anilist_login`, `anilist_sync`, `public_profiles`, `contact_form`, `trailers`, `notifications`, `analytics`, `view_counts`.
- **First-party analytics** (`analytics_sessions`, `page_views`; consent-gated, honours DNT/GPC, no IPs): sessions, page views, visible time on page (sent with `keepalive` when the tab hides), heartbeat for “online now”. Written only through `track_*` RPCs. `analytics_overview()` powers the dashboard; `anime_views()` shows “views this week” on anime pages; `analytics_cleanup()` enforces retention.
- **Admin dashboard** at `/admin` (permission-gated): analytics, flag editor, user & role management, contact/report inbox, anime data cache.
- **Anime data in the database**: `supabase/functions/anilist-proxy` caches AniList responses (`api_cache`) and upserts every title into `anime_catalog`. The client prefers it when its `/health` probe is OK, then the Cloudflare Worker cache, then AniList directly.
- **AniList sign-in**: `supabase/functions/anilist-auth` verifies the AniList token server-side, finds or creates the ANIVIA account and returns a one-time magic-link hash that the browser exchanges with `verifyOtp`. When signed in, it links the AniList account (`anilist_links`, readable/deletable only by the owner), so the connection follows the user to every device until they disconnect.

Deploy both functions with `--no-verify-jwt` (`npx supabase functions deploy anilist-auth --no-verify-jwt`). They use the service-role key Supabase injects at runtime — no secrets in the repo.

### AniList account connection

Settings → **Connections** (or *Continue with AniList* on the sign-in page) connects an AniList account via OAuth **implicit grant** — only the public client id (`VITE_ANILIST_CLIENT_ID`) is used; the client secret is never needed. With accounts enabled, the connection is saved to the ANIVIA account (see above); otherwise it stays in this browser.

- **Two-way sync** (`services/anilistAccount/sync.ts`): list & statuses, scores (`scoreRaw`, format-independent), episode progress from finished episodes, and favourites. Changes are diffed against a snapshot of the last sync, so edits are sent once and never echo back; the newest change wins on conflicts. Each part can be toggled.
- AniList's own **airing / related-media notifications** appear in the bell; *Mark all as read* also clears the AniList badge.
- Works without an ANIVIA account; with one, Supabase sync keeps running alongside.
- Requires the AniList data source (AniList ids). Authenticated requests always bypass the shared edge cache (the Worker rejects them).
- Set the client's redirect URL on AniList to your exact site origin, e.g. `https://anivia.animehub.hu`.

### Cloudflare Worker (`worker/index.ts`)

- `/api/anilist` — edge-cached AniList proxy (5 min, shared by all visitors). The app detects it automatically in production builds and falls back to AniList directly if it's missing or failing.
- `/anime/:id` — injects Open Graph / Twitter tags (title, synopsis, image) so shared links render rich previews.

### Installable app (PWA)

`public/manifest.webmanifest` + `public/sw.js`: installable on phones and desktops, offline app shell, cached poster images (max 300). Registered in production builds only.

### Quality

`npm test` runs Vitest unit tests (filters, text cleaning, AniList batching incl. injection safety and fallback, notifications). `.github/workflows/ci.yml` runs typecheck, tests, build and a Worker dry-run on every push. A Hungarian deployment checklist lives in `docs/BEALLITAS.md`.

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
| `Anime` | `id`, `slug`, `title`, `description`, `poster`, `status`, `type`, `genres`, `studios`, `languages`, `quality`, `popularity`, `updatedAt` | `backdrop`, `rating`, `episodes`, `nextEpisodeAt`, `staff`, `relatedIds` are optional but enrich the UI. `artwork` is only used by the placeholder generator. |
| `Episode` | `id`, `animeId`, `number`, `season`, `title`, `synopsis`, `airDate`, `duration` (seconds), `thumbnail` | Set `locked: true` for unreleased episodes. |
| `Character` | `id`, `name`, `role`, `animeId`, `description`, `voiceActor`, `favorites`, `image` | |
| `Genre` | `id`, `slug`, `name`, `description`, `hue` | `hue` (0–360) colors chips and tiles. |
| `Studio` | `id`, `name`, `country`, `founded`, `description`, `logoHue` | |

Status values map to `'airing' | 'finished' | 'upcoming' | 'hiatus'` and formats to `'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special'` — see `STATUS` and `TYPES` in `apiMappers.ts`.

### Errors

Throw (or reject) from any provider method and the UI shows a friendly error state with **Try again**. `ProviderError` carries an optional HTTP status.

---

## 14b. Performance

- **Batched AniList requests** — list queries issued together are merged into one aliased GraphQL request (`services/anime/anilist/batch.ts`), so the home page needs ~6 requests instead of ~15, with automatic per-list fallback.
- **Offline cache** — API responses are persisted to `localStorage` for 24 h (TanStack Query persister). Repeat visits render instantly and keep working when the API is down. Toggle or clear it in Settings → Speed & data.
- **Hover prefetch** — pointing at a title preloads its data and the details-page chunk.
- **Idle route preloading**, lazy-loaded Supabase SDK, non-blocking web fonts and `preconnect` hints for the API and image hosts.
- **Data saver** — smaller images, no prefetching, no autoplaying trailers or spotlight rotation.

## 14c. Settings

Visitors can customise: theme, **accent color** (7 presets), **text size**, **grid density**, spotlight rotation, reduced motion, **data source** (AniList / MyAnimeList), **title language** (English / Romaji / Japanese), **score format** (10 / 100 / 5 point), **hide scores**, **blur synopses** (spoiler shield), default sort and page size, **which home sections appear**, offline cache, hover prefetch, data saver, trailer autoplay, notifications, usage statistics and privacy options (player options appear when a video provider is configured). Signed-in users get all of these synced to their account.

## 15. VideoProvider integration

```ts
export interface VideoProvider {
  getSource(animeId: string, episodeId: string): Promise<VideoSource | null>
}

interface VideoSource {
  kind: 'mp4' | 'hls' | 'dash'
  url?: string
  duration: number
  qualities: string[]
  subtitles: SubtitleTrack[]
  poster?: string
}
```

- **No provider** (default, `VITE_VIDEO_PROVIDER=none`): the watch page shows the official trailer, “Where to watch” links and a **Mark as watched** button.
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

No passwords, tokens, payment data or API secrets are ever stored. The stores (`src/services/user/stores.ts`) are observable, sync across browser tabs, and can be replaced with API-backed implementations that keep the same method signatures.

---

## 17. Deployment

`npm run build` produces a static SPA in `dist/`. Configure your host to **rewrite all routes to `index.html`**:

- **Cloudflare Workers** — `wrangler.jsonc` is included (static assets from `dist/` with SPA fallback). In the Cloudflare dashboard use build command `npm run build` and deploy command `npx wrangler deploy`, or run both locally.
- **Netlify** — `netlify.toml` is included (build + SPA redirect)
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
| Your own API isn’t used | Set **both** `VITE_API_BASE_URL` and `VITE_ANIME_PROVIDER=api`, then restart the dev server (env vars are read at build time). |
| CORS errors | Allow your site’s origin on your API, or proxy requests through Vite’s `server.proxy` during development. |
| Pages load slowly with Jikan | Jikan allows ~1 request/second sustained and ANIVIA queues requests to stay within it. Prefer `anilist`, self-host Jikan (`VITE_JIKAN_URL`) or put a caching proxy in front. |
| “Something went wrong” with AniList/Jikan | The public API may be down or rate-limiting your IP — use **Try again** and check **/status**. |
| Continue Watching entries vanish after switching provider | Each provider uses its own ids; clear the library in Settings → Account. |
| Player shows “Connect your video provider…” | Your `VideoProvider` returned `null`. Check the episode id and your source endpoint. |
| HLS doesn’t play in Chrome/Firefox | Add `hls.js` (see VideoProvider integration). |
| Theme or library looks stale | Clear site data, or use **Settings → Account → Reset local data**. |
| `npm install` fails | Use Node 18.18+ and delete `node_modules` + the lockfile before reinstalling. |

---

## 19. License

Private project — all rights reserved by the owner unless stated otherwise.

Anime data, titles and images loaded from AniList, Jikan/MyAnimeList and ani.zip belong to those services and the respective rights holders. Trailers are embedded from YouTube; “Where to watch” links point to official, licensed services.

Icons by [Lucide](https://lucide.dev) (ISC license). Fonts Inter and Sora via Google Fonts (SIL Open Font License).
