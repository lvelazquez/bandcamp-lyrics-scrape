export const USER_AGENT =
  'bandcamp-lyrics-scrape/1.0 (+https://github.com/lvelazquez/bandcamp-lyrics-scrape; personal use)'

export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

export class HttpError extends Error {
  constructor(
    readonly url: string,
    readonly status: number
  ) {
    super(`GET ${url} failed with HTTP ${status}`)
    this.name = 'HttpError'
  }
}

const RETRYABLE = new Set([429, 500, 502, 503, 504])

async function request(url: string, timeoutMs: number): Promise<Response> {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(timeoutMs)
  })
  if (!res.ok) throw new HttpError(url, res.status)
  return res
}

/** GET with a timeout and up to `retries` retries (exponential backoff) on transient failures. */
async function withRetry(
  url: string,
  timeoutMs: number,
  retries: number
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request(url, timeoutMs)
    } catch (err) {
      const transient =
        !(err instanceof HttpError) || RETRYABLE.has(err.status)
      if (!transient || attempt >= retries) throw err
      await sleep(1000 * 2 ** attempt)
    }
  }
}

export async function getText(
  url: string,
  timeoutMs = 20_000,
  retries = 2
): Promise<string> {
  return (await withRetry(url, timeoutMs, retries)).text()
}

export async function getBuffer(
  url: string,
  timeoutMs = 20_000,
  retries = 2
): Promise<Buffer> {
  return Buffer.from(await (await withRetry(url, timeoutMs, retries)).arrayBuffer())
}
