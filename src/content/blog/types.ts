// Shape of a blog post on disk: src/content/blog/<slug>/post.json, with its
// images (cover + one per item) sitting next to it in the same folder.
// scripts/import-instagram.ts writes these files; the site only reads them.

export type BlogItem = {
  title: string
  description: string
  /** dates/times as written on the slide, e.g. "Until 8 Nov" */
  when: string | null
  venue: string | null
  /** file name in the post's folder, e.g. "slide-02.jpg" */
  image: string | null
}

export type BlogPostFile = {
  slug: string
  title: string
  /** publish date, YYYY-MM-DD */
  date: string
  /** short label above the title, e.g. "November 2026" */
  kicker: string
  /** one or two lines for the blog index and meta description */
  excerpt: string
  intro: string
  /** file name in the post's folder */
  cover: string | null
  instagramUrl: string | null
  items: BlogItem[]
}
