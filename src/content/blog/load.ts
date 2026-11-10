import type { BlogItem, BlogPostFile } from './types'

export type BlogPost = Omit<BlogPostFile, 'cover' | 'items'> & {
  cover: string | null
  items: (Omit<BlogItem, 'image'> & { image: string | null })[]
  draft: boolean
}

// Turns Vite glob results (post.json files + image URLs) into posts with
// resolved image URLs.
export function toPosts(
  files: Record<string, BlogPostFile>,
  images: Record<string, string>,
  draft: boolean,
): BlogPost[] {
  return Object.entries(files).map(([path, post]) => {
    const folder = path.slice(0, path.lastIndexOf('/'))
    const resolve = (file: string | null) => (file ? (images[`${folder}/${file}`] ?? null) : null)
    return {
      ...post,
      draft,
      cover: resolve(post.cover),
      items: post.items.map((item) => ({ ...item, image: resolve(item.image) })),
    }
  })
}
