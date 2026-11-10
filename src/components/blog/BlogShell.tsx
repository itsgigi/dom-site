import type { ReactNode } from 'react'
import { Link } from 'react-router'
import logo from '../../assets/logo/Milan_Secondary_Merlot.svg'
import NavMenu from '../NavMenu'
import Footer from '../sections/Footer'

// Frame shared by the blog pages: a Sky band on top (Merlot logo on Sky is an
// approved colourway) that each page fills with its own heading, then the page
// body on Ivory and the site footer.

export default function BlogShell({ top, children }: { top: ReactNode; children: ReactNode }) {
  return (
    <>
      <NavMenu />
      <header className="rounded-b-[2.5rem] bg-sky md:rounded-b-[4rem]">
        <div className="mx-auto max-w-7xl px-6 pt-6 md:px-10">
          <Link to="/" aria-label="Days of Milan, home" className="inline-block">
            <img src={logo} alt="Days of Milan" width={160} height={60} className="h-11 w-auto md:h-13" />
          </Link>
        </div>
        <div className="mx-auto max-w-7xl px-6 pb-14 pt-10 md:px-10 md:pb-20 md:pt-14">{top}</div>
      </header>
      <main className="bg-ivory">{children}</main>
      <Footer />
    </>
  )
}

export function DraftBadge() {
  return (
    <span className="rounded-full bg-night px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-ivory">
      Draft · dev only
    </span>
  )
}
