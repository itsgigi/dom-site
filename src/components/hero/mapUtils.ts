import { MAP_H, MAP_W, project } from '../../data/milanMap'
import photo1 from '../../assets/hero/1.jpg'
import photo2 from '../../assets/hero/2.jpg'
import photoAli from '../../assets/hero/ali.jpg'
import photoPizza from '../../assets/hero/pizza.jpg'

// Shared bits for the map-based hero prototypes: the spots we pin on the map,
// the street-map SVG itself and the "object-fit: cover" maths that turns map
// coordinates into screen pixels.

export const BRAND = {
  sky: '#bcd2e0',
  merlot: '#840808',
  ivory: '#faf7f0',
  night: '#1e1715',
}

export type Spot = {
  id: string
  name: string
  blurb: string
  img: string
  x: number // map viewBox coords
  y: number
}

// Placeholder photos until each neighbourhood gets its own shot.
const RAW_SPOTS = [
  { id: 'duomo', name: 'Duomo', lat: 45.4642, lon: 9.19, img: photo1, blurb: 'Everyone starts here. Go up to the rooftop, trust us.' },
  { id: 'brera', name: 'Brera', lat: 45.4719, lon: 9.1873, img: photo2, blurb: 'Cobbled lanes, tiny galleries and aperitivo on every corner.' },
  { id: 'isola', name: 'Isola', lat: 45.487, lon: 9.1895, img: photoPizza, blurb: 'Natural wine, street art and the greenest skyscrapers in town.' },
  { id: 'nolo', name: 'NoLo', lat: 45.4945, lon: 9.22, img: photoAli, blurb: 'The most local corner of Milan. Markets, murals, friendly faces.' },
  { id: 'venezia', name: 'Porta Venezia', lat: 45.4747, lon: 9.205, img: photo1, blurb: 'Liberty façades, rainbow flags and the best brunch spots.' },
  { id: 'prada', name: 'Porta Romana', lat: 45.4446, lon: 9.2043, img: photo2, blurb: 'Art at Fondazione Prada, then a coffee at Bar Luce.' },
  { id: 'navigli', name: 'Navigli', lat: 45.452, lon: 9.1745, img: photoPizza, blurb: 'Canals, sunsets and the longest aperitivo in the city.' },
  { id: 'sempione', name: 'Sempione', lat: 45.4757, lon: 9.1724, img: photoAli, blurb: 'Picnic in the park, then a spritz under the Arco della Pace.' },
]

export const SPOTS: Spot[] = RAW_SPOTS.map(({ lat, lon, ...rest }) => {
  const [x, y] = project(lat, lon)
  return { ...rest, x, y }
})

export { MAP_W, MAP_H }

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
