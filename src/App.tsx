import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import Homepage from './pages/Homepage'

function App() {
  // Inertial smooth scrolling for the whole page. Anchor links (#about, …)
  // go through Lenis too so they glide instead of jumping.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 1,
      anchors: true,
      autoRaf: true,
    })

    return () => lenis.destroy()
  }, [])

  return <Homepage />
}

export default App
