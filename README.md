# bandcamp-lyrics-scrape

A small CLI that reads a Bandcamp artist's public pages and saves their albums, track lists and lyrics as one JSON file. Optionally downloads cover art.

## Install

Requires Node.js 20.18.1 or newer (running the tests needs 22.12+).

```sh
git clone https://github.com/lvelazquez/bandcamp-lyrics-scrape.git
cd bandcamp-lyrics-scrape
npm install
npm run build
```

## Usage

```sh
node dist/cli.js elmedio                       # -> data/albums.json
node dist/cli.js elmedio.bandcamp.com -o out/el-medio.json
node dist/cli.js https://elmedio.bandcamp.com --images --delay 2000
node dist/cli.js --help
```

`npm link` (or installing the package globally) exposes it as `bandcamp-lyrics-scrape`.

| Option | Meaning |
| --- | --- |
| `<artist>` | Handle (`elmedio`), host or URL |
| `-o, --out <file>` | Output file, default `data/albums.json` |
| `--images` | Save covers to `images/` next to the output file |
| `--delay <ms>` | Pause between requests, default 1000 |

Exit codes: `0` success, `1` network/scrape error, `2` bad usage. Progress goes to stderr.

### Output

```json
{
  "albums": [
    {
      "title": "Crónicas del hombre orquesta vol. 1",
      "url": "https://elmedio.bandcamp.com/album/...",
      "imgSrc": "https://f4.bcbits.com/img/...jpg",
      "date": "2012-01-27",
      "songs": [{ "order": "1", "title": "...", "time": "02:14", "lyrics": "..." }]
    }
  ]
}
```

`lyrics` is `null` for tracks with no published lyrics.

### Limitations

- Single-track releases (`/track/...` links on the music page) are listed with an empty `songs` array and a warning; only album pages are parsed.
- Parsing depends on Bandcamp's current page markup and may break when it changes. The fixtures in `test/fixtures` document what is expected.

## Development

```sh
npm run build      # compile to dist/
npm run typecheck
npm test           # unit tests against saved HTML fixtures, no network
```

## Legal note

Bandcamp's Terms of Use restrict automated access, and lyrics and artwork belong to their artists. Use this only for personal purposes (for example backing up your own band's lyrics or personal study), do not redistribute scraped content, keep the request delay polite, and stop if a site asks you to. You are responsible for how you use it.

## License

ISC, as declared in `package.json`. No separate license file is included yet.
