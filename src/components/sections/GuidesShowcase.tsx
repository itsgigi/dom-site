import { useRef } from 'react'
import guideOne from '../../assets/guides/1.jpg'
import guideTwo from '../../assets/guides/2.jpg'

export type Guide = {
  title: string
  description: string
  image: string
  tags: string[]
  price: number | null // null = free
}

export const BASE_GUIDES: Guide[] = [
  {
    title: 'Wine tasting',
    description:
      'Immerse yourself in the world of wine. What to pour, where to sip and how to enjoy every glass.',
    image: guideOne,
    tags: ['Wine', 'PDF'],
    price: null,
  },
  {
    title: 'Ceramic workshop',
    description:
      'Get your hands in the clay. Where to try the wheel in Milan, no experience needed.',
    image: guideTwo,
    tags: ['Craft', 'PDF'],
    price: 9,
  },
]

// each guide repeated 3 times (1,2,1,2,1,2) to preview the horizontal scroll
const GUIDES: Guide[] = Array.from({ length: 3 }, () => BASE_GUIDES).flat()

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${direction === 'left' ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function GuideCard({ guide }: { guide: Guide }) {
  const isFree = guide.price === null

  return (
    <li className="w-72 shrink-0 snap-start sm:w-80">
      <article className="relative flex aspect-5/8 flex-col justify-end overflow-hidden rounded-4xl bg-night text-left">
        <img
          src={guide.image}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        {/* photo melts into night toward the text */}
        <div
          className="absolute inset-0 bg-linear-to-b from-transparent from-35% via-night/70 via-80% to-night/90"
          aria-hidden="true"
        />
        
        <div className="relative flex flex-col gap-4 p-4">
          <p className="font-helvetica text-sm leading-relaxed text-ivory/70">
            {guide.description}
          </p>

          <ul className="flex gap-2" aria-label="Tags">
            {guide.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-ivory/15 px-3 py-1.5 font-helvetica text-xs font-bold uppercase tracking-[0.15em] text-ivory"
              >
                {tag}
              </li>
            ))}
          </ul>

          <a
            href="#contacts"
            className={`rounded-full py-3.5 text-center font-helvetica text-sm font-bold uppercase tracking-[0.15em] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ivory ${
              isFree ? 'bg-sky text-night' : 'bg-ivory text-night'
            }`}
          >
            {isFree ? 'Grab it free' : `Get it · €${guide.price}`}
          </a>
        </div>
      </article>
    </li>
  )
}

export default function GuidesShowcase() {
  const scroller = useRef<HTMLUListElement>(null)

  const scrollByCard = (direction: 1 | -1) => {
    const el = scroller.current
    if (!el) return
    const card = el.firstElementChild as HTMLElement | null
    if (!card) return
    el.scrollBy({ left: direction * (card.offsetWidth + 40), behavior: 'smooth' })
  }

  return (
    <section
      id="guides"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-sky py-24"
    >
      <div className="mb-12 flex w-full max-w-2xl flex-col items-center gap-6 px-6 text-center">
        <p className="font-helvetica text-sm font-bold uppercase tracking-[0.2em] text-merlot">
          Guides
        </p>
        <h2 className="font-kopiku text-4xl uppercase text-merlot sm:text-5xl">
          Milan, in your pocket
        </h2>
      </div>

      <ul
        ref={scroller}
        className="flex w-full max-w-332 snap-x snap-mandatory gap-10 overflow-x-auto scroll-smooth px-6 scroll-px-6 py-4 scrollbar-none [&::-webkit-scrollbar]:hidden"
        aria-label="Guides"
      >
        {GUIDES.map((guide, i) => (
          <GuideCard key={i} guide={guide} />
        ))}
      </ul>

      <div className="mt-8 hidden justify-center gap-3 sm:flex">
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          aria-label="Previous guides"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-sky text-night transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-night"
        >
          <ArrowIcon direction="left" />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          aria-label="Next guides"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-merlot text-ivory transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-night"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>
    </section>
  )
}
