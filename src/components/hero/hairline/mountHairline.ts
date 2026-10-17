import HL from '../../../vendor/hairline/kernel.js'
import type { HairlineFigure } from './figure'

/**
 * Mounts a Hairline figure into `el`, the way the package's bench does:
 * styles injected once, a 400 × 320 svg stage, the read-out reported through
 * `onRead`. Returns the tear-down.
 */
export function mountHairline(el: HTMLElement, figure: HairlineFigure, onRead?: (text: string) => void) {
  HL.inject(document)
  el.setAttribute('data-hairline', figure.name)
  el.setAttribute('role', 'img')
  el.setAttribute('aria-label', figure.means)
  const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, el) as SVGSVGElement
  let text: string | null = null
  const read = {
    get textContent() {
      return text
    },
    set textContent(value: string | null) {
      text = value == null ? '' : String(value)
      onRead?.(text)
    },
  }
  const handle = figure.mount({ stage: el, svg, read }, figure.range[1])
  if (text === null) read.textContent = 'rest'
  return () => {
    handle.destroy()
    svg.remove()
  }
}
