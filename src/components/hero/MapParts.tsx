import type { CSSProperties } from 'react'
import type { Spot } from './mapUtils'

/** Polaroid-style card used by every variant. */
export function SpotCard({
  spot,
  className = '',
  compact = false,
  style,
}: {
  spot: Spot
  className?: string
  compact?: boolean
  style?: CSSProperties
}) {
  return (
    <div
      className={`rounded-2xl bg-ivory p-2 shadow-[0_18px_40px_-12px_rgba(30,23,21,0.35)] ${
        compact ? 'w-36' : 'w-44 sm:w-56'
      } ${className}`}
      style={style}
    >
      <img
        src={spot.img}
        alt=""
        className="aspect-4/5 w-full rounded-xl object-cover"
        draggable={false}
      />
      <div className="px-1.5 pb-1.5 pt-2.5">
        <p className="font-kopiku text-lg uppercase leading-none text-merlot sm:text-xl">
          {spot.name}
        </p>
        {!compact && (
          <p className="mt-1.5 text-xs leading-snug text-night/80 sm:text-[13px]">{spot.blurb}</p>
        )}
      </div>
    </div>
  )
}
