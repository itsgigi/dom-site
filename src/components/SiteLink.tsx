import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

// Links that work from any page. Section anchors ("#about") stay plain anchors
// on the homepage, so Lenis glides to them; from other pages they become
// router links to "/#about" and the homepage scrolls there once it's mounted.

export default function SiteLink({
  href,
  className,
  onClick,
  children,
}: {
  href: string
  className?: string
  onClick?: () => void
  children: ReactNode
}) {
  const { pathname } = useLocation()

  if (href.startsWith('#')) {
    if (pathname === '/') {
      return (
        <a href={href} className={className} onClick={onClick}>
          {children}
        </a>
      )
    }
    return (
      <Link to={`/${href}`} className={className} onClick={onClick}>
        {children}
      </Link>
    )
  }

  if (/^https?:/.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
        {children}
      </a>
    )
  }

  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}
