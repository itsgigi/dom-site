import { useCallback, useEffect, useState } from 'react'
import logo from '../../assets/logo/Milan_Primary.svg'
import { SPOTS, prefersReducedMotion } from './mapUtils'
import HeroScene from './scene/HeroScene'

// Hero: a 3D street map of Milan (three.js, see scene/HeroScene) on ivory.
// Spots take turns: the streets around the active one gather and rise into a
// stylised sculpture of its landmark. The intro panel bottom-left (logo, what
// Days of Milan is, CTAs) is wired into the sky line that runs into About.

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
      className="relative h-svh min-h-160 w-full overflow-hidden bg-ivory"
    >
      {/* a little Milan sky above the city: Sky fading into the ivory ground */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-linear-to-b from-sky/70 via-sky/25 to-transparent" />

      <HeroScene active={active} landed={landed} onLanded={onLanded} onFocus={focus} onBlur={blur} />

      {/* soft ivory wash under the panel */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-ivory to-transparent" />

      {/* intro panel (logo, promise, CTAs) wired into the sky line to About: on
          desktop the line leaves the panel sideways and turns down at the page
          centre; below lg it drops straight out of it */}
      <div className="pointer-events-none absolute inset-x-4 bottom-0 z-40 flex items-end sm:inset-x-6 lg:left-[max(2.5rem,calc((100vw-80rem)/2))] lg:right-[calc(50%-5px)]">
        <div
          className="pointer-events-auto mx-auto mb-8 w-full shadow-[0_30px_60px_-30px_rgba(30,23,21,0.35)] max-w-md rounded-4xl bg-sky px-6 py-6 text-center lg:mx-0 lg:mb-12 lg:w-[31rem] lg:max-w-none lg:shrink-0 lg:px-10 lg:py-9 lg:text-left"
          style={{ animation: 'fade-up 900ms 300ms both ease-out' }}
        >
          <img
            src={logo}
            alt="Days of Milan"
            width={888}
            height={687}
            fetchPriority="high"
            className="mx-auto h-auto w-28 lg:mx-0 lg:w-36"
          />

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-night/70 lg:mt-6 lg:text-sm">
            Your local friend in Milan
          </p>
          <h1 className="mt-2 font-kopiku text-[2rem] uppercase leading-[0.95] text-merlot sm:text-4xl lg:text-5xl">
            Discover and live the city
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-night lg:mt-4 lg:text-base">
            Hidden gems, aperitivo spots and events worth leaving the sofa for. Handpicked for newcomers and
            Milan lifers alike.
          </p>

          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:mt-7 lg:justify-start">
            <a
              href="https://instagram.com/daysofmilan"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-merlot whitespace-nowrap px-5 py-3 text-sm font-bold uppercase tracking-[0.08em] text-ivory transition-transform hover:-translate-y-0.5"
            >
              Follow @daysofmilan
            </a>
            <a
              href="#guides"
              className="whitespace-nowrap px-2 py-3 text-sm font-bold uppercase tracking-[0.08em] text-merlot underline decoration-2 underline-offset-4 hover:decoration-merlot/40"
            >
              Explore the guides
            </a>
          </div>
        </div>
        <div
          className="hidden h-24 flex-1 rounded-tr-4xl border-r-10 border-t-10 border-sky lg:block"
          style={{ animation: 'fade-up 900ms 500ms both ease-out' }}
        />
        <div className="absolute bottom-0 left-1/2 -z-10 h-12 w-2 -translate-x-1/2 bg-sky sm:w-2.5 lg:hidden" />
      </div>
    </section>
  )
}
