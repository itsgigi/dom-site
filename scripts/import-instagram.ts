/**
 * Instagram carousel → blog post.
 *
 *   npm run blog:import -- <instagram-post-url> [options]
 *
 * 1. Gets the post's slides and caption: from the Instagram API (needs
 *    IG_ACCESS_TOKEN, see .env.example) or, with --images, from a local folder
 *    of slides you downloaded yourself.
 * 2. Sends slides + caption to Claude, which reads the text on every slide and
 *    returns the post as structured JSON (title, intro, one item per slide).
 * 3. Writes src/content/blog/_drafts/<date>-<slug>/post.json plus the images
 *    it uses. Drafts show up in `npm run dev` only: once you've checked the
 *    post, move its folder up into src/content/blog/ to publish it.
 *
 * Options
 *   --images <dir>     use the slides in this folder (sorted by name) instead of the API
 *   --caption <file>   caption text, for --images mode (optional)
 *   --date YYYY-MM-DD  publish date (default: the post's date, or today)
 *   --dry-run          fetch and prepare everything, but skip Claude and write nothing
 *   --force            overwrite an existing post folder
 *
 * Environment: ANTHROPIC_API_KEY (or an `ant auth login` profile), IG_ACCESS_TOKEN.
 */
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { z } from 'zod'
import type { BlogPostFile } from '../src/content/blog/types.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BLOG_DIR = path.join(ROOT, 'src/content/blog')
const DRAFTS_DIR = path.join(BLOG_DIR, '_drafts')
const IG_API = process.env.IG_GRAPH_BASE ?? 'https://graph.instagram.com/v23.0'
const MODEL = 'claude-opus-5-5'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // per-image limit for the Messages API

type Slide = { data: Buffer; mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; ext: string }
type Source = { slides: Slide[]; caption: string; date: string | null }

// ---------------------------------------------------------------- inputs

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    images: { type: 'string' },
    caption: { type: 'string' },
    date: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
})

const url = positionals[0]
if (!url) fail('Usage: npm run blog:import -- <instagram-post-url> [--images <dir>] [--caption <file>] [--date YYYY-MM-DD]')
const shortcode = url.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel)\/([A-Za-z0-9_-]+)/)?.[1]
if (!shortcode) fail(`Not an Instagram post URL: ${url}`)
const permalink = `https://www.instagram.com/p/${shortcode}/`
if (opts.date && !/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) fail('--date must be YYYY-MM-DD')

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

const mediaTypeOf = (ext: string): Slide['mediaType'] | null =>
  ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' } as const)[
    ext.toLowerCase() as '.jpg'
  ] ?? null

async function fromFolder(dir: string, captionFile?: string): Promise<Source> {
  const names = (await readdir(dir))
    .filter((n) => mediaTypeOf(path.extname(n)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  if (names.length === 0) fail(`No .jpg/.png/.webp images in ${dir}`)
  const slides = await Promise.all(
    names.map(async (n) => {
      const ext = path.extname(n).toLowerCase()
      return { data: await readFile(path.join(dir, n)), mediaType: mediaTypeOf(ext)!, ext: ext === '.jpeg' ? '.jpg' : ext }
    }),
  )
  const caption = captionFile ? await readFile(captionFile, 'utf8') : ''
  return { slides, caption, date: null }
}

type IgMedia = {
  id: string
  permalink?: string
  caption?: string
  timestamp?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  children?: { data: IgMedia[] }
}

async function igGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(endpoint)
  const body = (await res.json()) as T & { error?: { message: string } }
  if (!res.ok || body.error) fail(`Instagram API: ${body.error?.message ?? res.statusText}`)
  return body
}

// The API can't look a post up by shortcode, so walk the account's media until
// a permalink matches (a monthly post is always among the recent ones).
async function fromInstagram(): Promise<Source> {
  const token = process.env.IG_ACCESS_TOKEN
  if (!token) fail('IG_ACCESS_TOKEN is not set. Add it to .env, or pass --images <dir> with the slides.')
  const fields =
    'id,permalink,caption,timestamp,media_type,media_url,thumbnail_url,children{media_type,media_url,thumbnail_url}'
  let next: string | undefined = `${IG_API}/me/media?fields=${fields}&limit=50&access_token=${token}`
  let post: IgMedia | undefined
  for (let page = 0; next && !post && page < 10; page++) {
    const res: { data: IgMedia[]; paging?: { next?: string } } = await igGet(next)
    post = res.data.find((m) => m.permalink?.includes(`/${shortcode}/`))
    next = res.paging?.next
  }
  if (!post) fail(`Post ${shortcode} not found among this account's recent media.`)

  const media = post.media_type === 'CAROUSEL_ALBUM' ? (post.children?.data ?? []) : [post]
  const slides: Slide[] = []
  for (const m of media) {
    // videos inside a carousel: use their cover frame
    const src = m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url
    if (!src) continue
    const res = await fetch(src)
    if (!res.ok) fail(`Could not download slide ${slides.length + 1}: ${res.statusText}`)
    const type = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0]
    const ext = type === 'image/png' ? '.png' : type === 'image/webp' ? '.webp' : '.jpg'
    slides.push({ data: Buffer.from(await res.arrayBuffer()), mediaType: mediaTypeOf(ext)!, ext })
  }
  return { slides, caption: post.caption ?? '', date: post.timestamp?.slice(0, 10) ?? null }
}

// ---------------------------------------------------------------- Claude

const PostSchema = z.object({
  title: z.string().describe('Post title, usually the headline on the first slide, in sentence case'),
  slug: z.string().describe('URL slug: lowercase, words joined by hyphens, no dates'),
  kicker: z.string().describe('Month and year the list is about, e.g. "November 2026"'),
  excerpt: z.string().describe('One or two sentences for the blog index card, under 170 characters'),
  intro: z.string().describe('Two or three sentences opening the post, based on the caption'),
  coverSlide: z.number().int().describe('1-based number of the slide to use as the cover, normally 1'),
  items: z.array(
    z.object({
      slide: z.number().int().describe('1-based number of the slide this item comes from'),
      title: z.string().describe('The item headline as written on the slide, without its list number'),
      description: z.string().describe('The slide text, lightly tidied into full sentences'),
      when: z.string().nullable().describe('Dates or times exactly as given, e.g. "Until 8 Nov", or null'),
      venue: z.string().nullable().describe('Venue or neighbourhood if the slide names one, else null'),
    }),
  ),
})

const SYSTEM = `You turn Days of Milan's monthly Instagram carousels into blog posts for daysofmilan's website.

Days of Milan is a friendly companion for people living in Milan, newcomers and locals alike. Its voice is casual, warm, simple and a little playful, never corporate.

How a carousel is built: slide 1 is the cover with the headline; most following slides are one numbered recommendation, with a title and a short text over a photo; a few slides may be closing or promotional slides with no recommendation.

Rules:
- One item per recommendation slide, in slide order. Skip the cover and slides that are not a recommendation.
- Keep every fact exactly as on the slide: names, venues, dates, prices. Do not add facts that are not on the slides or in the caption, and do not guess missing dates or venues; use null.
- Write in English, keeping the slide's meaning. Light tidying only: fix line breaks and punctuation, expand the text into full sentences when it reads like a fragment.
- The excerpt and intro come from the caption and the cover, in the brand's voice. Leave out hashtags and SEO keyword lists from the caption.`

async function draftWithClaude(src: Source) {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: 'text', text: `This carousel has ${src.slides.length} slides, in order.` },
  ]
  src.slides.forEach((s, i) => {
    content.push({ type: 'text', text: `Slide ${i + 1}:` })
    content.push({ type: 'image', source: { type: 'base64', media_type: s.mediaType, data: s.data.toString('base64') } })
  })
  content.push({ type: 'text', text: `Instagram caption:\n${src.caption.trim() || '(no caption)'}` })

  const client = new Anthropic()
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // if a safety classifier declines, the API retries on a suitable model
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: betaZodOutputFormat(PostSchema) },
    system: SYSTEM,
    messages: [{ role: 'user', content }],
  })

  if (response.stop_reason === 'refusal') {
    fail(`Claude declined this post (${response.stop_details?.category ?? 'no category'}).`)
  }
  if (response.stop_reason === 'max_tokens') fail('The answer was cut off (max_tokens). Try again.')
  if (!response.parsed_output) fail('Claude did not return a post in the expected format.')
  return response.parsed_output
}

// ---------------------------------------------------------------- main

async function main() {
  console.log(`→ Post ${shortcode}`)
  const src = opts.images ? await fromFolder(opts.images, opts.caption) : await fromInstagram()
  console.log(`→ ${src.slides.length} slides, caption ${src.caption.length} chars`)

  const tooBig = src.slides.findIndex((s) => s.data.length > MAX_IMAGE_BYTES)
  if (tooBig >= 0) fail(`Slide ${tooBig + 1} is over 5 MB. Export the slides as JPEG and try again.`)

  if (opts['dry-run']) {
    console.log('→ Dry run: stopping before Claude. Nothing written.')
    return
  }

  console.log(`→ Reading the slides with ${MODEL}…`)
  let draft
  try {
    draft = await draftWithClaude(src)
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) fail('Anthropic credentials missing or invalid (ANTHROPIC_API_KEY).')
    if (error instanceof Anthropic.RateLimitError) fail('Rate limited by the Anthropic API. Try again in a minute.')
    if (error instanceof Anthropic.APIError) fail(`Anthropic API error ${error.status}: ${error.message}`)
    throw error
  }

  const count = src.slides.length
  const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= count
  const coverSlide = inRange(draft.coverSlide) ? draft.coverSlide : 1
  const slug = draft.slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const date = opts.date ?? src.date ?? new Date().toISOString().slice(0, 10)
  const folder = `${date}-${slug}`
  const dir = path.join(DRAFTS_DIR, folder)
  if (existsSync(path.join(BLOG_DIR, folder))) fail(`src/content/blog/${folder} is already published.`)
  if (existsSync(dir) && !opts.force) fail(`${path.relative(ROOT, dir)} already exists. Use --force to overwrite.`)

  // copy only the slides the post uses
  const used = new Set([coverSlide, ...draft.items.map((i) => i.slide).filter(inRange)])
  const fileFor = (n: number) => `slide-${String(n).padStart(2, '0')}${src.slides[n - 1].ext}`
  await mkdir(dir, { recursive: true })
  for (const n of used) await writeFile(path.join(dir, fileFor(n)), src.slides[n - 1].data)

  const post: BlogPostFile = {
    slug,
    title: draft.title,
    date,
    kicker: draft.kicker,
    excerpt: draft.excerpt,
    intro: draft.intro,
    cover: fileFor(coverSlide),
    instagramUrl: permalink,
    items: draft.items.map((item) => ({
      title: item.title,
      description: item.description,
      when: item.when,
      venue: item.venue,
      image: inRange(item.slide) ? fileFor(item.slide) : null,
    })),
  }
  await writeFile(path.join(dir, 'post.json'), `${JSON.stringify(post, null, 2)}\n`)

  console.log(`\n✓ ${post.items.length} items → ${path.relative(ROOT, dir)}/post.json`)
  console.log(`  Preview: npm run dev, then /blog/${slug}`)
  console.log('  Check names, dates and venues against the slides, then publish with:')
  console.log(`  mv ${path.relative(ROOT, dir)} src/content/blog/\n`)
}

await main()
