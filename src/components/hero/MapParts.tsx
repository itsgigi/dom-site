import type { CSSProperties } from 'react'
import type { Spot } from './mapUtils'

/**
 * Polaroid-style card for the active spot on the hero map.
 * Phones get a small photo + name; from md up it grows into a proper
 * "local tip" with the one-line blurb, so the map says what we actually share.
 */
export function SpotCard({
  spot,
  className = '',
  style,
}: {
  spot: Spot
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`w-32 rounded-2xl bg-ivory p-1.5 shadow-[0_18px_40px_-12px_rgba(30,23,21,0.35)] ring-1 ring-sky md:w-60 md:p-2 ${className}`}
      style={style}
    >
      <div className="relative">
        <img
          src={spot.img}
          alt=""
          className="aspect-4/3 w-full rounded-xl object-cover"
          draggable={false}
        />
        <span className="absolute left-2 top-2 hidden rounded-full bg-merlot px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-ivory md:inline">
          Local tip
        </span>
      </div>
      <div className="px-1.5 pb-1.5 pt-2.5 md:px-2 md:pb-2">
        <p className="font-kopiku text-base uppercase leading-none text-merlot md:text-2xl">{spot.name}</p>
        <p className="mt-1.5 hidden text-[13px] leading-snug text-night/80 md:block">{spot.blurb}</p>
      </div>
    </div>
  )
}
