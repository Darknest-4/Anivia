/**
 * Smaller variants of catalog artwork, for thumbnails and the data-saver setting.
 * - AniList covers: …/cover/large/… (≈460px) → …/cover/medium/… (≈230px)
 * - MyAnimeList: …/123l.jpg (large) → …/123.jpg (regular)
 * Any other URL is returned unchanged.
 */
export function thumb(url: string): string
export function thumb(url: string | undefined): string | undefined
export function thumb(url: string | undefined) {
  if (!url) return url
  return url
    .replace('/media/anime/cover/large/', '/media/anime/cover/medium/')
    .replace(/(\/images\/anime\/\d+\/\d+)l\.(jpg|webp)$/, '$1.$2')
}
