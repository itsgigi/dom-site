import { useRef, useState } from 'react'

export type PostData = {
  avatar: string
  username: string
  location: string
  images: string[]
  likes: string
  captionUser: string
  caption: string
}

export default function Post({ post }: { post: PostData }) {
  const [activeImage, setActiveImage] = useState(0)
  const imagesRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ startX: number; startScrollLeft: number } | null>(
    null,
  )

  function onImagesScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActiveImage(index)
  }

  function onImagesPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || !imagesRef.current) return
    e.stopPropagation()
    dragState.current = {
      startX: e.clientX,
      startScrollLeft: imagesRef.current.scrollLeft,
    }
    imagesRef.current.style.scrollSnapType = 'none'
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onImagesPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current || !imagesRef.current) return
    e.stopPropagation()
    e.preventDefault()
    const dx = e.clientX - dragState.current.startX
    imagesRef.current.scrollLeft = dragState.current.startScrollLeft - dx
  }

  function onImagesPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const el = imagesRef.current
    const start = dragState.current
    dragState.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (!el || !start) return
    e.stopPropagation()
    const width = el.clientWidth
    const startPage = Math.round(start.startScrollLeft / width)
    const delta = el.scrollLeft - start.startScrollLeft
    const threshold = width * 0.15
    let targetPage = startPage
    if (Math.abs(delta) > threshold) {
      targetPage += delta > 0 ? 1 : -1
    }
    const maxPage = Math.round(el.scrollWidth / width) - 1
    targetPage = Math.min(Math.max(targetPage, 0), maxPage)
    el.scrollTo({ left: targetPage * width, behavior: 'smooth' })
    el.style.scrollSnapType = ''
    setActiveImage(targetPage)
  }

  return (
    <div className="flex h-full w-full shrink-0 snap-start snap-always flex-col bg-ivory pointer-events-none">
      <div className="flex items-center gap-3 px-4 pb-3 pt-11 sm:pt-12">
        <div className="h-9 w-9 shrink-0 rounded-full bg-sky p-1.5 ring-2 ring-merlot">
          <img src={post.avatar} alt="" className="h-full w-full " />
        </div>
        <div className="flex flex-1 flex-col items-start">
          <div className="flex items-center gap-1">
            <span className="font-helvetica text-sm font-bold text-night">
              {post.username}
            </span>
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-sky">
              <path d="M10 0l2.24 1.86 2.86-.62 1.06 2.74 2.74 1.06-.62 2.86L20 10l-1.86 2.24.62 2.86-2.74 1.06-1.06 2.74-2.86-.62L10 20l-2.24-1.86-2.86.62-1.06-2.74-2.74-1.06.62-2.86L0 10l1.86-2.24-.62-2.86 2.74-1.06 1.06-2.74 2.86.62L10 0z" />
              <path
                d="M7 10l2 2 4-4"
                stroke="#FAF7F0"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <span className="font-helvetica text-xs text-night/50">
            {post.location}
          </span>
        </div>
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 fill-night/60"
          aria-hidden="true"
        >
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </div>

      <div className="relative flex-1 overflow-hidden bg-night/5">
        <div
          ref={imagesRef}
          onScroll={onImagesScroll}
          onPointerDown={onImagesPointerDown}
          onPointerMove={onImagesPointerMove}
          onPointerUp={onImagesPointerEnd}
          onPointerLeave={onImagesPointerEnd}
          onPointerCancel={onImagesPointerEnd}
          className="pointer-events-auto absolute inset-0 flex cursor-grab snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x scrollbar-none active:cursor-grabbing"
        >
          {post.images.map((image, i) => (
            <img
              key={i}
              src={image}
              alt=""
              className="h-full w-full shrink-0 select-none snap-start object-cover"
              draggable={false}
            />
          ))}
        </div>
      </div>

      {post.images.length > 1 && (
        <div className="flex shrink-0 justify-center gap-1.5 pt-2">
          {post.images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === activeImage ? 'bg-merlot' : 'bg-night/20'
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 px-4 pt-3">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-night stroke-2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21s-7.5-4.6-10-9.2C.3 8.2 2 4.5 5.6 4.5c2 0 3.4 1 4.4 2.4C11 5.5 12.4 4.5 14.4 4.5 18 4.5 19.7 8.2 22 11.8 19.5 16.4 12 21 12 21z"
          />
        </svg>
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-night stroke-2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.9-.9L3 20l1.1-4.4A8.5 8.5 0 1 1 21 11.5z"
          />
        </svg>
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 fill-none stroke-night stroke-2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"
          />
        </svg>
        <svg
          viewBox="0 0 24 24"
          className="ml-auto h-6 w-6 fill-none stroke-night stroke-2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 3h12v18l-6-4-6 4V3z"
          />
        </svg>
      </div>

      <div className="flex flex-col items-start gap-1 px-4 pb-4 pt-2 text-left">
        <span className="font-helvetica text-sm font-bold text-night">
          {post.likes} likes
        </span>
        <p className="font-helvetica text-sm leading-snug text-night">
          <span className="font-bold">{post.captionUser}</span>{' '}
          {post.caption}
        </p>
      </div>
    </div>
  )
}
