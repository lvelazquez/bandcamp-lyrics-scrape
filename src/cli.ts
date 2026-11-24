#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { resolveArtistOrigin, scrapeArtist } from './scrape.js'

const HELP = `bandcamp-lyrics-scrape - save a Bandcamp artist's albums, tracks and lyrics as JSON

Usage:
  bandcamp-lyrics-scrape <artist> [options]

  <artist> is a Bandcamp handle (elmedio), a host (elmedio.bandcamp.com) or a URL.

Options:
  -o, --out <file>     Output JSON file (default: data/albums.json)
      --images         Also download album cover art next to the JSON (data/images)
      --delay <ms>     Pause between requests (default: 1000)
  -h, --help           Show this help

Exit codes: 0 success, 1 scrape/network error, 2 bad usage.

Only scrape content you have the right to use, and keep the delay polite.`

class UsageError extends Error {}

async function main(): Promise<void> {
  let parsed
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        out: { type: 'string', short: 'o', default: 'data/albums.json' },
        images: { type: 'boolean', default: false },
        delay: { type: 'string', default: '1000' },
        help: { type: 'boolean', short: 'h', default: false }
      }
    })
  } catch (err) {
    throw new UsageError((err as Error).message)
  }
  const { values, positionals } = parsed
  if (values.help) {
    console.log(HELP)
    return
  }
  if (positionals.length !== 1) throw new UsageError('Expected exactly one <artist> argument')
  const delayMs = Number(values.delay)
  if (!Number.isFinite(delayMs) || delayMs < 0) throw new UsageError('--delay must be a non-negative number')

  let origin: string
  try {
    origin = resolveArtistOrigin(positionals[0] as string)
  } catch (err) {
    throw new UsageError((err as Error).message)
  }

  const out = path.resolve(values.out)
  const albums = await scrapeArtist({
    origin,
    delayMs,
    imagesDir: values.images ? path.join(path.dirname(out), 'images') : null,
    log: msg => console.error(msg)
  })
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, JSON.stringify({ albums }, null, 2) + '\n')
  const songs = albums.reduce((n, a) => n + a.songs.length, 0)
  console.error(`Wrote ${albums.length} album(s), ${songs} track(s) to ${out}`)
}

main().catch(err => {
  if (err instanceof UsageError) {
    console.error(`Error: ${err.message}\n\n${HELP}`)
    process.exit(2)
  }
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
