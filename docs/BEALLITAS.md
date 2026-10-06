# ANIVIA — élesítési útmutató (magyar)

Ez a lista végigvezet mindenen, amit **a Supabase és a Cloudflare felületén neked kell beállítanod**. A kódban minden elő van készítve.

## 1. Adatbázis (Supabase) — kötelező

1. Supabase → **SQL Editor** → *New query*.
2. Másold be és futtasd **sorrendben**:
   - `supabase/migrations/0001_anivia_init.sql` (profilok, könyvtár-szinkron)
   - `supabase/migrations/0002_anivia_features.sql` (kapcsolat/hibajelentés, saját pontszámok, kedvenc karakterek, nyilvános profil, fióktörlés)
   - `supabase/migrations/0003_anivia_platform.sql` (jogosultságok/szerepkörök, feature flagek, látogatottsági statisztika, anime-adatok tárolása, AniList-fiók összekötés, admin funkciók)
   - `supabase/migrations/0004_anivia_oauth_flags.sql` (kapcsolók a Google / Discord / GitHub belépőgombokhoz)
   - `supabase/migrations/0005_anivia_profile_images.sql` (profilkép anime-karakterből és profilbanner — a nyilvános profilon is látszik)
   - `supabase/migrations/0006_anivia_community.sql` (követés + hírfolyam, értékelések, hozzászólások, saját listák, közösségi pontszám, hibanapló, push-feliratkozások)
   - `supabase/migrations/0007_anivia_push_auto.sql` (push-értesítés automatikus kulcsokkal és időzítéssel)
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
npx supabase functions deploy send-push --no-verify-jwt
```
Vagy a Supabase felületén: **Edge Functions → Deploy a new function → Via Editor**, név: `anilist-auth`, másold be a `supabase/functions/anilist-auth/index.ts` tartalmát, és kapcsold **ki** a *Verify JWT* opciót. Ugyanígy az `anilist-proxy`-val.

Ellenőrzés: nyisd meg a `https://anivia.animehub.hu/status` oldalt — a „Supabase anime store”, „AniList sign-in function” és „Database” soroknak OK-nak kell lennie.

A beérkezett üzeneteket és hibajelentéseket az **Admin dashboard → Inbox** fülön (vagy a Supabase Table Editorban) látod.

## 1c. Push-értesítés (új epizód akkor is, ha az oldal zárva van) — opcionális

Kulcsot nem kell készíteni, gép sem kell hozzá:
1. Töltsd fel a `send-push` függvényt (lásd fent, *Verify JWT* kikapcsolva).
2. SQL Editorban futtasd a `supabase/migrations/0007_anivia_push_auto.sql` fájlt. Ez:
   - létrehoz egy csak a szerver által olvasható titok-táblát (`app_secrets`),
   - készít egy véletlen cron-jelszót,
   - beállítja, hogy a Supabase félóránként magától elindítsa a küldést (pg_cron).
3. A függvény az első híváskor magának készíti el a push kulcspárt, és elmenti a táblába.

A felhasználók a **Beállítások → Értesítések** alatt kapcsolhatják be. Kikapcsolás: Admin → Feature flags → `push_notifications`.

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

1. Supabase → **Authentication → Providers** → kapcsold be, és add meg az adott szolgáltatónál létrehozott Client ID / Secret párost. A callback URL-t a Supabase kiírja.
2. Az oldalon: **Admin dashboard → Feature flags** → kapcsold be az `oauth_google` / `oauth_discord` / `oauth_github` kapcsolót (a 0004-es SQL hozza létre őket).

A gombok csak akkor jelennek meg a belépés/regisztráció oldalon, ha a kapcsolójuk be van kapcsolva — így nem látszik olyan gomb, ami nem működik.

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

**Heti adatbázis-mentés** (`.github/workflows/backup.yml`): add hozzá a `SUPABASE_DB_URL` GitHub secretet (a fenti `postgresql://…` cím). Minden vasárnap készül egy `pg_dump`, amit az Actions futás *Artifacts* részéből tölthetsz le (30 napig marad meg).

## 8. Nyelv

A felület magyar és angol. Alapból a böngésző nyelvét követi; átállítható: **Beállítások → Megjelenés → Nyelv**. A fordítások a `src/i18n/hu.ts` fájlban vannak (kulcs = az angol szöveg).

## Ami még nincs kész (külön döntést igényel)

- **Fizetés (Stripe)**: a Pricing oldal alapból rejtve van (`VITE_ENABLE_PRICING=false`), amíg nincs fizetési rendszer és döntés arról, mit kap az előfizető.
- **Jogi szövegek**: a Privacy és Terms oldal a valós működést írja le, de élesítés előtt nézesd át jogásszal.
