import { useRef } from 'react'

type Guide = {
  title: string
  description: string
  image: string
  pages: number
  price: number | null // null = free
}

const GUIDES: Guide[] = [
  {
    title: 'Your first week in Milan',
    description:
      'Metro, SIM cards, groceries, coffee etiquette. The simple stuff nobody tells you when you land.',
    image: 'https://picsum.photos/id/1043/800/600',
    pages: 12,
    price: null,
  },
  {
    title: 'Aperitivo, the local way',
    description:
      'Where to go, what to order and how not to look like a tourist. Navigli and beyond.',
    image: 'https://picsum.photos/id/1050/800/600',
    pages: 18,
    price: null,
  },
  {
    title: 'Hidden Milan: 25 corners',
    description:
      'Quiet courtyards, tiny shops and local favourites, mapped neighbourhood by neighbourhood.',
    image: 'https://picsum.photos/id/1060/800/600',
    pages: 42,
    price: 9,
  },
  {
    title: 'The food lover’s guide',
    description:
      'Trattorie, bakeries and pizza spots we actually love. No hype, just good tables.',
    image: 'https://picsum.photos/id/292/800/600',
    pages: 56,
    price: 12,
  },
  {
    title: 'Weekend escapes from Milan',
    description:
      'Lakes, mountains and small towns, all easy to reach by train. Plans for one day or two.',
    image: 'https://picsum.photos/id/312/800/600',
    pages: 38,
    price: 8,
  },
]

const PAGE_CURVE = { filter: 'url(#page-curve)' }

// Displacement map for the page curve: green channel follows a circular-ish
// arch across the page width (0 at the edges, max in the middle), so text
// lines bow upward like the top edge of an open book's pages.
const CURVE_MAP = (() => {
  const stops = Array.from({ length: 21 }, (_, i) => {
    const u = i / 20
    const arch = 1 - (2 * u - 1) ** 2
    const g = Math.round(128 + 127 * arch)
    return `<stop offset="${u}" stop-color="rgb(128,${g},128)"/>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})()

function PageCurveFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <filter
          id="page-curve"
          x="0"
          y="0"
          width="1"
          height="1"
          primitiveUnits="objectBoundingBox"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={CURVE_MAP}
            x="0"
            y="0"
            width="1"
            height="1"
            preserveAspectRatio="none"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale="0.045"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}

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
    <li className="w-[85vw] max-w-120 shrink-0 snap-start">
      <a
        href="#contacts"
        className="group block h-full cursor-pointer rounded-3xl bg-linear-to-b from-ivory from-50% to-[#6f4327] to-50% p-0.5 shadow-md transition-transform duration-300 ease-out hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-night motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
      <article className="flex h-full flex-col overflow-hidden rounded-[22px] bg-ivory text-left">
        <div className="relative">
          <img
            src={guide.image}
            alt=""
            loading="lazy"
            className="aspect-video w-full object-cover"
          />
          <span
            className={`absolute left-4 top-4 rounded-full px-3 py-1.5 font-helvetica text-xs font-bold uppercase tracking-[0.15em] ${
              isFree ? 'bg-ivory text-night' : 'bg-merlot text-ivory'
            }`}
          >
            {isFree ? 'Free' : `€${guide.price}`}
          </span>
          {/* two half-circles at the photo/text junction: open-book pages */}
          <svg
            viewBox="0 0 200 20"
            preserveAspectRatio="none"
            className="absolute inset-x-0 -bottom-px block h-5 w-full fill-ivory"
            aria-hidden="true"
          >
            <path d="M0 20A50 20 0 0 1 100 20A50 20 0 0 1 200 20Z" />
          </svg>
        </div>

        {/* open book: left page = info, right page = description + CTA */}
        <div className="relative grid aspect-video grid-cols-2 bg-ivory">
          <div
            className="absolute inset-y-0 left-1/2 w-px bg-night/10"
            aria-hidden="true"
          />

          <div className="flex flex-col gap-3 p-4 sm:p-6" style={PAGE_CURVE}>
            <p className="font-helvetica text-xs font-bold uppercase tracking-[0.2em] text-night/70">
              {guide.pages} pages · PDF
            </p>
            <h3 className="font-kopiku text-xl uppercase leading-tight text-merlot sm:text-3xl">
              {guide.title}
            </h3>
            <p className="mt-auto font-helvetica text-xs font-bold uppercase tracking-[0.2em] text-night">
              {isFree ? 'Free forever' : `One-time · €${guide.price}`}
            </p>
          </div>

          <div className="flex flex-col gap-4 p-4 sm:p-6" style={PAGE_CURVE}>
            <p className="font-helvetica text-sm leading-relaxed text-night sm:text-base">
              {guide.description}
            </p>
            <span
              className={`mt-auto self-start rounded-full px-4 py-2.5 font-helvetica text-xs font-bold uppercase tracking-[0.15em] transition-opacity group-hover:opacity-80 sm:px-5 ${
                isFree ? 'bg-night text-ivory' : 'bg-merlot text-ivory'
              }`}
            >
              {isFree ? 'Grab it free' : `Get it · €${guide.price}`}
            </span>
          </div>
        </div>
      </article>
      </a>
    </li>
  )
}

export default function Guides() {
  const scroller = useRef<HTMLUListElement>(null)

  const scrollByCard = (direction: 1 | -1) => {
    const el = scroller.current
    if (!el) return
    const card = el.firstElementChild as HTMLElement | null
    if (!card) return
    el.scrollBy({ left: direction * (card.offsetWidth + 24), behavior: 'smooth' })
  }

  return (
    <section
      id="guides"
      className="relative flex min-h-screen flex-col justify-center items-center overflow-hidden bg-sky py-24"
    >
      <PageCurveFilter />
      <div className="mx-auto mb-12 flex w-full max-w-2xl flex-col items-center gap-6 px-6 text-center">
        <p className="font-helvetica text-sm font-bold uppercase tracking-[0.2em] text-merlot">
          Guides
        </p>
        <h2 className="font-kopiku text-4xl uppercase text-merlot sm:text-5xl">
          Milan, in your pocket
        </h2>
        <p className="max-w-2xl font-helvetica text-lg leading-relaxed text-night/80">
          Some are free, some are a little deeper. All of them are written by
          people who remember what it feels like to be new here.
        </p>
      </div>

      <ul
        ref={scroller}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 scroll-px-6 max-w-328.25 py-4 scrollbar-none [&::-webkit-scrollbar]:hidden"
        aria-label="Guides"
      >
        {GUIDES.map((guide) => (
          <GuideCard key={guide.title} guide={guide} />
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
