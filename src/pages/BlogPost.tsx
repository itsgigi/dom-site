import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import BlogShell, { DraftBadge } from '../components/blog/BlogShell'
import { formatDate, getPost } from '../content/blog'

export default function BlogPostPage() {
  const { slug = '' } = useParams()
  const post = getPost(slug)

  useEffect(() => {
    document.title = post ? `${post.title} · Days of Milan` : 'Post not found · Days of Milan'
    const meta = document.querySelector('meta[name="description"]')
    if (meta && post) meta.setAttribute('content', post.excerpt)
  }, [post])

  if (!post) {
    return (
      <BlogShell
        top={
          <h1 className="font-kopiku text-5xl uppercase leading-none text-merlot md:text-6xl">
            We couldn't find that one
          </h1>
        }
      >
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
          <Link to="/blog" className="font-bold uppercase tracking-[0.15em] text-merlot underline underline-offset-6">
            See all the lists
          </Link>
        </div>
      </BlogShell>
    )
  }

  return (
    <BlogShell
      top={
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-16">
          <div>
            <Link
              to="/blog"
              className="text-xs font-bold uppercase tracking-[0.2em] text-night/70 transition-colors hover:text-merlot"
            >
              ← All lists
            </Link>
            <div className="mt-6 flex items-center gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-merlot md:text-sm">{post.kicker}</p>
              {post.draft && <DraftBadge />}
            </div>
            <h1 className="mt-3 font-kopiku text-5xl uppercase leading-[0.95] text-merlot md:text-7xl">{post.title}</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-night md:text-lg">{post.intro}</p>
            <p className="mt-6 text-sm text-night/70">
              {formatDate(post.date)}
              {post.instagramUrl && (
                <>
                  {' · '}
                  <a
                    href={post.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-merlot underline underline-offset-4"
                  >
                    See it on Instagram
                  </a>
                </>
              )}
            </p>
          </div>
          {post.cover && (
            <img
              src={post.cover}
              alt=""
              fetchPriority="high"
              className="mx-auto aspect-4/5 w-full max-w-sm rounded-3xl object-cover md:max-w-none"
            />
          )}
        </div>
      }
    >
      <ol className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 md:gap-24 md:px-10 md:py-24">
        {post.items.map((item, i) => (
          <li
            key={i}
            className={`grid items-center gap-8 ${item.image ? 'md:grid-cols-2 md:gap-16' : 'max-w-2xl'}`}
          >
            {item.image && (
              <img
                src={item.image}
                alt=""
                loading="lazy"
                className={`aspect-4/5 w-full rounded-3xl object-cover ${i % 2 ? 'md:order-2' : ''}`}
              />
            )}
            <div>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sky font-kopiku text-2xl text-merlot">
                {i + 1}
              </span>
              <h2 className="mt-5 font-kopiku text-3xl uppercase leading-none text-merlot md:text-4xl">{item.title}</h2>
              {(item.when || item.venue) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.when && (
                    <span className="rounded-full bg-sky px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-night">
                      {item.when}
                    </span>
                  )}
                  {item.venue && (
                    <span className="rounded-full border border-sky px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-night">
                      {item.venue}
                    </span>
                  )}
                </div>
              )}
              <p className="mt-4 text-base leading-relaxed text-night/85 md:text-lg">{item.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mx-auto max-w-6xl px-6 pb-24 md:px-10">
        <div className="flex flex-col items-start gap-6 rounded-4xl bg-merlot px-8 py-10 md:flex-row md:items-center md:justify-between md:px-14 md:py-14">
          <div>
            <h2 className="font-kopiku text-3xl uppercase leading-none text-ivory md:text-4xl">Never miss a month</h2>
            <p className="mt-3 max-w-md text-ivory/85">
              A new list lands on our Instagram at the start of every month. Come say hi!
            </p>
          </div>
          <a
            href="https://instagram.com/daysofmilan"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-ivory px-6 py-3.5 text-sm font-bold uppercase tracking-[0.1em] text-merlot transition-transform hover:-translate-y-0.5"
          >
            Follow @daysofmilan
          </a>
        </div>
      </section>
    </BlogShell>
  )
}
