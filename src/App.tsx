import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import Homepage from './pages/Homepage'
import BlogIndex from './pages/BlogIndex'
import BlogPostPage from './pages/BlogPost'

let lenis: Lenis | null = null

// New page: start from the top, unless the URL points at a section (the
// homepage handles "/#about" itself once its sections are mounted).
function ScrollReset() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) return
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function App() {
  // Inertial smooth scrolling for the whole site. Anchor links (#about, …)
  // go through Lenis too so they glide instead of jumping.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    lenis = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 1,
      anchors: true,
      autoRaf: true,
    })

    return () => {
      lenis?.destroy()
      lenis = null
    }
  }, [])

  return (
    <BrowserRouter>
      <ScrollReset />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/blog" element={<BlogIndex />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="*" element={<Homepage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
