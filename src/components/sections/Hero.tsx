// import HeroMapAtlas from '../hero/HeroMapAtlas'
import HeroPhoto from '../hero/HeroPhoto'

export default function Hero() {
  return (
    <section id="hero" className="relative">
      {/* <HeroMapAtlas /> */}
      {/* TopLeftNav now lives inside HeroPhoto's pinned frame */}
      <HeroPhoto />
    </section>
  )
}
