# ANIVIA — élesítési útmutató (magyar)

Ez a lista végigvezet mindenen, amit **a Supabase és a Cloudflare felületén neked kell beállítanod**. A kódban minden elő van készítve.

## 1. Adatbázis (Supabase) — kötelező

1. Supabase → **SQL Editor** → *New query*.
2. Másold be és futtasd **sorrendben**:
   - `supabase/migrations/0001_anivia_init.sql` (profilok, könyvtár-szinkron)
   - `supabase/migrations/0002_anivia_features.sql` (kapcsolat/hibajelentés, saját pontszámok, kedvenc karakterek, nyilvános profil, fióktörlés)
   - `supabase/migrations/0003_anivia_platform.sql` (jogosultságok/szerepkörök, feature flagek, látogatottsági statisztika, anime-adatok tárolása, AniList-fiók összekötés, admin funkciók)
3. Alternatíva a saját gépedről: hozz létre egy `supabase/.env.local` fájlt (nem kerül a repóba):
   ```
   SUPABASE_DB_URL=postgresql://postgres:JELSZÓ@db.wnmvktajokjhufuzpamy.supabase.co:5432/postgres
   ```
   A jelszóban a `%` → `%25`, a `+` → `%2B`. Utána: `npm run db:migrate`.

4. **Tedd magad adminná** (egyszer, a saját e-mail címeddel — előbb regisztrálj/lépj be az oldalon):
   ```sql
   insert into public.user_roles (user_id, role)
     select id, 'admin' from auth.users where email = 'te@example.com'
     on conflict (user_id) do update set role = 'admin';
   ```
   Ezután a jobb felső menüben megjelenik az **Admin dashboard** (`/admin`):
   - **Analytics**: hányan vannak most online, mai/időszaki látogatók és oldalmegtekintések, átlagos oldalon töltött idő, legnézettebb oldalak és animék, eszközök, forgalomforrások, regisztrációk;
   - **Feature flags**: funkciók ki/bekapcsolása (karbantartási mód, bejelentő sáv, regisztráció, AniList-belépés, trailerek, értesítések stb.), célközönség (mindenki / bejelentkezettek / csak staff) és fokozatos bevezetés %-ban;
   - **Users & roles**: felhasználók keresése, szerepkör: `user` / `moderator` (statisztika + üzenetek) / `admin` (minden);
   - **Inbox**: kapcsolatfelvételi üzenetek és hibajelentések állapotkezeléssel;
   - **Anime data**: az adatbázisban tárolt animék és a cache.

A statisztika csak akkor gyűjt, ha a látogató a felugró sávon az „Allow”-ra kattint (GDPR), IP-címet nem tárol. 180 napnál régebbi adatok törlése: `select public.analytics_cleanup(180);` (időzíthető a Supabase **Cron** moduljával).

## 1b. Edge Function-ök — az AniList-belépéshez és az anime-adatok adatbázisba mentéséhez

Két szerverfüggvény van a `supabase/functions` mappában. **Titkos kulcsot nem kell megadni** — a Supabase automatikusan átadja nekik a service role kulcsot.

| Függvény | Mit csinál |
| --- | --- |
| `anilist-auth` | „Continue with AniList”: ellenőrzi az AniList tokent, és **ugyanabba az ANIVIA-fiókba** léptet be (első alkalommal létrehozza). Bejelentkezett felhasználónál a fiókhoz köti az AniList-et, így minden eszközön megmarad, amíg le nem választod. |
| `anilist-proxy` | Az anime-adatokat a szerveren kéri le az AniList-től, a válaszokat az `api_cache`, minden animét az `anime_catalog` táblába menti. Ha az AniList blokkolja a Supabase szervereit, az oldal automatikusan közvetlenül kéri az adatot. |

Telepítés a saját gépedről (egyszer kell bejelentkezni: `npx supabase login`):
```
npx supabase link --project-ref wnmvktajokjhufuzpamy
npx supabase functions deploy anilist-auth --no-verify-jwt
npx supabase functions deploy anilist-proxy --no-verify-jwt
```
Vagy a Supabase felületén: **Edge Functions → Deploy a new function → Via Editor**, név: `anilist-auth`, másold be a `supabase/functions/anilist-auth/index.ts` tartalmát, és kapcsold **ki** a *Verify JWT* opciót. Ugyanígy az `anilist-proxy`-val.

Ellenőrzés: nyisd meg a `https://anivia.animehub.hu/status` oldalt — a „Supabase anime store”, „AniList sign-in function” és „Database” soroknak OK-nak kell lennie.

A beérkezett üzeneteket és hibajelentéseket az **Admin dashboard → Inbox** fülön (vagy a Supabase Table Editorban) látod.

## 2. E-mail küldés — élesben kötelező

A Supabase beépített levelezője óránként csak néhány e-mailt enged, ezért a regisztrációs és jelszó-visszaállító levelek elakadnak.

1. Regisztrálj a **resend.com**-on (ingyenes: 3000 levél/hó), add hozzá és igazold a domainedet.
2. Supabase → **Authentication → Emails → SMTP Settings** → *Enable custom SMTP*:
   - Host: `smtp.resend.com`, Port: `465`, User: `resend`, Password: a Resend API-kulcsod
   - Sender: pl. `noreply@a-te-domained.hu`
3. (Ajánlott) **Authentication → Emails → Templates**: írd át a leveleket magyarra / a saját stílusodra.

## 3. Bejelentkezési címek — kötelező

Supabase → **Authentication → URL Configuration**:
- *Site URL*: `https://anivia.animehub.hu`
- *Redirect URLs*: `https://anivia.animehub.hu/**`, `https://*.workers.dev/**` (ha azt használod), `http://localhost:5173/**`

## 3b. AniList-összekötés — kötelező a „Continue with AniList”-hez

AniList → **Settings → Developer → Anivia** kliens:
- **Redirect URL**: `https://anivia.animehub.hu` (a `https://` előtaggal együtt, végén perjel nélkül). Pontosan ennek kell lennie, különben az AniList hibát ad.
- A **Client ID (52829)** már be van állítva a kódban. A **Secret-et ne add meg sehol** — a böngészős belépés (implicit grant) nem használja, és ha a weboldalba kerülne, bárki visszaélhetne vele.
- Helyi fejlesztéshez hozz létre egy második AniList klienst `http://localhost:5173` redirecttel, és az ID-ját írd a `.env.local` fájlba: `VITE_ANILIST_CLIENT_ID=...`

Mit tud: **belépés AniList-fiókkal egy valódi ANIVIA-fiókba** (első belépéskor automatikusan létrejön), kétirányú szinkron (lista + státuszok, pontszámok, megnézett részek, kedvencek), az AniList saját értesítései a csengőben. Az összekötés a fiókodhoz mentődik (`anilist_links` tábla, csak te olvashatod), ezért minden eszközön működik, **amíg a Settings → Connections → Disconnect gombbal le nem választod** (vagy az AniList-token egy év után le nem jár). Ehhez az `anilist-auth` Edge Function kell (1b. pont). A szinkron az AniList adatforrással működik (ez az alapértelmezett).

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

## 6b. Képek az R2-ből (borítók és bannerek)

A képek nyilvánosan a `https://media.animehub.hu` címen érhetők el (`yume-media` bucket). A böngésző **közvetlenül onnan** tölti őket.
Mivel a fájlnevek véletlenszerűek (uuid), a Worker mondja meg, melyik fájl melyik animéhez tartozik: `/api/media?ids=21,20,…` — egy kérés egy egész listára. Ehhez a bucket `MEDIA` néven a Workerhez van kötve (`wrangler.jsonc`), kulcs nem kell; a nyilvános cím a `MEDIA_PUBLIC_URL` változó.
- mappa: `<anilistId>/…/<bármi>.jpg|png|webp`;
- ha a fájl neve tartalmazza a „cover”/„poster” vagy „banner” szót, az dönt; különben a kép alakja: álló → borító, nagyon széles (≥ 2,6:1) → banner. A 16:9-es háttérképeket és a logókat kihagyja;
- ha egy animéhez nincs kép az R2-ben, az AniList képe jelenik meg. Adattakarékos módban az AniList kisebb képei maradnak.

Ellenőrzés: `https://anivia.animehub.hu/api/media?ids=21` → a One Piece borító- és banner-címét kell mutatnia.

## 7. GitHub Actions (CI)

Minden feltöltésnél automatikusan lefut: típusellenőrzés, egységtesztek, build és a Worker ellenőrzése (`.github/workflows/ci.yml`). Ha piros, a GitHub „Actions” fülén látod, mi romlott el.

## Ami még nincs kész (külön döntést igényel)

- **Fizetés (Stripe)**: a Pricing oldal alapból rejtve van (`VITE_ENABLE_PRICING=false`), amíg nincs fizetési rendszer és döntés arról, mit kap az előfizető.
- **Magyar felület**: a felület jelenleg angol; a fordítás (react-i18next) nagyobb, külön munka.
- **Push-értesítés zárt böngészőnél**: most az értesítések az app megnyitásakor / nyitott fülnél jelennek meg. Háttérben érkező push-hoz Edge Function + VAPID kulcs kell.
- **Jogi szövegek**: a Privacy és Terms oldal a valós működést írja le, de élesítés előtt nézesd át jogásszal.
