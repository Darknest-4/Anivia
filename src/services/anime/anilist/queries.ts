/** AniList GraphQL documents. Adult titles are always excluded (`isAdult: false`). */

export const MEDIA_FIELDS = `
  id idMal
  title { romaji english native }
  description(asHtml: false)
  coverImage { extraLarge large color }
  bannerImage
  averageScore popularity favourites
  season seasonYear status format episodes duration
  genres
  tags { name rank isMediaSpoiler }
  studios(isMain: true) { nodes { id name } }
  startDate { year month day }
  endDate { year month day }
  updatedAt
  nextAiringEpisode { episode airingAt }
  rankings { rank type allTime }
  trailer { id site thumbnail }
  externalLinks { site url type color icon isDisabled }
`


export const MEDIA_DETAIL = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_FIELDS}
      staff(sort: RELEVANCE, perPage: 8) { edges { role node { id name { full } } } }
      relations { edges { relationType node { id type } } }
      streamingEpisodes { title thumbnail }
    }
  }
`

export const MEDIA_RELATIONS = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      relations { edges { relationType node { type isAdult ${MEDIA_FIELDS} } } }
      recommendations(sort: RATING_DESC, perPage: 12) { nodes { mediaRecommendation { type isAdult ${MEDIA_FIELDS} } } }
    }
  }
`

export const AIRING = `
  query ($page: Int, $from: Int, $to: Int, $sort: [AiringSort]) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: $sort) {
        id episode airingAt
        media { isAdult countryOfOrigin ${MEDIA_FIELDS} }
      }
    }
  }
`

const CHARACTER_FIELDS = `
  id name { full native } image { large } description(asHtml: false) age gender favourites
  media(type: ANIME, perPage: 1, sort: POPULARITY_DESC) {
    edges {
      characterRole
      voiceActors(language: JAPANESE) { name { full } }
      en: voiceActors(language: ENGLISH) { name { full } }
      node { id title { romaji english } }
    }
  }
`

export const CHARACTERS = `
  query ($search: String, $perPage: Int) {
    Page(perPage: $perPage) { characters(search: $search, sort: FAVOURITES_DESC) { ${CHARACTER_FIELDS} } }
  }
`

export const CHARACTER = `query ($id: Int) { Character(id: $id) { ${CHARACTER_FIELDS} } }`

export const MEDIA_CHARACTERS = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id title { romaji english }
      characters(sort: [ROLE, FAVOURITES_DESC], perPage: 25) {
        edges {
          role
          voiceActors(language: JAPANESE) { name { full } }
          en: voiceActors(language: ENGLISH) { name { full } }
          node { id name { full native } image { large } description(asHtml: false) age gender favourites }
        }
      }
    }
  }
`

export const STUDIOS = `
  query ($search: String, $perPage: Int) {
    Page(perPage: $perPage) {
      studios(search: $search, sort: FAVOURITES_DESC) {
        id name favourites isAnimationStudio
        media(isMain: true, sort: POPULARITY_DESC, perPage: 4) { pageInfo { total } nodes { coverImage { large } } }
      }
    }
  }
`

export const STUDIO = `
  query ($id: Int, $page: Int, $perPage: Int) {
    Studio(id: $id) {
      id name favourites isAnimationStudio
      media(isMain: true, sort: POPULARITY_DESC, page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage perPage }
        nodes { type isAdult ${MEDIA_FIELDS} }
      }
    }
  }
`

export const SUGGESTIONS = `
  query ($search: String) {
    anime: Page(perPage: 5) { media(type: ANIME, isAdult: false, search: $search, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } }
    characters: Page(perPage: 3) { characters(search: $search, sort: SEARCH_MATCH) { ${CHARACTER_FIELDS} } }
    studios: Page(perPage: 3) { studios(search: $search, sort: SEARCH_MATCH) { id name favourites isAnimationStudio } }
  }
`
