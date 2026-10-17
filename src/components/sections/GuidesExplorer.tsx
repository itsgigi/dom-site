import { type Ref, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BASE_GUIDES } from './GuidesShowcase'

// Guides list → detail, animated in two phases:
// 1. Entrance: when the section scrolls in, the title rises and the cards land
//    from below in a long, strongly staggered expo ease (reads as a staircase).
// 2. Click: the clicked card's image "flies" (manual FLIP on a clone) from its
//    card slot to the wide hero slot of the detail view, siblings get pushed
//    off-screen, then the detail box rises in and its content staggers after
//    it. Back reverses it.
// Everything runs on the Web Animations API with fill: 'both', so initial
// states apply the moment an animation is created (inside layout effects,
// before paint) and cancelling one drops the element back to its CSS state.

type Phase = 'list' | 'opening' | 'detail' | 'closing'

type GuideDetail = {
  subtitle: string
  description: string
  meta: string // short line under the card in the list
}

// Mock detail content until the real guide data lands.
const GUIDE_DETAILS: Record<string, GuideDetail> = {
  'Wine tasting': {
    subtitle: 'An evening of natural wines in Isola',
    description:
      'Five small-batch wines, a table of new friends and a host who actually loves this stuff. We start with something bubbly, wander through a couple of reds and finish with a glass nobody expects. Snacks included, no wine knowledge needed, just come curious.',
    meta: '3 hrs · small group',
  },
  'Ceramic workshop': {
    subtitle: 'Your first bowl, on the wheel',
    description:
      'Two relaxed hours in a small studio near Navigli. You get clay, an apron and a patient teacher; we handle the kiln. Come back a week later to glaze your piece and take it home. Wobbly bowls are very welcome.',
    meta: '2 hrs · no experience needed',
  },
}

// each guide repeated 3 times so the strip bleeds past the right edge
const GUIDES = Array.from({ length: 3 }, () => BASE_GUIDES).flat()

// mirrors @theme in index.css — WAAPI needs literal colours to interpolate
const COLORS = { ivory: '#faf7f0', merlot: '#840808', night: '#1e1715' }

// GSAP eases as cubic-béziers
const EASE = {
  power2In: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  power3Out: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  power3InOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  expoOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
}

// 80rem content box, same width as About's centered row (32.5rem photo +
// 5.5rem gap + 42rem card), so both sections share the same left edge
const CONTAINER = 'mx-auto w-full max-w-[83rem] px-6'
// left edge of CONTAINER's content box, so the strip starts aligned with the
// title but bleeds all the way to the right edge of the viewport
const GUTTER = 'max(1.5rem, calc((100% - 80rem) / 2))'

type Box = { left: number; top: number; width: number; height: number }

const boxIn = (parent: Element, el: Element): Box => {
  const p = parent.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return { left: r.left - p.left, top: r.top - p.top, width: r.width, height: r.height }
}

const frame = (b: Box): Keyframe => ({
  left: `${b.left}px`,
  top: `${b.top}px`,
  width: `${b.width}px`,
  height: `${b.height}px`,
})

function tween(
  list: Animation[],
  el: Element | null | undefined,
  keyframes: Keyframe[],
  duration: number,
  delay: number,
  easing: string,
) {
  if (el) list.push(el.animate(keyframes, { duration, delay, easing, fill: 'both' }))
}

const ICONS = {
  back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  download: <path d="M12 3v12M6 11l6 6 6-6M4 21h16" />,
}

function Icon({ name, className = 'h-5 w-5' }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

const priceLabel = (price: number | null) => (price === null ? 'Free' : `€${price}`)

// price badge hanging half off the image's top-right corner
function Badge({
  price,
  active = false,
  className = '',
  ref,
}: {
  price: number | null
  active?: boolean
  className?: string
  ref?: Ref<HTMLSpanElement>
}) {
  return (
    <span
      ref={ref}
      className={`absolute -right-6 -top-6 flex h-12 min-w-12 items-center justify-center rounded-4xl px-3 font-helvetica text-xs font-bold uppercase tracking-widest shadow-md ${
        active ? 'bg-merlot text-ivory' : 'bg-ivory text-night'
      } ${className}`}
    >
      {priceLabel(price)}
    </span>
  )
}

export default function GuidesExplorer() {
  const [phase, setPhase] = useState<Phase>('list')
  const [selected, setSelected] = useState<number | null>(null)
  const [entered, setEntered] = useState(false)
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const flyerRef = useRef<HTMLDivElement>(null)
  const flyerBadgeRef = useRef<HTMLSpanElement>(null)
  const cardRefs = useRef<(HTMLLIElement | null)[]>([])
  const cardImgRefs = useRef<(HTMLDivElement | null)[]>([])
  const cardButtonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const metaRefs = useRef<(HTMLDivElement | null)[]>([])
  const boxItemRefs = useRef<(HTMLElement | null)[]>([])

  const guide = GUIDES[selected ?? 0]
  const detail = GUIDE_DETAILS[guide.title]
  const flying = phase === 'opening' || phase === 'closing'

  const rise = useCallback(
    (y: number): Keyframe[] =>
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: `translateY(${y}px)` },
            { opacity: 1, transform: 'translateY(0)' },
          ],
    [reduced],
  )

  const fall = useCallback((y: number): Keyframe[] => [...rise(y)].reverse(), [rise])

  // Phase 1 — entrance. Animations are created paused so their first keyframe
  // (hidden, pushed down) applies before first paint; the observer plays them
  // once the section's top reaches ~75% of the viewport.
  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const anims: Animation[] = []
    tween(anims, titleRef.current, rise(20), 800, 0, EASE.power3Out)
    cardRefs.current.forEach((card, i) =>
      tween(anims, card, rise(230), 1100, 150 + i * 130, EASE.expoOut),
    )
    anims.forEach((a) => a.pause())

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        anims.forEach((a) => a.play())
        Promise.all(anims.map((a) => a.finished))
          .then(() => {
            anims.forEach((a) => a.cancel())
            setEntered(true)
          })
          .catch(() => {})
      },
      { rootMargin: '0px 0px -25% 0px' },
    )
    io.observe(section)

    return () => {
      io.disconnect()
      anims.forEach((a) => a.cancel())
    }
  }, [rise])

  // Phase 2 — card → detail. Runs in the 'opening' commit: the list is still
  // in flow, the detail sits absolutely on top of it (visible, so its bar and
  // rows can animate in) and the flyer clone is shown over the clicked card.
  const buildOpen = useCallback(
    (i: number): Animation[] => {
      const stage = stageRef.current
      const detail = detailRef.current
      const slot = slotRef.current
      const img = cardImgRefs.current[i]
      if (!stage || !detail || !slot || !img) return []

      const from = boxIn(stage, img)
      const to = boxIn(stage, slot)
      const listHeight = stage.offsetHeight
      const detailHeight = detail.offsetHeight
      const flight = reduced ? 1 : 900
      const anims: Animation[] = []

      tween(anims, flyerBadgeRef.current, [
        { backgroundColor: COLORS.ivory, color: COLORS.night },
        { backgroundColor: COLORS.merlot, color: COLORS.ivory },
      ], 300, 0, 'ease-out')

      cardRefs.current.forEach((card, j) => {
        if (j === i) return
        const dir = j < i ? -1 : 1
        tween(
          anims,
          card,
          reduced
            ? [{ opacity: 1 }, { opacity: 0 }]
            : [{ transform: 'translateX(0)' }, { transform: `translateX(${dir * 110}vw)` }],
          700,
          (Math.abs(j - i) - 1) * 50,
          EASE.power2In,
        )
      })

      tween(anims, metaRefs.current[i], [{ opacity: 1 }, { opacity: 0 }], 400, 150, 'ease-out')

      tween(anims, flyerRef.current, [frame(from), frame(to)], flight, 100, EASE.power3InOut)
      tween(anims, stage, [
        { height: `${listHeight}px` },
        { height: `${detailHeight}px` },
      ], flight, 100, EASE.power3InOut)

      tween(anims, backRef.current, [{ opacity: 0 }, { opacity: 1 }], 400, 700, 'ease-out')
      tween(anims, boxRef.current, rise(40), 600, 600, EASE.power3Out)
      boxItemRefs.current.forEach((item, k) =>
        tween(anims, item, rise(30), 500, 800 + k * 80, EASE.power3Out),
      )

      return anims
    },
    [reduced, rise],
  )

  // Detail → card, the same choreography in reverse. Runs in the 'closing'
  // commit, where the list is back in flow (so the card box is measurable)
  // and every element starts from its opened state via fill: 'both'.
  const buildClose = useCallback(
    (i: number): Animation[] => {
      const stage = stageRef.current
      const detail = detailRef.current
      const slot = slotRef.current
      const img = cardImgRefs.current[i]
      if (!stage || !detail || !slot || !img) return []

      const from = boxIn(stage, slot)
      const to = boxIn(stage, img)
      const listHeight = stage.offsetHeight
      const detailHeight = detail.offsetHeight
      const flight = reduced ? 1 : 900
      const anims: Animation[] = []

      const items = boxItemRefs.current.filter((item) => item !== null)
      items.forEach((item, k) =>
        tween(anims, item, fall(30), 300, (items.length - 1 - k) * 40, EASE.power2In),
      )
      tween(anims, boxRef.current, fall(40), 350, 100, EASE.power2In)
      tween(anims, backRef.current, [{ opacity: 1 }, { opacity: 0 }], 250, 0, 'ease-in')

      tween(anims, flyerRef.current, [frame(from), frame(to)], flight, 200, EASE.power3InOut)
      tween(anims, stage, [
        { height: `${detailHeight}px` },
        { height: `${listHeight}px` },
      ], flight, 200, EASE.power3InOut)

      cardRefs.current.forEach((card, j) => {
        if (j === i) return
        const dir = j < i ? -1 : 1
        tween(
          anims,
          card,
          reduced
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ transform: `translateX(${dir * 110}vw)` }, { transform: 'translateX(0)' }],
          700,
          450 + (Math.abs(j - i) - 1) * 50,
          EASE.power3Out,
        )
      })

      tween(anims, flyerBadgeRef.current, [
        { backgroundColor: COLORS.merlot, color: COLORS.ivory },
        { backgroundColor: COLORS.ivory, color: COLORS.night },
      ], 300, 850, 'ease-out')

      tween(anims, metaRefs.current[i], [{ opacity: 0 }, { opacity: 1 }], 400, 850, 'ease-out')

      return anims
    },
    [reduced, fall],
  )

  // Cleanup cancels in the same commit that swaps the layout classes, so the
  // settled state takes over from the animations without a visible frame.
  useLayoutEffect(() => {
    if (selected === null) return
    if (phase === 'detail') {
      backRef.current?.focus({ preventScroll: true })
      return
    }
    if (phase === 'list') {
      cardButtonRefs.current[selected]?.focus({ preventScroll: true })
      return
    }

    const anims = phase === 'opening' ? buildOpen(selected) : buildClose(selected)
    let live = true
    Promise.all(anims.map((a) => a.finished))
      .then(() => {
        if (live) setPhase(phase === 'opening' ? 'detail' : 'list')
      })
      .catch(() => {})

    return () => {
      live = false
      anims.forEach((a) => a.cancel())
    }
  }, [phase, selected, buildOpen, buildClose])

  useEffect(() => {
    if (phase !== 'detail') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPhase('closing')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  const openGuide = (i: number) => {
    if (!entered || phase !== 'list') return
    setSelected(i)
    setPhase('opening')
  }

  const closeGuide = () => {
    if (phase === 'detail') setPhase('closing')
  }

  return (
    <section ref={sectionRef} id="guides" className="relative overflow-hidden bg-sky py-24">
      {/* title stays put in both views — everything animates below it */}
      <div ref={titleRef} className={`${CONTAINER} flex flex-col gap-4`}>
        <p className="font-helvetica text-sm font-bold uppercase tracking-[0.2em] text-night/60">
          Guides
        </p>
        <h2 className="font-kopiku text-4xl uppercase text-merlot sm:text-5xl">
          Milan, in your pocket
        </h2>
      </div>

      <div ref={stageRef} className="relative mt-4">
        {/* LIST */}
        <div
          inert={phase === 'detail'}
          className={phase === 'detail' ? 'invisible absolute inset-x-0 top-0' : 'relative'}
        >
          <ul
            className={`flex gap-11 pb-6 pr-6 pt-10 ${
              entered
                ? 'snap-x snap-mandatory overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden'
                : 'overflow-visible'
            }`}
            style={{ paddingLeft: GUTTER, scrollPaddingLeft: GUTTER }}
            aria-label="Guides"
          >
            {GUIDES.map((item, i) => {
              const hidden = selected === i && phase !== 'list'
              return (
                <li
                  key={i}
                  ref={(el) => {
                    cardRefs.current[i] = el
                  }}
                  className="w-64 shrink-0 snap-start sm:w-80"
                >
                  <button
                    ref={(el) => {
                      cardButtonRefs.current[i] = el
                    }}
                    type="button"
                    onClick={() => openGuide(i)}
                    className="group block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-night"
                  >
                    <div className={`relative ${hidden ? 'invisible' : ''}`}>
                      <div
                        ref={(el) => {
                          cardImgRefs.current[i] = el
                        }}
                        className="aspect-3/4 overflow-hidden rounded-3xl bg-night"
                      >
                        <img
                          src={item.image}
                          alt=""
                          loading="lazy"
                          draggable={false}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <Badge
                        price={item.price}
                        className="transition-transform duration-300 ease-out group-hover:-translate-y-1" />
                    </div>
                    <div
                      ref={(el) => {
                        metaRefs.current[i] = el
                      }}
                      className="mt-6 flex flex-col gap-1"
                    >
                      <h3 className="font-kopiku text-2xl uppercase text-merlot">{item.title}</h3>
                      <p className="font-helvetica text-sm text-night/60">
                        {GUIDE_DETAILS[item.title]?.meta}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* DETAIL */}
        <div
          ref={detailRef}
          inert={phase !== 'detail'}
          className={
            phase === 'detail'
              ? 'relative'
              : `pointer-events-none absolute inset-x-0 top-0 ${phase === 'list' ? 'invisible' : ''}`
          }
        >
          {/* pt-10 matches the strip's top padding: the hero lands where the cards start */}
          <div className={`${CONTAINER} pt-10`}>
            <div ref={slotRef} className="relative aspect-2/1 sm:aspect-[3.6/1]">
              <div
                className={`h-full w-full overflow-hidden rounded-3xl bg-night ${
                  phase === 'detail' ? '' : 'invisible'
                }`}
              >
                <img src={guide.image} alt="" className="h-full w-full object-cover" />
              </div>
              <Badge price={guide.price} active className={phase === 'detail' ? '' : 'invisible'} />
              <button
                ref={backRef}
                type="button"
                onClick={closeGuide}
                className="absolute left-4 top-4 z-30 flex cursor-pointer items-center gap-2.5 rounded-full bg-ivory px-5 py-3 font-helvetica text-sm font-bold shadow-md sm:left-6 sm:top-6 sm:px-6 sm:py-3.5 uppercase tracking-[0.15em] text-night transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
              >
                <Icon name="back" className="h-5 w-5" />
                All guides
              </button>
            </div>

            <div
              ref={boxRef}
              className="mt-6 flex flex-col gap-10 rounded-3xl bg-night p-8 sm:p-12 md:flex-row md:items-end md:justify-between"
            >
              <div className="flex max-w-2xl flex-col gap-4">
                <h3
                  ref={(el) => {
                    boxItemRefs.current[0] = el
                  }}
                  className="font-kopiku text-4xl uppercase text-ivory sm:text-5xl"
                >
                  {guide.title}
                </h3>
                <p
                  ref={(el) => {
                    boxItemRefs.current[1] = el
                  }}
                  className="font-helvetica text-sm font-bold uppercase tracking-[0.2em] text-sky"
                >
                  {detail.subtitle}
                </p>
                <p
                  ref={(el) => {
                    boxItemRefs.current[2] = el
                  }}
                  className="mt-2 font-helvetica text-base leading-relaxed text-ivory/70"
                >
                  {detail.description}
                </p>
              </div>

              <a
                ref={(el) => {
                  boxItemRefs.current[3] = el
                }}
                href="#contacts"
                className="flex shrink-0 items-center justify-center gap-3 self-stretch rounded-full bg-sky px-8 py-4 font-helvetica text-sm font-bold uppercase tracking-[0.15em] text-night transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky md:self-auto"
              >
                {guide.price === null ? 'Download free' : `Download · €${guide.price}`}
                <Icon name="download" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* FLYER — clone of the clicked card image, only shown mid-transition */}
        <div
          ref={flyerRef}
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 top-0 z-20 ${flying ? '' : 'hidden'}`}
        >
          <div className="h-full w-full overflow-hidden rounded-3xl bg-night">
            <img src={guide.image} alt="" className="h-full w-full object-cover" />
          </div>
          <Badge ref={flyerBadgeRef} price={guide.price} />
        </div>
      </div>
    </section>
  )
}
