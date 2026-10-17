import { useCallback, useEffect, useRef, useState } from 'react'
import bgImage from '../assets/3.png'
import cutoutImage from '../assets/4.png'
import { BASE_GUIDES } from './sections/GuidesShowcase'

// Prova: two-layer parallax card (Apple-style product overlay).
// bgImage = full photo. cutoutImage = same subject, background removed.
// Stacked, they read as one image at rest; hover/scroll pull them apart
// in depth (front layer moves more than back = pop-out effect).
// Copy comes from the real guides catalog (BASE_GUIDES), repeated to fill
// the strip; the card centered under the cursor drives the title/description
// /download CTA shown below the carousel.

// Infinite loop: the guide set is rendered LOOP_COPIES times and the scroller
// starts on the middle copy. When a scroll settles outside the middle copy we
// jump instantly by whole sets back into it — content is identical, so the
// jump is invisible. Extra copies on each side absorb long flings.
const LOOP_SET = BASE_GUIDES.length
const LOOP_COPIES = 7
const MIDDLE_COPY = Math.floor(LOOP_COPIES / 2)
const GUIDES = Array.from({ length: LOOP_COPIES }, () => BASE_GUIDES).flat()
const SLIDE_COUNT = GUIDES.length
const RECENTER_DELAY = 140 // ms of scroll silence before looping back

const centerOf = (el: Element) => {
  const rect = el.getBoundingClientRect()
  return rect.left + rect.width / 2
}

const HOVER_TILT_MAX = 7 // deg, whole-card 3D tilt
const HOVER_BACK_SHIFT = 8 // px, back layer drift on hover
const HOVER_FRONT_SHIFT = 26 // px, front (cutout) layer drift on hover
const HOVER_FRONT_LIFT = 36 // px, front layer translateZ pop on hover

// At rest the two layers sit flush (scale 1, perfectly aligned — they read
// as one photo). On hover both scale up from center, which both sells the
// pop-out and gives the drifted image enough bleed to still cover the
// card edges; scaling from center keeps the crop aligned, an inset would not.
const BACK_HOVER_SCALE = 1.1
const FRONT_HOVER_SCALE = 1.18

type SlideEls = {
  tilt: HTMLDivElement | null
  back: HTMLImageElement | null
  front: HTMLImageElement | null
}

const emptyEls = (): SlideEls => ({ tilt: null, back: null, front: null })

export default function ParallaxOverlayCarousel() {
  const scrollerRef = useRef<HTMLUListElement>(null)
  const slideRefs = useRef<(HTMLLIElement | null)[]>([])
  const elsRef = useRef<SlideEls[]>(Array.from({ length: SLIDE_COUNT }, emptyEls))
  const hoverRef = useRef<{ index: number; x: number; y: number } | null>(null)
  const rafRef = useRef<number | null>(null)
  const activeIndexRef = useRef(0)
  const [activeIndex, setActiveIndex] = useState(0)

  const applyTransforms = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const scrollerRect = scroller.getBoundingClientRect()
    const centerX = scrollerRect.left + scrollerRect.width / 2

    // Pass 1: find which slide sits at the carousel center — only that one
    // gets the parallax treatment, the rest just fade/scale with distance.
    let nearestIndex = activeIndexRef.current
    let nearestDistance = Infinity
    const distances: number[] = []

    slideRefs.current.forEach((slide, i) => {
      if (!slide) {
        distances[i] = 1
        return
      }
      const rect = slide.getBoundingClientRect()
      const delta = (rect.left + rect.width / 2 - centerX) / (rect.width / 2)
      const distance = Math.min(1, Math.abs(delta))
      distances[i] = distance
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    })

    // Pass 2: apply. Hover only ever targets the centered card in practice
    // (side cards sit behind it, scaled down), but we gate on nearestIndex
    // explicitly so parallax never fires on a non-highlighted card.
    slideRefs.current.forEach((slide, i) => {
      const els = elsRef.current[i]
      if (!slide || !els.tilt || !els.back || !els.front) return

      const distance = distances[i]
      const isActive = i === nearestIndex
      const hovered = isActive && hoverRef.current?.index === i
      const hx = hovered ? hoverRef.current!.x : 0
      const hy = hovered ? hoverRef.current!.y : 0

      if (isActive) {
        els.tilt.style.transform = `rotateX(${-hy * HOVER_TILT_MAX}deg) rotateY(${hx * HOVER_TILT_MAX}deg)`

        const backScale = hovered ? BACK_HOVER_SCALE : 1
        els.back.style.transform = `translate3d(${hx * HOVER_BACK_SHIFT}px, ${hy * HOVER_BACK_SHIFT}px, 0) scale(${backScale})`

        const frontScale = hovered ? FRONT_HOVER_SCALE : 1
        const frontZ = hovered ? HOVER_FRONT_LIFT : 0
        els.front.style.transform = `translate3d(${hx * HOVER_FRONT_SHIFT}px, ${hy * HOVER_FRONT_SHIFT}px, ${frontZ}px) scale(${frontScale})`
      } else {
        els.tilt.style.transform = 'none'
        els.back.style.transform = 'none'
        els.front.style.transform = 'none'
      }

      slide.style.transform = `scale(${1 - distance * 0.08})`
      slide.style.opacity = String(1 - distance * 0.35)
    })

    if (nearestIndex !== activeIndexRef.current) {
      activeIndexRef.current = nearestIndex
      setActiveIndex(nearestIndex)
    }
  }, [])

  // Scroll by `sets` whole loop sets with no animation. Transitions are
  // switched off for the jump, otherwise the card landing in the center would
  // visibly animate from its old off-center scale/opacity.
  const jumpBySets = useCallback(
    (sets: number) => {
      const scroller = scrollerRef.current
      const first = slideRefs.current[0]
      const next = slideRefs.current[LOOP_SET]
      if (!scroller || !first || !next || sets === 0) return

      const setWidth = centerOf(next) - centerOf(first)
      const animated = slideRefs.current.flatMap((slide, i) => {
        const { tilt, back, front } = elsRef.current[i]
        return [slide, tilt, back, front].filter((el) => el !== null)
      })

      animated.forEach((el) => (el.style.transition = 'none'))
      scroller.scrollTo({ left: scroller.scrollLeft + sets * setWidth, behavior: 'instant' })
      if (hoverRef.current) hoverRef.current.index += sets * LOOP_SET
      applyTransforms()
      void scroller.offsetWidth // flush styles before transitions come back
      animated.forEach((el) => (el.style.transition = ''))
    },
    [applyTransforms],
  )

  const recenter = useCallback(() => {
    const copy = Math.floor(activeIndexRef.current / LOOP_SET)
    jumpBySets(MIDDLE_COPY - copy)
  }, [jumpBySets])

  useEffect(() => {
    const scroller = scrollerRef.current
    const start = slideRefs.current[MIDDLE_COPY * LOOP_SET]
    if (!scroller || !start) return

    // start on the first card of the middle copy
    scroller.scrollTo({
      left: scroller.scrollLeft + centerOf(start) - centerOf(scroller),
      behavior: 'instant',
    })

    let recenterTimer: number | undefined

    const onScroll = () => {
      window.clearTimeout(recenterTimer)
      recenterTimer = window.setTimeout(recenter, RECENTER_DELAY)
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        applyTransforms()
      })
    }

    const onResize = () => {
      applyTransforms()
      recenter()
    }

    applyTransforms()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.clearTimeout(recenterTimer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [applyTransforms, recenter])

  const handlePointerMove = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLLIElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      hoverRef.current = {
        index,
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      }
      applyTransforms()
    },
    [applyTransforms],
  )

  const handlePointerLeave = useCallback(() => {
    hoverRef.current = null
    applyTransforms()
  }, [applyTransforms])

  const activeGuide = BASE_GUIDES[activeIndex % LOOP_SET]
  const isFree = activeGuide.price === null

  return (
    <section
      id="guides"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-sky py-24"
    >
      <div className="mb-12 flex w-full max-w-2xl flex-col items-center gap-6 px-6 text-center">
        <p className="font-helvetica text-sm font-bold uppercase tracking-[0.2em] text-night/60">
          Guides
        </p>
        <h2 className="font-kopiku text-4xl uppercase text-merlot sm:text-5xl">
          Milan, in your pocket
        </h2>
      </div>

      <ul
        ref={scrollerRef}
        className="flex w-full max-w-332 snap-x snap-mandatory gap-10 overflow-x-auto scroll-smooth px-6 scroll-px-6 py-4 scrollbar-none [&::-webkit-scrollbar]:hidden"
        style={{ perspective: '1400px' }}
        aria-label="Guides, parallax showcase"
      >
        {GUIDES.map((_, i) => (
          <li
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el
            }}
            onPointerMove={handlePointerMove(i)}
            onPointerLeave={handlePointerLeave}
            className="w-72 shrink-0 snap-center transition-[opacity,transform] duration-300 ease-out sm:w-96"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              ref={(el) => {
                elsRef.current[i].tilt = el
              }}
              className="relative aspect-2/3 overflow-hidden rounded-4xl bg-night shadow-lg transition-transform duration-300 ease-out"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <img
                ref={(el) => {
                  elsRef.current[i].back = el
                }}
                src={bgImage}
                alt=""
                aria-hidden="true"
                loading="lazy"
                draggable={false}
                className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-300 ease-out will-change-transform"
              />
              <img
                ref={(el) => {
                  elsRef.current[i].front = el
                }}
                src={cutoutImage}
                alt=""
                aria-hidden="true"
                loading="lazy"
                draggable={false}
                className="absolute inset-0 h-full w-full select-none object-cover drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out will-change-transform"
              />
            </div>
          </li>
        ))}
      </ul>

      <div
        key={activeIndex % LOOP_SET}
        className="mt-10 flex w-full max-w-xl flex-col items-center gap-4 px-6 text-center animate-[fade-up_0.4s_ease-out]"
      >
        <h3 className="font-kopiku text-3xl uppercase text-merlot sm:text-4xl">
          {activeGuide.title}
        </h3>
        <p className="font-helvetica text-base leading-relaxed text-night/70">
          {activeGuide.description}
        </p>
        <a
          href="#contacts"
          className={`mt-2 rounded-full px-8 py-3.5 text-center font-helvetica text-sm font-bold uppercase tracking-[0.15em] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-night ${
            isFree ? 'bg-night text-ivory' : 'bg-merlot text-ivory'
          }`}
        >
          {isFree ? 'Download it free' : `Download · €${activeGuide.price}`}
        </a>
      </div>
    </section>
  )
}
