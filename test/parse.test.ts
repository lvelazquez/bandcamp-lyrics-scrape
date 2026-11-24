import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseAlbum, parseDiscography, toIsoDate } from '../src/parse.js'
import { resolveArtistOrigin, slugify } from '../src/scrape.js'

const fixture = (name: string): string =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('parseDiscography', () => {
  it('extracts unique album links with trimmed titles', () => {
    expect(parseDiscography(fixture('music.html'))).toEqual([
      { title: 'First album', href: '/album/first-album' },
      { title: 'Second album', href: '/album/second-album' }
    ])
  })

  it('returns an empty list for a page without albums', () => {
    expect(parseDiscography('<html></html>')).toEqual([])
  })
})

describe('parseAlbum', () => {
  const album = parseAlbum(
    fixture('album.html'),
    { title: 'First album', href: '/album/first-album' },
    'https://x.bandcamp.com/album/first-album'
  )

  it('reads album metadata', () => {
    expect(album.title).toBe('First album')
    expect(album.date).toBe('2012-01-27')
    expect(album.imgSrc).toBe('https://f4.bcbits.com/img/a1_2.jpg')
  })

  it('reads tracks in order', () => {
    expect(album.songs.map(s => [s.order, s.title, s.time])).toEqual([
      ['1', 'Song one', '02:14'],
      ['2', 'Song two', '03:09'],
      ['3', 'Instrumental', '04:32']
    ])
  })

  it('prefers HTML lyrics, falls back to JSON-LD, else null', () => {
    expect(album.songs[0]?.lyrics).toBe('Song one\nLa la la\nla la')
    expect(album.songs[1]?.lyrics).toBe('JSON-LD only lyrics')
    expect(album.songs[2]?.lyrics).toBeNull()
  })

  it('tolerates a page with no tracks or metadata', () => {
    const empty = parseAlbum('<html></html>', { title: 'T', href: '/a' }, 'u')
    expect(empty).toEqual({ title: 'T', url: 'u', imgSrc: null, date: null, songs: [] })
  })
})

describe('helpers', () => {
  it('toIsoDate handles bad input', () => {
    expect(toIsoDate(undefined)).toBeNull()
    expect(toIsoDate('nope')).toBeNull()
  })

  it('resolveArtistOrigin accepts handles, hosts and URLs', () => {
    expect(resolveArtistOrigin('elmedio')).toBe('https://elmedio.bandcamp.com')
    expect(resolveArtistOrigin('elmedio.bandcamp.com')).toBe('https://elmedio.bandcamp.com')
    expect(resolveArtistOrigin('http://elmedio.bandcamp.com/music')).toBe('http://elmedio.bandcamp.com')
    expect(() => resolveArtistOrigin('bad handle!')).toThrow()
    expect(() => resolveArtistOrigin(' ')).toThrow()
  })

  it('slugify makes safe filenames', () => {
    expect(slugify('Crónicas del hombre, vol. 1')).toBe('cronicas-del-hombre-vol-1')
    expect(slugify('???')).toBe('album')
  })
})
