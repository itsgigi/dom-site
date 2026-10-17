import { useCallback, useEffect, useState } from 'react'
import logo from '../../assets/logo/Milan_Primary.svg'
import { SPOTS, prefersReducedMotion } from './mapUtils'
import HeroScene from './scene/HeroScene'

// Hero: a 3D street map of Milan (three.js, see scene/HeroScene) on ivory.
// Spots take turns: the streets around the active one gather and rise into a
// stylised sculpture of its landmark. Logo panel bottom-left is wired into
// the sky line; a short weekly blurb sits bottom-right.

const CYCLE_MS = 6500

export default function HeroMapAtlas() {
  const [landed, setLanded] = useState(prefersReducedMotion)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!landed || paused) return
    const t = window.setTimeout(() => setActive((a) => (a + 1) % SPOTS.length), CYCLE_MS)
    return () => window.clearTimeout(t)
  }, [landed, paused, active])

  const onLanded = useCallback(() => setLanded(true), [])
  const focus = useCallback((i: number) => {
    setPaused(true)
    setActive(i)
  }, [])
  const blur = useCallback(() => setPaused(false), [])

  return (
    <section
      id="home"
      onMouseLeave={blur}
      className="relative h-screen w-full overflow-hidden bg-ivory"
    >
      <HeroScene active={active} landed={landed} onLanded={onLanded} onFocus={focus} onBlur={blur} />

      {/* soft ivory wash under the panel */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-ivory to-transparent" />

      {/* sky line into About: on desktop it leaves the title panel sideways and
          turns down at the page centre; below lg it drops straight out of it */}
      <div className="pointer-events-none absolute inset-x-6 bottom-0 z-40 flex items-end lg:left-[max(2.5rem,calc((100vw-80rem)/2))] lg:right-[calc(50%-5px)]">
        <div
          className="mx-auto mb-10 w-full max-w-md rounded-4xl bg-sky px-6 py-6 lg:mx-0 lg:mb-12 lg:w-auto lg:max-w-none lg:px-8 lg:py-7"
          style={{ animation: 'fade-up 900ms 300ms both ease-out' }}
        >
          {/* the logo is the page title: the img's alt is the h1's text for
              search engines and screen readers */}
          <h1 className="m-0 flex justify-center">
            <img
              src={logo}
              alt="Days of Milan"
              width={888}
              height={687}
              fetchPriority="high"
              className="h-auto"
              // optical centring: the pale star overhangs top/right, so the
              // merlot wordmark sits low-left of the SVG's true centre
              style={{ width: 'clamp(11rem, 21vw, 19rem)', translate: '1.5% -5%' }}
            />
          </h1>
        </div>
        <div
          className="hidden h-24 flex-1 rounded-tr-4xl border-r-10 border-t-10 border-sky lg:block"
          style={{ animation: 'fade-up 900ms 500ms both ease-out' }}
        />
        <div className="absolute bottom-0 left-1/2 -z-10 h-12 w-2 -translate-x-1/2 bg-sky sm:w-2.5 lg:hidden" />
      </div>

      <div
        className="pointer-events-none absolute bottom-16 right-[max(2.5rem,calc((100vw-80rem)/2))] z-40 hidden max-w-xs text-right lg:block"
        style={{ animation: 'fade-up 900ms 700ms both ease-out' }}
      >
        <p className="text-md font-bold uppercase tracking-[0.1em] text-merlot">Discover and live the city</p>
        <p className="mt-3 text-base leading-relaxed text-night/80">
          Fresh spots, events worth leaving the sofa for and all the little things that make Milan feel like home.
        </p>
      </div>

    </section>
  )
}
