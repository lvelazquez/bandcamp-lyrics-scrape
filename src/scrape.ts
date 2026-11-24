import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getBuffer, getText, sleep } from './http.js'
import { parseAlbum, parseDiscography } from './parse.js'
import type { Album } from './types.js'

/** Turn "elmedio", "elmedio.bandcamp.com" or a full URL into an origin like https://elmedio.bandcamp.com. */
export function resolveArtistOrigin(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Artist must not be empty')
  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed)
    return `${url.protocol}//${url.host}`
  }
  if (trimmed.includes('.')) return `https://${trimmed.replace(/\/.*$/, '')}`
  if (!/^[a-z0-9-]+$/i.test(trimmed)) {
    throw new Error(`"${input}" is not a valid Bandcamp artist handle`)
  }
  return `https://${trimmed.toLowerCase()}.bandcamp.com`
}

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '') || 'album'
  )
}

export interface ScrapeOptions {
  origin: string
  delayMs: number
  /** Directory to save cover art into, or null to skip images. */
  imagesDir: string | null
  log: (message: string) => void
}

export async function scrapeArtist(opts: ScrapeOptions): Promise<Album[]> {
  const { origin, delayMs, imagesDir, log } = opts
  log(`Fetching discography from ${origin}/music`)
  const links = parseDiscography(await getText(`${origin}/music`))
  if (links.length === 0) {
    throw new Error(`No albums found at ${origin}/music (wrong artist, or the page layout changed)`)
  }
  log(`Found ${links.length} album(s)`)
  if (imagesDir) await mkdir(imagesDir, { recursive: true })

  const albums: Album[] = []
  for (const [i, link] of links.entries()) {
    await sleep(delayMs) // polite: one request at a time, with a pause
    const url = new URL(link.href, origin).href
    log(`[${i + 1}/${links.length}] ${link.title}`)
    const album = parseAlbum(await getText(url), link, url)
    if (imagesDir && album.imgSrc) {
      await sleep(delayMs)
      const file = path.join(imagesDir, `${slugify(link.title)}.jpg`)
      await writeFile(file, await getBuffer(album.imgSrc))
    }
    if (album.songs.length === 0) {
      log(`  warning: no tracks parsed from ${url} (single-track releases are not supported)`)
    }
    albums.push(album)
  }
  return albums
}
