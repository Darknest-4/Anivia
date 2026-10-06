/**
 * Profile pictures and banners come from the anime databases only (character art and anime
 * banners) — the same rule is enforced in the database (migration 0005).
 */
const ALLOWED = /^https:\/\/(s4\.anilist\.co|img\.anili\.st|cdn\.myanimelist\.net|artworks\.thetvdb\.com)\//

export const isAllowedProfileImage = (url: string | null | undefined): url is string => Boolean(url && url.length <= 500 && ALLOWED.test(url))
