import { ShapeUtils, Vector2 } from 'three'
import { POI_SHAPES } from '../../../data/poiShapes'
import { SPOTS } from '../mapUtils'

// Models of each spot's landmark, in one visual language: merlot hairlines
// (horizontal slices every SLICE units, vertical edges) over solid faces in
// the brand palette (ivory walls, sky roofs, merlot accents, night cladding).
// They follow the real buildings: the Duomo's five stepped aisles, forest of
// pinnacles and spire, Bosco Verticale's staggered balconies, the Arco della
// Pace's three openings… Models are written in a local frame aligned with the
// OSM footprint's long axis (u = along, v = across), in map units before
// SCALE; +y is up. `paint()` sets the fill for what's drawn next.

const SLICE = 6
// footprints come in ~90 units wide; blow everything up so it reads on screen
const SCALE = 1.8

type Pt = [number, number]
type P3 = [number, number, number]
export type Paint = 'ivory' | 'sky' | 'merlot' | 'night'
export const PAINTS: Paint[] = ['ivory', 'sky', 'merlot', 'night']

/** Seeded random, so every model is identical on every load. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

class Model {
  ground: number[] = []
  height: number[] = []
  faces: Record<Paint, number[]> = { ivory: [], sky: [], merlot: [], night: [] }
  top = 0
  private fill: Paint | null = null
  private ang = 0
  private ox = 0
  private oz = 0

  /** Local frame: rotation (radians) and origin, relative to the pin. */
  frame(ang: number, ox = 0, oz = 0) {
    this.ang = ang
    this.ox = ox
    this.oz = oz
    return this
  }

  /** Fill colour for the solid faces of what's drawn next (null: lines only). */
  paint(fill: Paint | null) {
    this.fill = fill
    return this
  }

  private at(u: number, v: number): Pt {
    const c = Math.cos(this.ang)
    const s = Math.sin(this.ang)
    return [this.ox + u * c - v * s, this.oz + u * s + v * c]
  }

  private p3(u: number, y: number, v: number): P3 {
    const [x, z] = this.at(u, v)
    return [x * SCALE, y * SCALE, z * SCALE]
  }

  private tri(a: P3, b: P3, c: P3) {
    if (this.fill) this.faces[this.fill].push(...a, ...b, ...c)
  }

  private quad(a: P3, b: P3, c: P3, d: P3) {
    this.tri(a, b, c)
    this.tri(a, c, d)
  }

  line(u1: number, y1: number, v1: number, u2: number, y2: number, v2: number) {
    const [x1, z1] = this.at(u1, v1)
    const [x2, z2] = this.at(u2, v2)
    this.ground.push(x1 * SCALE, 0, z1 * SCALE, x2 * SCALE, 0, z2 * SCALE)
    this.height.push(y1 * SCALE, y2 * SCALE)
    this.top = Math.max(this.top, y1 * SCALE, y2 * SCALE)
  }

  ring(pts: Pt[], y: number) {
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length]
      this.line(p[0], y, p[1], q[0], y, q[1])
    })
  }

  /** Solid sides + top cap over an outline. */
  private prism(pts: Pt[], y0: number, y1: number, top: Pt[]) {
    if (!this.fill || y1 - y0 < 0.01) return
    pts.forEach((p, i) => {
      const j = (i + 1) % pts.length
      this.quad(this.p3(p[0], y0, p[1]), this.p3(pts[j][0], y0, pts[j][1]), this.p3(top[j][0], y1, top[j][1]), this.p3(top[i][0], y1, top[i][1]))
    })
    const cap = ShapeUtils.triangulateShape(top.map(([u, v]) => new Vector2(u, v)), [])
    for (const [a, b, c] of cap) {
      this.tri(this.p3(top[a][0], y1, top[a][1]), this.p3(top[b][0], y1, top[b][1]), this.p3(top[c][0], y1, top[c][1]))
    }
  }

  /** Extruded outline: slices every SLICE, optional corner edges and taper. */
  slab(pts: Pt[], y0: number, y1: number, { edges = pts.length <= 8, taper = 1, step = SLICE } = {}) {
    const cu = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const cv = pts.reduce((s, p) => s + p[1], 0) / pts.length
    const scaled = (k: number) => pts.map(([u, v]) => [cu + (u - cu) * k, cv + (v - cv) * k] as Pt)
    const n = Math.max(1, Math.round((y1 - y0) / step))
    for (let i = 0; i <= n; i++) {
      const f = i / n
      this.ring(scaled(1 + (taper - 1) * f), y0 + (y1 - y0) * f)
    }
    const top = scaled(taper)
    if (edges) pts.forEach((p, i) => this.line(p[0], y0, p[1], top[i][0], y1, top[i][1]))
    this.prism(pts, y0, y1, top)
  }

  box(cu: number, cv: number, w: number, d: number, y0: number, y1: number, opts?: { taper?: number; step?: number }) {
    this.slab(rect(cu, cv, w, d), y0, y1, opts)
  }

  /** Pitched roof over a w×d box, ridge running along u. */
  gable(cu: number, cv: number, w: number, d: number, y0: number, rise: number) {
    const [u0, u1, v0, v1] = [cu - w / 2, cu + w / 2, cv - d / 2, cv + d / 2]
    const ry = y0 + rise
    this.line(u0, ry, cv, u1, ry, cv)
    for (const u of [u0, u1]) {
      this.line(u, y0, v0, u, ry, cv)
      this.line(u, y0, v1, u, ry, cv)
    }
    for (let k = 1; k < 4; k++) {
      const f = k / 4
      const y = y0 + rise * f
      for (const v of [v0 + (cv - v0) * f, v1 + (cv - v1) * f]) this.line(u0, y, v, u1, y, v)
    }
    const r0 = this.p3(u0, ry, cv)
    const r1 = this.p3(u1, ry, cv)
    this.quad(this.p3(u0, y0, v0), this.p3(u1, y0, v0), r1, r0)
    this.quad(this.p3(u0, y0, v1), this.p3(u1, y0, v1), r1, r0)
    this.tri(this.p3(u0, y0, v0), this.p3(u0, y0, v1), r0)
    this.tri(this.p3(u1, y0, v0), this.p3(u1, y0, v1), r1)
  }

  /** Square-based spire (pinnacle). */
  spire(cu: number, cv: number, w: number, y0: number, y1: number) {
    const base = rect(cu, cv, w, w)
    this.ring(base, y0)
    base.forEach(([u, v]) => this.line(u, y0, v, cu, y1, cv))
    const apex = this.p3(cu, y1, cv)
    base.forEach(([u, v], i) => {
      const [nu, nv] = base[(i + 1) % 4]
      this.tri(this.p3(u, y0, v), this.p3(nu, y0, nv), apex)
    })
  }

  dome(cu: number, cv: number, r: number, y0: number, h: number) {
    const LAT = 4
    const LON = 16
    const pt = (i: number, k: number): P3 => {
      const a = (i / LON) * Math.PI * 2
      const t = (k / LAT) * (Math.PI / 2)
      return this.p3(cu + Math.cos(a) * r * Math.cos(t), y0 + h * Math.sin(t), cv + Math.sin(a) * r * Math.cos(t))
    }
    for (let k = 0; k <= LAT; k++) {
      const t = (k / LAT) * (Math.PI / 2)
      this.ring(circle(cu, cv, r * Math.cos(t), LON), y0 + h * Math.sin(t))
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      for (let k = 0; k < LAT; k++) {
        const t0 = (k / LAT) * (Math.PI / 2)
        const t1 = ((k + 1) / LAT) * (Math.PI / 2)
        this.line(cu + Math.cos(a) * r * Math.cos(t0), y0 + h * Math.sin(t0), cv + Math.sin(a) * r * Math.cos(t0), cu + Math.cos(a) * r * Math.cos(t1), y0 + h * Math.sin(t1), cv + Math.sin(a) * r * Math.cos(t1))
      }
    }
    for (let k = 0; k < LAT; k++) {
      for (let i = 0; i < LON; i++) this.quad(pt(i, k), pt(i + 1, k), pt(i + 1, k + 1), pt(i, k + 1))
    }
  }

  /** Round- (or pointed-) headed opening; along u on the face v = const, or
   *  along v on the face u = const when `across`. */
  arch(u: number, v: number, w: number, y0: number, spring: number, { across = false, pointed = false } = {}) {
    const r = w / 2
    const L = (a: number, ya: number, b: number, yb: number) =>
      across ? this.line(u, ya, v + a, u, yb, v + b) : this.line(u + a, ya, v, u + b, yb, v)
    L(-r, y0, -r, spring)
    L(r, y0, r, spring)
    let prev: Pt = [-r, spring]
    for (let k = 1; k <= 8; k++) {
      const a = Math.PI - (k / 8) * Math.PI
      const lift = pointed ? Math.sin(a) * r * 0.6 * (1 - Math.abs(Math.cos(a))) : 0
      const p: Pt = [Math.cos(a) * r, spring + Math.sin(a) * r + lift]
      L(prev[0], prev[1], p[0], p[1])
      prev = p
    }
  }

  /** Row of columns along u at depth v. */
  colonnade(u0: number, u1: number, v: number, y0: number, y1: number, count: number) {
    for (let i = 0; i < count; i++) {
      const u = u0 + ((u1 - u0) * i) / (count - 1)
      this.line(u, y0, v, u, y1, v)
    }
  }

  /** Lollipop tree; its canopy is always sky when faces are on. */
  tree(cu: number, cv: number, r: number, h: number, base = 0) {
    this.line(cu, base, cv, cu, base + h * 0.45, cv)
    const prev = this.fill
    if (prev) this.fill = 'sky'
    this.dome(cu, cv, r, base + h * 0.45, h * 0.55)
    this.fill = prev
  }
}

const rect = (cu: number, cv: number, w: number, d: number): Pt[] => [
  [cu - w / 2, cv - d / 2],
  [cu + w / 2, cv - d / 2],
  [cu + w / 2, cv + d / 2],
  [cu - w / 2, cv + d / 2],
]

const circle = (cu: number, cv: number, r: number, n = 20): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return [cu + Math.cos(a) * r, cv + Math.sin(a) * r] as Pt
  })

/** OSM footprint rings relative to the pin, in the map frame. */
function footprint(id: string): Pt[][] {
  const spot = SPOTS.find((s) => s.id === id)!
  return (POI_SHAPES[id] ?? []).map((ring) => ring.slice(0, -1).map(([x, y]) => [x - spot.x, y - spot.y] as Pt))
}

/** Long axis of a footprint, its centre and extent along/across it. */
function axis(rings: Pt[][]) {
  const pts = rings.flat()
  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const mz = pts.reduce((s, p) => s + p[1], 0) / pts.length
  let sxx = 0
  let szz = 0
  let sxz = 0
  for (const [x, z] of pts) {
    sxx += (x - mx) ** 2
    szz += (z - mz) ** 2
    sxz += (x - mx) * (z - mz)
  }
  const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz)
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  const us = pts.map(([x, z]) => (x - mx) * c + (z - mz) * s)
  const vs = pts.map(([x, z]) => -(x - mx) * s + (z - mz) * c)
  return {
    ang,
    cx: mx,
    cz: mz,
    length: Math.max(...us) - Math.min(...us),
    width: Math.max(...vs) - Math.min(...vs),
  }
}

const MODELS: Record<string, (m: Model) => void> = {
  // Gothic cathedral at full detail: chapels plinth on the real footprint,
  // five stepped aisles, transept terrace, polygonal apse, three tiers of
  // pinnacles with flying buttresses, lancet windows down the flanks, the
  // stepped west façade with its portals and pier-spires, the tiburio ringed
  // by spires and the Madonnina on the main spire.
  duomo: (m) => {
    const fp = footprint('duomo')
    const { ang, cx, cz, length: L, width: W } = axis(fp)
    const f = Math.cos(ang) > 0 ? -1 : 1 // which end of u is the west façade
    m.paint('ivory').frame(0).slab(fp[0], 0, 12, { edges: false })
    m.frame(ang, cx, cz)

    const B = W * 0.72
    const N = B * 0.3
    const inner = N / 2 + B * 0.2
    const outer = B / 2
    const u0 = f * L * 0.47 // façade
    const u1 = -f * L * 0.3 // start of the apse
    const len = Math.abs(u1 - u0)
    const mid = (u0 + u1) / 2

    // five stepped aisles and the nave roof
    m.paint('ivory').box(mid, 0, len, B, 0, 20)
    m.box(mid, 0, len, inner * 2, 20, 30)
    m.box(mid, 0, len, N, 30, 45)
    m.paint('sky').gable(mid, 0, len, N, 45, 5)

    // transept with its roof terrace
    const ut = -f * L * 0.12
    m.paint('ivory').box(ut, 0, L * 0.13, W * 0.96, 0, 36)
    m.paint('sky').box(ut, 0, L * 0.13, W * 0.96, 36, 38)

    // polygonal apse
    const R = outer * 0.95
    const apse: Pt[] = [[u1, -R]]
    for (let k = 1; k < 4; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 4
      apse.push([u1 - f * Math.cos(a) * R, Math.sin(a) * R])
    }
    apse.push([u1, R])
    m.paint('ivory').slab(apse, 0, 40)
    m.paint('sky').slab(apse, 40, 43, { taper: 0.6 })
    for (let k = 1; k < 4; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 4
      m.paint('ivory').spire(u1 - f * Math.cos(a) * R, Math.sin(a) * R, 1.6, 40, 54)
    }

    // pinnacles in three tiers, flying buttresses, lancet windows
    const bays = Math.round(len / 4.5)
    for (let b = 0; b <= bays; b++) {
      const u = u0 + (u1 - u0) * (b / bays)
      if (Math.abs(u - ut) < L * 0.07) continue
      for (const s of [-1, 1]) {
        m.spire(u, s * outer, 1.4, 20, 33)
        m.spire(u, s * inner, 1.2, 30, 43)
        m.spire(u, s * (N / 2), 1.1, 45, 55)
        m.line(u, 36, s * inner, u, 43, s * (N / 2))
        if (b < bays) m.arch(u + (u1 - u0) / bays / 2, s * outer, 1.8, 4, 14, { pointed: true })
      }
    }

    // west façade: pier-spires, stepped silhouette, portals, great window
    for (const [v, top] of [
      [outer, 34],
      [inner, 46],
      [N / 2, 58],
    ] as const) {
      for (const s of [-1, 1]) {
        m.box(u0, s * v, 2.6, 2.6, 0, top - 10)
        m.spire(u0, s * v, 2.6, top - 10, top)
      }
    }
    for (const s of [-1, 1]) {
      m.line(u0, 20, s * outer, u0, 30, s * inner)
      m.line(u0, 30, s * inner, u0, 45, s * (N / 2))
      m.line(u0, 45, s * (N / 2), u0, 52, 0)
    }
    m.arch(u0, 0, 7, 0, 11, { across: true })
    for (const s of [-1, 1]) {
      m.arch(u0, s * (N / 2 + B * 0.1), 4.5, 0, 8, { across: true })
      m.arch(u0, s * ((inner + outer) / 2), 3.5, 0, 7, { across: true })
    }
    m.arch(u0, 0, 5, 24, 34, { across: true, pointed: true })

    // tiburio, its ring of spires, the main spire and the Madonnina
    const oct = circle(ut, 0, 7, 8)
    m.paint('ivory').slab(oct, 45, 60)
    oct.forEach(([u, v]) => m.spire(u, v, 1.3, 60, 70))
    m.slab(circle(ut, 0, 3.6, 8), 60, 84, { taper: 0.55 })
    m.spire(ut, 0, 3.4, 84, 103)
    m.paint('merlot').spire(ut, 0, 1.3, 103, 108)
  },

  // Courtyard palazzo with an arcade, Napoleon in the middle and the
  // Specola's observatory domes on the roof.
  brera: (m) => {
    const fp = footprint('brera')
    const { ang, cx, cz, length: L, width: W } = axis(fp)
    m.paint('ivory').frame(0).slab(fp[0], 0, 30, { edges: false })
    m.frame(ang, cx, cz)
    const cl = L * 0.5
    const cw = W * 0.48
    m.paint(null).slab(rect(0, 0, cl, cw), 0, 30, { edges: true })
    m.slab(rect(0, 0, cl, cw), 12, 12)
    m.colonnade(-cl / 2, cl / 2, -cw / 2, 0, 12, 7)
    m.colonnade(-cl / 2, cl / 2, cw / 2, 0, 12, 7)
    m.paint('merlot').box(0, 0, 3, 3, 0, 6)
    m.line(0, 6, 0, 0, 16, 0)
    m.paint('sky').dome(L * 0.3, -W * 0.32, 7, 30, 9)
    m.dome(L * 0.38, -W * 0.18, 4.5, 30, 6)
  },

  // Bosco Verticale: two dark towers, floors every slice, balconies stepping
  // in and out from floor to floor and trees spilling over the edges.
  isola: (m) => {
    const fp = footprint('isola')
    const heights = [118, 86]
    const rand = rng(7)
    fp.forEach((ring, i) => {
      const { ang, cx, cz, length: L, width: W } = axis([ring])
      m.frame(ang, cx, cz)
      const h = heights[i] ?? 100
      m.paint('night').box(0, 0, L * 0.8, W * 0.8, 0, h)
      // pale balcony slab on every floor, shifted in and out, planted with trees
      for (let y = SLICE; y < h; y += SLICE) {
        const du = (rand() - 0.5) * L * 0.25
        const dv = (rand() - 0.5) * W * 0.25
        m.paint('ivory').box(du, dv, L * 1.05, W * 1.05, y - 1, y, { step: 1 })
        for (let t = 0; t < 2; t++) {
          if (rand() < 0.35) continue
          const side = rand() > 0.5 ? 1 : -1
          const along = (rand() - 0.5) * 0.8
          const [tu, tv] = rand() > 0.5 ? [du + side * L * 0.48, dv + along * W] : [du + along * L, dv + side * W * 0.48]
          m.tree(tu, tv, 2.8 + rand() * 1.2, 7 + rand() * 3, y)
        }
      }
      m.paint('night').box(0, 0, L * 0.6, W * 0.6, h, h + 6)
    })
  },

  // Parco Trotter: the old school pavilions under a crowd of trees.
  nolo: (m) => {
    const fp = footprint('nolo')
    const { ang, cx, cz, length: L, width: W } = axis(fp)
    m.paint(null).frame(0).ring(fp[0], 0)
    m.frame(ang, cx, cz)
    m.paint('ivory').box(-L * 0.12, -W * 0.1, L * 0.32, W * 0.16, 0, 14)
    m.paint('merlot').gable(-L * 0.12, -W * 0.1, L * 0.32, W * 0.16, 14, 7)
    m.paint('ivory').box(L * 0.18, W * 0.12, L * 0.18, W * 0.14, 0, 10)
    m.paint('merlot').gable(L * 0.18, W * 0.12, L * 0.18, W * 0.14, 10, 5)
    m.paint('ivory')
    const rand = rng(11)
    for (let i = 0; i < 14; i++) {
      const u = (rand() - 0.5) * L * 0.85
      const v = (rand() - 0.5) * W * 0.8
      if (Math.abs(v + W * 0.1) < W * 0.12 && Math.abs(u + L * 0.12) < L * 0.2) continue
      m.tree(u, v, 3.5 + rand() * 2.5, 16 + rand() * 12)
    }
  },

  // Caselli di Porta Venezia: two neoclassical toll houses either side of the
  // corso, portico of columns, upper floor, statues on the attic corners.
  venezia: (m) => {
    m.frame(-0.6)
    for (const side of [-1, 1]) {
      const cu = side * 34
      m.paint('ivory').box(cu, 0, 26, 30, 0, 4)
      m.box(cu, 0, 22, 26, 4, 22)
      for (const v of [-15, 15]) m.colonnade(cu - 11, cu + 11, v, 4, 22, 6)
      m.box(cu, 0, 26, 30, 22, 26)
      m.box(cu, 0, 20, 24, 26, 36)
      m.paint('sky').box(cu, 0, 20, 24, 36, 37)
      for (const [du, dv] of [
        [-10, -12],
        [10, -12],
        [-10, 12],
        [10, 12],
      ]) {
        m.paint('merlot').box(cu + du, dv, 1.4, 1.4, 37, 42)
      }
    }
    // the corso running between them
    m.paint(null).line(-80, 0, -4, 80, 0, -4)
    m.line(-80, 0, 4, 80, 0, 4)
  },

  // Fondazione Prada: gabled sheds, the gold Haunted House and the Torre,
  // whose floors alternate between rectangles and trapezoids.
  prada: (m) => {
    const fp = footprint('prada')
    const { ang, cx, cz, length: L, width: W } = axis(fp)
    m.paint(null).frame(0).ring(fp[0], 0)
    m.frame(ang, cx, cz)
    for (const v of [-W * 0.25, 0, W * 0.25]) {
      m.paint('ivory').box(-L * 0.12, v, L * 0.5, W * 0.18, 0, 12)
      m.paint('sky').gable(-L * 0.12, v, L * 0.5, W * 0.18, 12, 5)
    }
    m.paint('merlot').box(L * 0.22, -W * 0.05, 10, 10, 0, 26)
    m.gable(L * 0.22, -W * 0.05, 10, 10, 26, 6)
    m.paint('ivory')
    const tu = L * 0.4
    const tv = W * 0.32
    for (let f = 0, y = 0; f < 9; f++, y += 13) {
      const trap = f % 2 === 1
      const pts: Pt[] = trap
        ? [
            [tu - 9, tv - 7],
            [tu + 9, tv - 7],
            [tu + 13, tv + 7],
            [tu - 9, tv + 7],
          ]
        : rect(tu, tv, 18, 14)
      m.slab(pts, y, y + 13, { step: 13 })
    }
  },

  // Darsena: the basin (sky water) and its embankment, a few moored boats,
  // lamps along the quays and the Porta Ticinese gate at the head.
  navigli: (m) => {
    const fp = footprint('navigli')
    const { ang, cx, cz, length: L, width: W } = axis(fp)
    m.paint('sky').frame(0).slab(fp[0], 0, 3, { edges: false, step: 3 })
    m.frame(ang, cx, cz)
    const rand = rng(3)
    m.paint('merlot')
    for (let i = 0; i < 6; i++) {
      const u = (rand() - 0.5) * L * 0.6
      const v = (rand() - 0.5) * W * 0.4
      m.slab(
        [
          [u - 7, v],
          [u - 4, v - 2],
          [u + 6, v - 2],
          [u + 8, v],
          [u + 6, v + 2],
          [u - 4, v + 2],
        ],
        3,
        5,
        { step: 2 },
      )
    }
    m.paint(null)
    for (let u = -L * 0.45; u <= L * 0.45; u += L * 0.15) {
      for (const v of [-W * 0.55, W * 0.55]) {
        m.line(u, 0, v, u, 14, v)
        m.ring(circle(u, v, 1.2, 6), 14)
      }
    }
    const gu = -L * 0.62
    m.paint('ivory').box(gu, 0, 12, 26, 0, 30)
    for (const v of [-9, -3, 3, 9]) m.line(gu - 6, 0, v, gu - 6, 24, v)
    m.paint('sky').gable(gu, 0, 12, 26, 30, 8)
  },

  // Arco della Pace: three round-headed openings through the block, columns
  // on both faces, entablature, attic and the bronze sestiga on top.
  sempione: (m) => {
    const fp = footprint('sempione')
    const { ang, cx, cz } = axis(fp)
    m.frame(ang, cx, cz)
    const L = 64
    const D = 22
    m.paint('ivory').slab(rect(0, 0, L, D), 0, 50, { edges: true, step: 50 })
    for (const v of [-D / 2, D / 2]) {
      m.arch(0, v, 16, 0, 30)
      m.arch(-21, v, 9, 0, 20)
      m.arch(21, v, 9, 0, 20)
      for (const u of [-28, -14, 14, 28]) m.line(u, 2, v, u, 44, v)
    }
    m.box(0, 0, L + 4, D + 4, 44, 52, { step: 4 })
    m.box(0, 0, L * 0.7, D * 0.8, 52, 64)
    m.paint('merlot').box(0, 0, 16, 8, 64, 70)
    m.spire(0, 0, 3, 70, 80)
    for (const u of [-28, 28]) m.spire(u, 0, 3, 52, 62)
  },
}

export type LandmarkLines = {
  ground: Float32Array // x, 0, z per vertex (2 per segment), relative to the pin
  height: Float32Array // y per vertex
  faces: Record<Paint, Float32Array> // triangles (x, y, z), relative to the pin
  top: number // highest point, for anchoring the card
}

export function buildLandmark(id: string): LandmarkLines {
  const m = new Model()
  MODELS[id]?.(m)
  return {
    ground: new Float32Array(m.ground),
    height: new Float32Array(m.height),
    faces: Object.fromEntries(PAINTS.map((p) => [p, new Float32Array(m.faces[p])])) as Record<Paint, Float32Array>,
    top: m.top,
  }
}
