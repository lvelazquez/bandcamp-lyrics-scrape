export interface AlbumLink {
  title: string
  /** Path or absolute URL of the album page, as linked from the discography. */
  href: string
}

export interface Song {
  order: string
  title: string
  time: string
  /** Lyrics text, or null when the track has none published. */
  lyrics: string | null
}

export interface Album {
  title: string
  url: string
  imgSrc: string | null
  /** ISO 8601 date (YYYY-MM-DD) when Bandcamp provides a release date, else null. */
  date: string | null
  songs: Song[]
}
