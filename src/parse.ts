import * as cheerio from 'cheerio'
import type { Album, AlbumLink, Song } from './types.js'

const clean = (text: string): string => text.replace(/\s+/g, ' ').trim()

/** Parse the artist's /music page into a list of album links. */
export function parseDiscography(html: string): AlbumLink[] {
  const $ = cheerio.load(html)
  const links: AlbumLink[] = []
  const seen = new Set<string>()
  $('.music-grid-item > a').each((_, el) => {
    const href = $(el).attr('href')
    if (!href || seen.has(href)) return
    seen.add(href)
    const title = clean($(el).find('.title').first().text() || $(el).text())
    links.push({ title, href })
  })
  return links
}

interface LdTrack {
  name?: string
  lyricsText?: string
}

/** Read schema.org JSON-LD embedded in the page, if present and valid. */
function readLd(
  $: cheerio.CheerioAPI
): { datePublished?: string; tracks: LdTrack[] } {
  const raw = $('script[type="application/ld+json"]').first().html()
  if (!raw) return { tracks: [] }
  try {
    const ld = JSON.parse(raw) as {
      datePublished?: string
      track?: {
        itemListElement?: {
          item?: {
            name?: string
            recordingOf?: { lyrics?: { text?: string } }
          }
        }[]
      }
    }
    const tracks = (ld.track?.itemListElement ?? []).map(entry => ({
      name: entry.item?.name,
      lyricsText: entry.item?.recordingOf?.lyrics?.text
    }))
    return { datePublished: ld.datePublished, tracks }
  } catch {
    return { tracks: [] }
  }
}

/** Convert Bandcamp's "27 Jan 2012 00:00:00 GMT" into YYYY-MM-DD. */
export function toIsoDate(value: string | undefined): string | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString().slice(0, 10)
}

/** Parse a single album page into its metadata, tracks and lyrics. */
export function parseAlbum(html: string, link: AlbumLink, url: string): Album {
  const $ = cheerio.load(html)
  const ld = readLd($)

  const imgSrc =
    $('#tralbumArt img').first().attr('src') ??
    $('#tralbumArt a').first().attr('href') ??
    null

  const songs: Song[] = $('#trackInfo tr.track_row_view')
    .map((index, row): Song => {
      const $row = $(row)
      const num = Number($row.attr('rel')?.match(/tracknum=(\d+)/)?.[1]) || index + 1
      // Lyrics live in a sibling row: <tr class="lyricsRow" id="lyrics_row_N">
      const htmlLyrics = $(`#lyrics_row_${num} div`).first().text().trim()
      const lyrics = htmlLyrics || ld.tracks[index]?.lyricsText?.trim() || null
      return {
        order: clean($row.find('.track_number').text()).replace(/\.$/, ''),
        title: clean($row.find('.track-title').first().text()),
        time: clean($row.find('span.time').first().text()),
        lyrics: lyrics ? lyrics.replace(/\r\n?/g, '\n') : null
      }
    })
    .get()

  return {
    title: link.title,
    url,
    imgSrc,
    date: toIsoDate(ld.datePublished),
    songs
  }
}
