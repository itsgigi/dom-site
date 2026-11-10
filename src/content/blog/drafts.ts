import { toPosts } from './load'
import type { BlogPostFile } from './types'

// Imported in dev only (see index.ts), so drafts never reach a production build.
const files = import.meta.glob<BlogPostFile>('./_drafts/*/post.json', { eager: true, import: 'default' })
const images = import.meta.glob<string>('./_drafts/*/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export default toPosts(files, images, true)
