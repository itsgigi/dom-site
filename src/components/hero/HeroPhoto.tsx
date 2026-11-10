import { useEffect, useRef, useState, type CSSProperties } from 'react'
import logo from '../../assets/logo/Milan_Primary.svg'
import sky from '../../assets/hero/layers/sky.webp'
import city from '../../assets/hero/layers/city.webp'
import piazza from '../../assets/hero/layers/piazza.webp'
import duomo from '../../assets/hero/layers/duomo.webp'
import TopLeftNav from '../TopLeftNav'
import { prefersReducedMotion } from './mapUtils'

// Hero: the view from the Duomo rooftop, cut into four layers (sky, city,
// piazza, cathedral) plus a few atmosphere layers in between (fog behind the
// skyline, a cloud shadow over the piazza).
//
// Intro: nothing shows until every layer is decoded; then the whole scene fades
// in as one piece while the layers settle up by a few px. The rise is smaller
// than the 40px apron each back layer keeps under the front ones, so no gap
// ever opens behind them.
//
// Scroll, in two acts. First the hero is pinned (sticky) for PIN_SVH of extra
// scroll: the page doesn't move, the Sky box opens around the logo and the line
// grows down to the hero's bottom edge, meeting About's line. Then the page
// scrolls on and the layers drift: the further away, the more they lag.
//
// Every layer lives on a "stage" sized like object-fit: cover for the photo's
// 2400×1792 canvas (container query units), so overlays can be placed in photo
// percentages and stay glued to the right spot at any viewport size.

type Layer = { id: string; src?: string; lag: number; rise: number }

const LAYERS: Layer[] = [
  { id: 'sky', src: sky, lag: 0.32, rise: 0 },
  { id: 'fog', lag: 0.25, rise: 3 },
  { id: 'city', src: city, lag: 0.18, rise: 6 },
  { id: 'piazza', src: piazza, lag: 0.08, rise: 14 },
  { id: 'duomo', src: duomo, lag: 0, rise: 20 },
]

// extra scroll (svh) the hero stays pinned for while the box and line draw
const PIN_SVH = 40
// within the pin (0–1): the box is fully open by BOX_END, the line runs LINE_START → 1
const BOX_END = 0.45
const LINE_START = 0.15
// the ivory cloud bank at the bottom starts rising late in the pin (share of the
// pin) and is fully up after CLOUD_RISE of the hero's height more
const CLOUD_START = 0.6
const CLOUD_RISE = 0.5

// puffs along the cloud bank's top edge: [x %, y %, rx %, ry %] inside one tile.
// Ellipse sizes are in tile percentages (rx of the width, ry of the height), and
// y - ry stays well above 0, so a puff never touches the strip's top edge and
// gets cut flat, whatever the bank's height.
const PUFFS_BACK = [[8, 66, 14, 44], [27, 58, 17, 46], [47, 68, 13, 40], [64, 56, 18, 46], [86, 64, 15, 42]]
const PUFFS_FRONT = [[0, 80, 13, 40], [17, 74, 16, 44], [36, 82, 12, 38], [54, 72, 17, 44], [74, 80, 13, 40], [93, 74, 15, 42]]
const puffs = (list: number[][]) =>
  list
    .map(
      ([x, y, rx, ry]) =>
        `radial-gradient(ellipse ${rx}% ${ry}% at ${x}% ${y}%, rgb(${IVORY}) 0%, rgb(${IVORY}) 45%, rgba(${IVORY},0) 100%)`,
    )
    .join(', ')

// wind-blown mist behind the skyline: rows of soft streaks at different heights,
// sizes and speeds (the slower, the further), each bobbing on its own rhythm
const WISPS = [
  { top: 25, h: 11, dur: 55, bob: 6, blur: 7, opacity: 1, blobs: ['16% 34% at 10% 60%', '24% 30% at 38% 52%', '14% 28% at 63% 64%', '20% 32% at 88% 56%'] },
  { top: 19, h: 12, dur: 36, bob: 4.5, blur: 6, opacity: 0.9, blobs: ['20% 22% at 18% 55%', '12% 26% at 47% 42%', '18% 20% at 76% 60%'] },
  { top: 13, h: 10, dur: 22, bob: 3.5, blur: 5, opacity: 0.7, blobs: ['28% 13% at 22% 50%', '20% 11% at 58% 58%', '16% 12% at 90% 46%'] },
]

// object-fit: cover for a 2400×1792 photo, anchored at (--px, --py)
const STAGE: CSSProperties = {
  position: 'absolute',
  width: 'max(100cqw, calc(100cqh * 2400 / 1792))',
  height: 'max(100cqh, calc(100cqw * 1792 / 2400))',
  left: 'calc((100cqw - max(100cqw, calc(100cqh * 2400 / 1792))) * var(--px))',
  top: 'calc((100cqh - max(100cqh, calc(100cqw * 1792 / 2400))) * var(--py))',
}

const IVORY = '250, 247, 240'

// the bottom bar fades out over this share of the pin, before the line arrives
const BAR_FADE = 0.12

const milanTime = () =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(new Date())

export default function HeroPhoto() {
  const rootRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const layerRefs = useRef<(HTMLDivElement | null)[]>([])
  const imgRefs = useRef<(HTMLImageElement | null)[]>([])
  const lineRef = useRef<HTMLDivElement>(null)
  const cloudRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [time, setTime] = useState(milanTime)

  // Milan's local time in the bottom bar, kept current
  useEffect(() => {
    const id = window.setInterval(() => setTime(milanTime()), 15000)
    return () => window.clearInterval(id)
  }, [])

  // show the scene only once every layer can paint
  useEffect(() => {
    let done = false
    const show = () => {
      if (!done) {
        done = true
        setReady(true)
      }
    }
    const imgs = imgRefs.current.filter((i): i is HTMLImageElement => !!i)
    Promise.all(imgs.map((i) => i.decode().catch(() => undefined))).then(show)
    const t = window.setTimeout(show, 3000) // never leave the hero empty
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const still = prefersReducedMotion()

    let raf = 0
    const update = () => {
      raf = 0
      const sticky = stickyRef.current
      if (!sticky) return
      const h = sticky.offsetHeight
      const pin = root.offsetHeight - h
      const y = Math.max(window.scrollY - root.offsetTop, 0)
      // act 1: pinned, draw the box and the line
      const t = pin > 0 ? Math.min(1, y / pin) : 1
      // act 2: page scrolls, layers drift
      const s = Math.min(Math.max(y - pin, 0), h)
      if (!still) {
        LAYERS.forEach((layer, i) => {
          const el = layerRefs.current[i]
          if (el) el.style.transform = `translate3d(0, ${(s * layer.lag).toFixed(1)}px, 0)`
        })
      }
      const line = lineRef.current
      if (line) {
        const p = Math.min(1, Math.max(0, (t - LINE_START) / (1 - LINE_START)))
        line.style.transform = `scaleY(${p.toFixed(4)})`
      }
      const bar = barRef.current
      if (bar) {
        const o = 1 - Math.min(1, t / BAR_FADE)
        bar.style.opacity = o.toFixed(3)
        bar.style.visibility = o === 0 ? 'hidden' : ''
      }
      const cloud = cloudRef.current
      if (cloud) {
        const k = Math.min(1, Math.max(0, (y - pin * CLOUD_START) / (h * CLOUD_RISE)))
        const p = still ? 1 : 1 - (1 - k) ** 2 // ease-out: it settles, doesn't snap
        cloud.style.transform = `translate3d(0, ${((1 - p) * 100).toFixed(2)}%, 0)`
      }
      const box = boxRef.current
      if (box) {
        const k = Math.min(1, t / BOX_END)
        const p = 1 - (1 - k) ** 3 // ease-out
        // grows out of the line's top: up from the bottom edge and out to the sides
        box.style.clipPath = `inset(${((1 - p) * 100).toFixed(2)}% calc(${((1 - p) * 50).toFixed(2)}% - ${(
          (1 - p) *
          5
        ).toFixed(2)}px) 0 round 2rem)`
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const layerContent = (layer: Layer, i: number) => {
    const img = layer.src ? (
      <img
        ref={(el) => {
          imgRefs.current[i] = el
        }}
        src={layer.src}
        alt=""
        width={2400}
        height={1792}
        fetchPriority={i === 0 ? 'high' : 'auto'}
        draggable={false}
        className="absolute inset-0 h-full w-full"
      />
    ) : null

    switch (layer.id) {
      case 'fog':
        // mist behind the last buildings: a glow on the horizon plus wind-blown
        // streaks. It sits between the sky and the city layers, so the skyline
        // stands in front of it.
        return (
          <div className="absolute inset-x-0 top-[10%] h-[30%] overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, rgba(${IVORY},0) 0%, rgba(${IVORY},0.12) 45%, rgba(${IVORY},0.45) 74%, rgba(${IVORY},0.6) 88%, rgba(${IVORY},0.4) 100%)`,
              }}
            />
            {WISPS.map((w, k) => (
              <div
                key={k}
                className="hero-wisp-bob absolute inset-x-0"
                style={
                  {
                    top: `${((w.top - 10) / 30) * 100}%`,
                    height: `${(w.h / 30) * 100}%`,
                    opacity: w.opacity,
                    '--bob': `${w.bob}s`,
                  } as CSSProperties
                }
              >
                <div
                  className="hero-wisp absolute inset-y-0 left-0"
                  style={
                    {
                      '--dur': `${w.dur}s`,
                      filter: `blur(${w.blur}px)`,
                      backgroundImage: w.blobs
                        .map((b) => `radial-gradient(ellipse ${b}, rgba(${IVORY},1), rgba(${IVORY},0) 70%)`)
                        .join(', '),
                    } as CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        )
      case 'city':
        return img
      case 'piazza':
        return (
          <>
            {img}
            {/* a cloud's shadow drifting across the square */}
            <div
              className="absolute inset-0"
              style={{
                maskImage: `url(${piazza})`,
                WebkitMaskImage: `url(${piazza})`,
                maskSize: '100% 100%',
                WebkitMaskSize: '100% 100%',
              }}
            >
              <div className="absolute inset-x-0 top-[62%] bottom-0 overflow-hidden">
                <div className="hero-cloud-shadow absolute top-0 h-full w-[45%]" />
              </div>
            </div>
          </>
        )
      default:
        return img
    }
  }

  return (
    <section
      ref={rootRef}
      id="home"
      className="relative w-full"
      // pinned for PIN_SVH of extra scroll (none with reduced motion)
      style={{ height: prefersReducedMotion() ? undefined : `calc(max(100svh, 40rem) + ${PIN_SVH}svh)` }}
    >
      <div
        ref={stickyRef}
        className="sticky top-0 h-svh min-h-160 w-full overflow-hidden bg-sky [--px:0.93] [--py:0] md:[--px:0.5]"
        style={{ containerType: 'size' }}
      >
        <TopLeftNav />
        <div
          className="absolute inset-0"
          style={{ opacity: ready ? undefined : 0, animation: ready ? 'hero-scene-in 700ms both ease-out' : undefined }}
        >
          {LAYERS.map((layer, i) => (
            <div
              key={layer.id}
              ref={(el) => {
                layerRefs.current[i] = el
              }}
              className="pointer-events-none absolute inset-0 will-change-transform"
              aria-hidden="true"
            >
              <div
                className="hero-layer"
                style={{
                  ...STAGE,
                  animation: ready
                    ? i === 0
                      ? 'hero-settle-sky 1800ms both cubic-bezier(0.22, 1, 0.36, 1)'
                      : 'hero-settle 1800ms both cubic-bezier(0.22, 1, 0.36, 1)'
                    : undefined,
                  ['--rise' as string]: `${layer.rise}px`,
                }}
              >
                {layerContent(layer, i)}
              </div>
            </div>
          ))}
        </div>

        {/* bottom bar: where we are, a nudge to scroll, Milan's time. Gone as
            soon as scrolling starts, before the Sky line comes down the middle */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-6"
          style={{ opacity: ready ? undefined : 0, animation: ready ? 'fade-up 900ms 900ms both ease-out' : undefined }}
        >
          <div ref={barRef}>
            <div className="absolute inset-x-0 bottom-0 h-72 bg-linear-to-t from-night/75 via-night/40 to-transparent md:h-96" />
            <div className="relative mx-auto max-w-7xl px-6 pb-6 md:px-10 md:pb-7">
              <div className="h-px bg-ivory/45" />
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center text-[11px] font-bold uppercase tracking-[0.2em] text-ivory md:mt-5 md:text-xs">
                <span className="hidden md:block">45.46° N — 9.19° E</span>
                <span className="col-start-2 flex items-center gap-4">
                  Scroll to explore
                  <span className="relative block h-px w-16 overflow-hidden bg-ivory/35">
                    <span className="hero-scroll-cue absolute inset-y-0 left-0 w-1/3 bg-ivory" />
                  </span>
                </span>
                <span className="hidden text-right md:block">
                  Milan <time className="tabular-nums">{time}</time>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ivory cloud bank: rises from the bottom as you scroll and melts the
            hero's edge into About (same ivory) */}
        <div
          ref={cloudRef}
          className="pointer-events-none absolute inset-x-0 -bottom-0.5 z-5 h-[18%] min-h-28"
          style={{ transform: 'translate3d(0, 100%, 0)' }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="hero-wisp absolute inset-y-0 left-0 opacity-70"
              style={{ '--dur': '70s', backgroundImage: puffs(PUFFS_BACK), filter: 'blur(3px)' } as CSSProperties}
            />
            <div
              className="hero-wisp absolute inset-y-0 left-0"
              style={
                { '--dur': '45s', animationDirection: 'reverse', backgroundImage: puffs(PUFFS_FRONT), filter: 'blur(2px)' } as CSSProperties
              }
            />
          </div>
          {/* solid ivory from the puffs' bellies down to the edge */}
          <div
            className="absolute inset-x-0 bottom-0 h-[38%]"
            style={{ background: `linear-gradient(to bottom, rgba(${IVORY},0), rgb(${IVORY}) 45%)` }}
          />
        </div>

        {/* logo top centre: bare on the photo at rest; scrolling opens the Sky box
            around it and grows the line down towards About */}
        <div className="absolute inset-x-0 top-0 bottom-0 z-10 flex flex-col items-center pt-6 md:pt-8">
          <div
            className="relative flex flex-col items-center pt-4 text-center md:pt-6"
            style={{ opacity: ready ? undefined : 0, animation: ready ? 'fade-up 900ms 450ms both ease-out' : undefined }}
          >
            <h1 className="relative m-0">
              <img
                src={logo}
                alt="Days of Milan"
                width={888}
                height={687}
                className="mx-auto h-auto"
                style={{ width: 'clamp(8.5rem, 14vw, 13.5rem)', translate: '1.5% -5%' }}
              />
            </h1>
            <div className="relative mt-1.5 px-4 py-2 md:mt-2 md:px-6 md:py-3">
              <div
                ref={boxRef}
                className="absolute inset-0 rounded-3xl bg-sky md:rounded-4xl"
                style={{ clipPath: 'inset(100% 50% 0 round 2rem)' }}
                aria-hidden="true"
              />
              <p className="relative m-0 text-[10px] font-bold uppercase tracking-[0.1em] text-merlot md:text-[14px] md:tracking-[0.1em]">
                Discover and live the city
              </p>
            </div>
          </div>
          <div
            ref={lineRef}
            className="-mt-px w-2 flex-1 origin-top bg-sky sm:w-2.5"
            style={{ transform: 'scaleY(0)' }}
          />
        </div>
      </div>
    </section>
  )
}
