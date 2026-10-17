import { useEffect, useRef, useState, type PointerEvent } from 'react'
import photo1 from '../../assets/guides/1.jpg'
import photo2 from '../../assets/guides/2.jpg'
import photo3 from '../../assets/pizza.png'

// Placeholder shots until the Nights of Milan photo set lands.
const PHOTOS = [
  { src: photo1, alt: 'Friends pouring wine at a Nights of Milan evening' },
  { src: photo2, alt: 'People chatting around a table at Nights of Milan' },
  { src: photo3, alt: 'Pizza being shared at a Nights of Milan get-together' },
]

const SLIDE_MS = 4500
// horizontal travel (px) a drag needs before it counts as a swipe
const SWIPE_PX = 40

// Mirror of About: flat ivory (hard edge against the sky Guides above, no
// gradient), same sky line dropping in from the top, text card on the left,
// photo on the right, and the same hand-drawn line flipped to fall from the
// card's right side into the next section.
export default function Events() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const dragStartX = useRef<number | null>(null)

  const onDragStart = (e: PointerEvent<HTMLDivElement>) => {
    dragStartX.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onDragEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return
    const dx = e.clientX - dragStartX.current
    dragStartX.current = null
    if (Math.abs(dx) < SWIPE_PX) return
    const step = dx < 0 ? 1 : -1
    setActive((i) => (i + step + PHOTOS.length) % PHOTOS.length)
  }

  useEffect(() => {
    if (paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setTimeout(
      () => setActive((i) => (i + 1) % PHOTOS.length),
      SLIDE_MS,
    )
    return () => window.clearTimeout(id)
  }, [active, paused])

  return (
    <section
      id="events"
      className="relative flex min-h-screen flex-col items-center bg-ivory px-6 pb-24 pt-10"
    >
      <div className="absolute h-100 w-2 bg-sky sm:w-2.5 -mt-20" />

      <div className="flex flex-1 flex-col items-center justify-center mb-16 lg:mb-0">
        {/* photo matches the text card's height on desktop */}
        <div className="flex flex-col items-center gap-10 md:flex-row-reverse md:items-stretch md:gap-22">
        <div
          className="relative z-10 h-64 w-64 shrink-0 self-center sm:h-130 sm:w-130 md:h-auto md:self-stretch"
          role="region"
          aria-roledescription="carousel"
          aria-label="Photos from Nights of Milan"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div
            className="relative h-full w-full cursor-grab touch-pan-y select-none overflow-hidden rounded-4xl active:cursor-grabbing"
            onPointerDown={onDragStart}
            onPointerUp={onDragEnd}
            onPointerCancel={() => (dragStartX.current = null)}
          >
            {PHOTOS.map((photo, i) => (
              <img
                key={photo.src}
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                draggable={false}
                aria-hidden={i !== active}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
                  i === active ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {PHOTOS.map((photo, i) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1} of ${PHOTOS.length}`}
                aria-current={i === active}
                className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory ${
                  i === active ? 'w-8 bg-ivory' : 'w-2.5 bg-ivory/60 hover:bg-ivory/80'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="relative flex max-w-2xl flex-col items-center justify-center gap-6 rounded-4xl bg-sky p-8 text-center sm:p-12 md:items-start md:text-left">
          <p className="font-helvetica text-sm font-bold uppercase tracking-[0.2em] text-merlot">
            Events
          </p>
          <h2 className="font-kopiku text-4xl uppercase text-merlot sm:text-5xl">
            Nights of Milan
          </h2>
          <p className="font-helvetica text-lg leading-relaxed text-night">
            Here's the thing nobody tells you about moving to a big city:
            making friends is hard. You can follow a hundred people online and
            still not know who to call for a Friday aperitivo.
          </p>
          <p className="font-helvetica text-lg leading-relaxed text-night">
            So for the past year and a half we've been taking what happens
            online and bringing it offline. Nights of Milan is where the
            community actually meets — real tables, real conversations, and
            plenty of people who just moved here too.
          </p>

          <a
            href="https://nightsofmilan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-merlot px-8 py-3.5 font-helvetica text-sm font-bold uppercase tracking-[0.15em] text-ivory transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-merlot"
          >
            Discover Nights of Milan
          </a>

          <svg
            viewBox="250 10 250 400"
            className="absolute right-0 top-full h-72 w-40 -translate-y-10 -translate-x-21 -scale-x-100 sm:h-96 sm:w-56 md:translate-x-35"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M410.7623291015625,52.914798736572266C410.5979064941406,78.07175070444742,419.23767344156903,155.9342378616333,409.865478515625,190.13453674316406C400.49328358968097,224.33483562469482,382.3318486531576,229.92526321411134,359.6412658691406,239.46188354492188C336.95068308512367,248.9985038757324,301.88341827392577,249.55156987508138,286.0986633300781,242.1524658203125C270.3139083862305,234.75336176554362,270.4185394287109,209.7907267252604,273.5426025390625,199.10313415527344C276.6666656494141,188.41554158528646,292.61583760579424,184.02092895507812,303.1390075683594,183.85650634765625C313.6621775309245,183.69208374023438,324.20030619303384,186.36771876017252,330.94171142578125,198.20628356933594C337.68311665852866,210.04484837849935,338.1016377766927,225.0822146097819,339.9103088378906,248.4304962158203C341.71897989908854,271.77877782185874,340.3139165242513,299.58147557576496,340.80718994140625,325.560546875C341.3004633585612,351.53961817423504,342.2720458984375,378.29595947265625,342.60089111328125,390.134521484375"
              stroke="#BCD2E0"
              strokeWidth="12"
              strokeLinecap="butt"
              transform="matrix(1,0,0,1,56.93000793457031,-21.524662017822266)"
            />
          </svg>
        </div>
        </div>
      </div>
    </section>
  )
}
