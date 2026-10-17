import { MAP_H, MAP_W } from '../../../data/milanMap'

// Turns the generated SVG path strings ("M x yL x y…") into GPU-ready line
// segments in world space: x → X, map y → Z (north = far), ground at Y = 0.
// Each vertex also carries how far along its street it sits (for the traffic
// pulses) and a per-street random seed so pulses don't march in lockstep.

export const toWorld = (x: number, y: number): [number, number] => [x - MAP_W / 2, y - MAP_H / 2]

export type StreetLayer = {
  positions: Float32Array // xyz per vertex, 2 vertices per segment
  along: Float32Array
  seed: Float32Array
}

export function buildStreetLayer(d: string): StreetLayer {
  const positions: number[] = []
  const along: number[] = []
  const seed: number[] = []

  for (const path of d.split('M')) {
    if (!path) continue
    const pts = path.split('L').map((pair) => pair.trim().split(' ').map(Number))
    const s = Math.random()
    let dist = 0
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = toWorld(pts[i - 1][0], pts[i - 1][1])
      const [bx, bz] = toWorld(pts[i][0], pts[i][1])
      const len = Math.hypot(bx - ax, bz - az)
      positions.push(ax, 0, az, bx, 0, bz)
      along.push(dist, dist + len)
      seed.push(s, s)
      dist += len
    }
  }

  return {
    positions: new Float32Array(positions),
    along: new Float32Array(along),
    seed: new Float32Array(seed),
  }
}
