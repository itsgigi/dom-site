import { toPosts, type BlogPost } from './load'
import type { BlogPostFile } from './types'

// Every post is a folder with a post.json and its images:
//   src/content/blog/<folder>/          published
//   src/content/blog/_drafts/<folder>/  drafts, visible in `npm run dev` only
// Publishing a draft = moving its folder out of _drafts.

const files = import.meta.glob<BlogPostFile>('./*/post.json', { eager: true, import: 'default' })
const images = import.meta.glob<string>('./*/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const drafts: BlogPost[] = import.meta.env.DEV ? (await import('./drafts')).default : []

const all = [...toPosts(files, images, false), ...drafts].sort((a, b) => b.date.localeCompare(a.date))

export type { BlogPost }
export const getPosts = () => all
export const getPost = (slug: string) => all.find((post) => post.slug === slug)

export const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
