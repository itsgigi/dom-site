import { useEffect } from 'react'
import { useLocation } from 'react-router'
import Hero from '../components/sections/Hero'
import NavMenu from '../components/NavMenu'
import About from '../components/sections/About'
import Contacts from '../components/sections/Contacts'
//import Guides from '../components/sections/Guides'
//import GuidesShowcase from '../components/sections/GuidesShowcase'
//import ParallaxOverlayCarousel from '../components/ParallaxOverlayCarousel'
import GuidesExplorer from '../components/sections/GuidesExplorer'
import Events from '../components/sections/Events'
//import Stories from '../components/sections/Stories'
import Footer from '../components/sections/Footer'

export default function Homepage() {
  // arriving from another page on "/#about": jump to that section once it exists
  const { hash } = useLocation()
  useEffect(() => {
    document.title = 'Days of Milan · Your friendly guide to living in Milan'
    if (!hash) return
    const t = window.setTimeout(() => document.querySelector(hash)?.scrollIntoView(), 50)
    return () => window.clearTimeout(t)
  }, [hash])

  return (
    <>
      <NavMenu />
      <Hero />
      <About />
      {/* <Guides /> */}
      {/* <GuidesShowcase /> */}
      {/* <ParallaxOverlayCarousel /> */}
      <GuidesExplorer />
      <Events />
      {/* <Stories /> */}
      <Contacts />
      <Footer />
    </>
  )
}
