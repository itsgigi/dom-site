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
