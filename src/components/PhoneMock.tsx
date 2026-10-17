import { useRef, type ReactNode } from 'react'

function useCurrentTime() {
  const now = new Date()
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function PhoneMock({ children }: { children: ReactNode }) {
  const time = useCurrentTime()
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ startY: number; startScrollTop: number } | null>(
    null,
  )

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse' || !scrollRef.current) return
    dragState.current = {
      startY: e.clientY,
      startScrollTop: scrollRef.current.scrollTop,
    }
    scrollRef.current.style.scrollSnapType = 'none'
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current || !scrollRef.current) return
    e.preventDefault()
    const dy = e.clientY - dragState.current.startY
    scrollRef.current.scrollTop = dragState.current.startScrollTop - dy
  }

  function endDrag(e: React.PointerEvent) {
    const el = scrollRef.current
    const start = dragState.current
    dragState.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (!el || !start) return
    const postHeight = el.clientHeight
    const startPage = Math.round(start.startScrollTop / postHeight)
    const delta = el.scrollTop - start.startScrollTop
    const threshold = postHeight * 0.15
    let targetPage = startPage
    if (Math.abs(delta) > threshold) {
      targetPage += delta > 0 ? 1 : -1
    }
    const maxPage = Math.round(el.scrollHeight / postHeight) - 1
    targetPage = Math.min(Math.max(targetPage, 0), maxPage)
    el.scrollTo({ top: targetPage * postHeight, behavior: 'smooth' })
    el.style.scrollSnapType = ''
  }

  return (
    <div
      className="relative mx-auto aspect-[375/740] w-[320px] rounded-[42px] bg-night p-1 shadow-[0_0_0_3px_#121212,0_0_0_4px_#2a2320,0_25px_50px_-10px_rgba(0,0,0,0.6)] sm:w-[350px] sm:rounded-[48px] sm:p-1.5"
    >
      <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-ivory sm:rounded-[42px]">
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-3 font-helvetica text-[11px] font-semibold text-night">
          <span>{time}</span>
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 18 12" className="h-2.5 w-4 fill-night">
              <rect x="0" y="7" width="3" height="5" rx="0.5" />
              <rect x="5" y="5" width="3" height="7" rx="0.5" />
              <rect x="10" y="3" width="3" height="9" rx="0.5" />
              <rect x="15" y="0" width="3" height="12" rx="0.5" />
            </svg>
            <svg viewBox="0 0 16 12" className="h-2.5 w-3.5 fill-night">
              <path d="M8 11.5a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6ZM4.7 7.4a4.6 4.6 0 0 1 6.6 0L10 8.7a2.8 2.8 0 0 0-4 0L4.7 7.4ZM2 4.6a8.4 8.4 0 0 1 12 0L12.7 6a6.6 6.6 0 0 0-9.4 0L2 4.6Z" />
            </svg>
            <svg
              viewBox="0 0 25 12"
              className="h-2.5 w-6 fill-none stroke-night"
            >
              <rect
                x="0.5"
                y="0.5"
                width="20"
                height="11"
                rx="2.5"
                strokeWidth="1"
              />
              <rect x="2" y="2" width="16" height="8" rx="1.2" fill="#1E1715" stroke="none" />
              <path
                d="M22 4v4a1.5 1.5 0 0 0 1-1.4V5.4A1.5 1.5 0 0 0 22 4Z"
                fill="#1E1715"
                stroke="none"
              />
            </svg>
          </div>
        </div>

        <div className="absolute left-1/2 top-2 z-20 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-night sm:top-2.5 sm:h-[26px] sm:w-[100px]" />

        <div
          ref={scrollRef}
          data-lenis-prevent
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onPointerCancel={endDrag}
          className="scrollbar-none h-full w-full cursor-grab touch-pan-y select-none snap-y snap-mandatory overflow-y-auto active:cursor-grabbing"
        >
          {children}
        </div>

        <div className="absolute bottom-1.5 left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full bg-night/30" />
      </div>
    </div>
  )
}
