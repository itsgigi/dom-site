import { useEffect } from 'react'
import { Link } from 'react-router'
import BlogShell, { DraftBadge } from '../components/blog/BlogShell'
import { getPosts } from '../content/blog'

export default function BlogIndex() {
  const posts = getPosts()

  useEffect(() => {
    document.title = "What's on in Milan · Days of Milan"
  }, [])

  return (
    <BlogShell
      top={
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-merlot md:text-sm">The Journal</p>
          <h1 className="mt-3 font-kopiku text-5xl uppercase leading-[0.95] text-merlot md:text-7xl">
            What's on in Milan
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-night md:text-lg">
            Every month we round up the exhibitions, festivals, food and get-togethers worth leaving the sofa for.
            The same lists you love on our Instagram, all in one place.
          </p>
        </div>
      }
    >
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        {posts.length === 0 ? (
          <p className="text-center text-night/70">New lists are on their way. Check back soon!</p>
        ) : (
          <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link to={`/blog/${post.slug}`} className="group block">
                  <div className="overflow-hidden rounded-3xl bg-sky">
                    {post.cover && (
                      <img
                        src={post.cover}
                        alt=""
                        loading="lazy"
                        className="aspect-4/5 w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-merlot">{post.kicker}</p>
                    {post.draft && <DraftBadge />}
                  </div>
                  <h2 className="mt-2 font-kopiku text-3xl uppercase leading-none text-merlot">{post.title}</h2>
                  <p className="mt-3 leading-relaxed text-night/80">{post.excerpt}</p>
                  <p className="mt-4 text-sm font-bold uppercase tracking-[0.15em] text-night underline decoration-sky decoration-2 underline-offset-6 transition-colors group-hover:text-merlot">
                    Read the list
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </BlogShell>
  )
}
