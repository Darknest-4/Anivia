# ANIVIA — élesítési útmutató (magyar)

Ez a lista végigvezet mindenen, amit **a Supabase és a Cloudflare felületén neked kell beállítanod**. A kódban minden elő van készítve.

## 1. Adatbázis (Supabase) — kötelező

1. Supabase → **SQL Editor** → *New query*.
2. Másold be és futtasd **sorrendben**:
   - `supabase/migrations/0001_anivia_init.sql` (profilok, könyvtár-szinkron)
   - `supabase/migrations/0002_anivia_features.sql` (kapcsolat/hibajelentés, saját pontszámok, kedvenc karakterek, nyilvános profil, fióktörlés)
3. Alternatíva a saját gépedről: hozz létre egy `supabase/.env.local` fájlt (nem kerül a repóba):
   ```
   SUPABASE_DB_URL=postgresql://postgres:JELSZÓ@db.wnmvktajokjhufuzpamy.supabase.co:5432/postgres
   ```
   A jelszóban a `%` → `%25`, a `+` → `%2B`. Utána: `npm run db:migrate`.

A beérkezett üzeneteket és hibajelentéseket a Supabase **Table Editor**-ban látod (`contact_messages`, `reports` tábla).

## 2. E-mail küldés — élesben kötelező

A Supabase beépített levelezője óránként csak néhány e-mailt enged, ezért a regisztrációs és jelszó-visszaállító levelek elakadnak.

1. Regisztrálj a **resend.com**-on (ingyenes: 3000 levél/hó), add hozzá és igazold a domainedet.
2. Supabase → **Authentication → Emails → SMTP Settings** → *Enable custom SMTP*:
   - Host: `smtp.resend.com`, Port: `465`, User: `resend`, Password: a Resend API-kulcsod
   - Sender: pl. `noreply@a-te-domained.hu`
3. (Ajánlott) **Authentication → Emails → Templates**: írd át a leveleket magyarra / a saját stílusodra.

## 3. Bejelentkezési címek — kötelező

Supabase → **Authentication → URL Configuration**:
- *Site URL*: az éles címed (pl. `https://anivia.a-te-domained.hu`)
- *Redirect URLs*: `https://anivia.a-te-domained.hu/**`, `https://*.workers.dev/**` (ha azt használod), `http://localhost:5173/**`

## 4. Google / Discord / GitHub belépés — opcionális

Supabase → **Authentication → Providers** → kapcsold be, és add meg az adott szolgáltatónál létrehozott Client ID / Secret párost. A callback URL-t a Supabase kiírja.
Amelyiket nem kapcsolod be, arra kattintva barátságos hibaüzenet jelenik meg.

## 5. Biztonsági beállítások — ajánlott

- **Authentication → Sign In / Providers → Email**: *Confirm email* legyen bekapcsolva.
- **Authentication → Attack Protection**: *Leaked password protection* be; opcionálisan CAPTCHA (Cloudflare Turnstile).

## 6. Cloudflare telepítés

- Build command: `npm run build` · Deploy command: `npx wrangler deploy`
- A `wrangler.jsonc` és a `worker/index.ts` automatikusan:
  - kiszolgálja az oldalt,
  - **közös gyorsítótárat** ad az AniList-kérésekhez (`/api/anilist`, 5 perc) — gyorsabb és kíméli az AniList limitjét,
  - az `/anime/123` linkekhez **megosztási előnézetet** (cím, leírás, kép) ír Discordhoz, Facebookhoz, Google-höz.
- Build-környezeti változók (Cloudflare → Settings → Variables, *build* változóként), mind opcionális:
  `VITE_SUPPORT_EMAIL`, `VITE_SOCIAL_DISCORD`, `VITE_SOCIAL_X`, `VITE_SOCIAL_INSTAGRAM`, `VITE_SOCIAL_WEBSITE`, `VITE_CF_ANALYTICS_TOKEN`, `VITE_ENABLE_PRICING`.
- **Web Analytics** (ingyenes, süti nélküli): Cloudflare → Analytics & Logs → Web Analytics → add hozzá az oldalt, a kapott tokent tedd a `VITE_CF_ANALYTICS_TOKEN`-be.

## 7. GitHub Actions (CI)

Minden feltöltésnél automatikusan lefut: típusellenőrzés, egységtesztek, build és a Worker ellenőrzése (`.github/workflows/ci.yml`). Ha piros, a GitHub „Actions” fülén látod, mi romlott el.

## Ami még nincs kész (külön döntést igényel)

- **Fizetés (Stripe)**: a Pricing oldal alapból rejtve van (`VITE_ENABLE_PRICING=false`), amíg nincs fizetési rendszer és döntés arról, mit kap az előfizető.
- **Magyar felület**: a felület jelenleg angol; a fordítás (react-i18next) nagyobb, külön munka.
- **Push-értesítés zárt böngészőnél**: most az értesítések az app megnyitásakor / nyitott fülnél jelennek meg. Háttérben érkező push-hoz Edge Function + VAPID kulcs kell.
- **Jogi szövegek**: a Privacy és Terms oldal a valós működést írja le, de élesítés előtt nézesd át jogásszal.
