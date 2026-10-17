import { useEffect, useRef, type CSSProperties } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  Group,
  LineSegments,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three'
import { MAJOR, MID, MINOR, RAIL, WATER } from '../../../data/milanMap'
import { SpotCard } from '../MapParts'
import { BRAND, SPOTS, prefersReducedMotion } from '../mapUtils'
import breraFigure from '../hairline/brera.js'
import duomoFigure from '../hairline/duomo.js'
import isolaFigure from '../hairline/isola.js'
import monumentaleFigure from '../hairline/monumentale.js'
import navigliFigure from '../hairline/navigli.js'
import noloFigure from '../hairline/nolo.js'
import pradaFigure from '../hairline/prada.js'
import sansiroFigure from '../hairline/sansiro.js'
import sempioneFigure from '../hairline/sempione.js'
import veneziaFigure from '../hairline/venezia.js'
import type { HairlineFigure } from '../hairline/figure'
import { mountHairline } from '../hairline/mountHairline'
import { PAINTS, buildLandmark, type LandmarkLines, type Paint } from './landmarks'
import { buildStreetLayer, toWorld } from './streets'

// Hero map as a real 3D scene. Streets are thin lines on the ground with
// merlot "traffic" pulses running along them. When a spot becomes active,
// current races along the streets towards it, pools at the pin, spreads onto
// the landmark's footprint and rises slice by slice into its line-drawn model
// (see landmarks.ts); on deactivation it all sinks back. Pins and the card are
// HTML, re-projected onto the scene every frame.

const FOV = 30
const TILT = 36 // camera elevation above the ground, degrees
const INTRO_MS = 2400
const SWAY_DEG = 9
const SWAY_PERIOD_S = 52 // full back-and-forth
// an electric take on Sky, so the current reads over the sky streets
const CURRENT_COLOR = '#3a8dd4'
// progress at which the sculpture starts rising and the current switches off
const RISE_START = 0.33
// each segment's own delay spreads over this much progress (bottom → top)
const DELAY_SPREAD = 0.2
const CURRENT_RADIUS = 260 // map units around a spot that the current runs through
const BUILD_MS = 3000
const UNBUILD_MS = 900
const VIEW_WIDTH = 1500 // map units that should span the viewport width
// view centre east–west: pulled west so San Siro, at the map's west edge, fits
const VIEW_X = -140
const MAX_SPOTS = 10

// Spots drawn as a Hairline figure (an isometric SVG floating over the pin)
// instead of a 3D sculpture. `anchor` is where the pin's ground point sits in
// the figure's 400 × 320 viewBox, `card` the viewBox point the card's bottom-left
// hangs from, and
// `radius` the ground patch that pulses under it (map units).
const HAIRLINE: Record<string, { figure: HairlineFigure; anchor: [number, number]; card: [number, number]; radius: number }> = {
  duomo: { figure: duomoFigure, anchor: [206, 210], card: [292, 200], radius: 130 },
  brera: { figure: breraFigure, anchor: [200, 184], card: [286, 164], radius: 110 },
  isola: { figure: isolaFigure, anchor: [200, 245], card: [248, 202], radius: 90 },
  nolo: { figure: noloFigure, anchor: [200, 163], card: [290, 170], radius: 120 },
  venezia: { figure: veneziaFigure, anchor: [194, 163], card: [265, 120], radius: 120 },
  prada: { figure: pradaFigure, anchor: [200, 211], card: [279, 182], radius: 110 },
  navigli: { figure: navigliFigure, anchor: [192, 175], card: [303, 194], radius: 140 },
  sempione: { figure: sempioneFigure, anchor: [200, 269], card: [259, 198], radius: 100 },
  monumentale: { figure: monumentaleFigure, anchor: [197, 185], card: [290, 163], radius: 110 },
  sansiro: { figure: sansiroFigure, anchor: [200, 166], card: [337, 152], radius: 140 },
}
const EMPTY_LANDMARK: LandmarkLines = {
  ground: new Float32Array(),
  height: new Float32Array(),
  faces: { ivory: new Float32Array(), sky: new Float32Array(), merlot: new Float32Array(), night: new Float32Array() },
  top: 0,
}

const PAINT_COLORS: Record<Paint, string> = {
  ivory: BRAND.ivory,
  sky: BRAND.sky,
  merlot: BRAND.merlot,
  night: BRAND.night,
}

const LAYERS = [
  { d: MINOR, color: BRAND.sky, alpha: 0.95, pulse: 0.3, current: 0.8 },
  { d: MID, color: BRAND.sky, alpha: 1, pulse: 0.55, current: 1 },
  { d: RAIL, color: BRAND.night, alpha: 0.18, pulse: 0, current: 0 },
  { d: MAJOR, color: BRAND.night, alpha: 0.32, pulse: 1, current: 1 },
  { d: WATER, color: BRAND.merlot, alpha: 0.5, pulse: 0, current: 0 },
]

const STREET_VERTEX = /* glsl */ `
attribute float aAlong;
attribute float aSeed;
varying float vAlong;
varying float vSeed;
varying float vFade;
varying vec2 vPos;
uniform vec2 uOffset; // device pixels, used by the thickening passes
uniform vec2 uResolution;

void main() {
  vAlong = aAlong;
  vSeed = aSeed;
  vPos = position.xz;
  // soft circular edge so the city fades into the page
  vFade = 1.0 - smoothstep(480.0, 760.0, length(position.xz - vec2(${VIEW_X.toFixed(1)}, 0.0)));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.xy += uOffset / uResolution * 2.0 * gl_Position.w;
}`

const STREET_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uPulseColor;
uniform float uAlpha;
uniform float uPulse;
uniform float uCurrent;
uniform vec3 uCurrentColor;
uniform float uPass; // 0 = the street itself, 1 = current-only thickening pass
uniform float uTime;
uniform vec4 uSpots[${MAX_SPOTS}];
uniform float uSpotRadius[${MAX_SPOTS}];
varying float vAlong;
varying float vSeed;
varying float vFade;
varying vec2 vPos;

void main() {
  // idle traffic: a short dash travelling along each street every ~260 units
  float ph = fract((vAlong - uTime * 38.0) / 260.0 + vSeed);
  float dash = smoothstep(0.0, 0.02, ph) * (1.0 - smoothstep(0.02, 0.09, ph)) * uPulse;

  // current: one front sweeps in from the edge of the spot's area to the pin,
  // lighting the streets it reaches (bright head, fading trail behind) and
  // switching off as it arrives, right when the sculpture starts to rise.
  // A small per-street jitter keeps the front from reading as a circle.
  float current = 0.0;
  float field = 0.0;
  float veil = 0.0; // streets under a standing building fade to a light ground
  float glow = 0.0; // …and gently pulse, as if it stays powered
  for (int i = 0; i < ${MAX_SPOTS}; i++) {
    float p = uSpots[i].z;
    if (p <= 0.0) continue;
    float d = distance(vPos, uSpots[i].xy);

    float r = uSpotRadius[i];
    float under = 1.0 - smoothstep(r * 0.7, r * 1.1, d);
    float built = smoothstep(${RISE_START.toFixed(2)}, 1.0, p);
    veil = max(veil, built * under);
    glow = max(glow, built * under * (0.5 + 0.5 * sin(uTime * 2.4 - d * 0.07)));

    if (uSpots[i].w < 0.5) continue;
    float q = clamp(p / ${RISE_START.toFixed(2)}, 0.0, 1.0);
    float front = ${CURRENT_RADIUS.toFixed(1)} * (1.0 - q) + (vSeed - 0.5) * 40.0 * (1.0 - q);
    float behind = d - front; // > 0: already reached
    float head = exp(-(behind * behind) / 400.0);
    float trail = behind > 0.0 ? exp(-behind / 110.0) * 0.55 : 0.0;
    float reach = 1.0 - smoothstep(${(CURRENT_RADIUS * 0.85).toFixed(1)}, ${(CURRENT_RADIUS * 1.1).toFixed(1)}, d);
    float on = smoothstep(0.0, 0.08, q) * (1.0 - smoothstep(0.9, 1.0, q));
    current = max(current, max(head, trail) * reach * on);
    field = max(field, trail * reach * on);
  }
  glow *= uCurrent;
  current = min(current * uCurrent, 1.0);
  field *= uCurrent;

  if (uPass > 0.5) {
    float lit = max(current, glow * 0.45);
    if (lit < 0.02) discard;
    gl_FragColor = vec4(uCurrentColor, lit * vFade);
    return;
  }

  vec3 color = mix(uColor, uPulseColor, clamp(dash, 0.0, 1.0));
  color = mix(color, uCurrentColor, clamp(max(current, glow * 0.7), 0.0, 1.0));
  // streets carrying current dim down so the pulses stand out against them
  float base = uAlpha * (1.0 - 0.6 * field) * (1.0 - 0.6 * veil);
  float alpha = mix(base + dash * 0.85 * (1.0 - veil), 1.0, max(current, glow * 0.55)) * vFade;
  gl_FragColor = vec4(color, min(alpha, 1.0));
}`

const SCULPT_VERTEX = /* glsl */ `
attribute float aHeight;
attribute float aDelay;
uniform float uProgress;
uniform vec3 uCenter;
varying float vAlpha;

void main() {
  // the current has pooled at the pin: each segment spreads out from that
  // point onto the footprint, then lifts to its height (lower ones first)
  float t = clamp((uProgress - aDelay) / ${(1 - RISE_START - DELAY_SPREAD - 0.02).toFixed(3)}, 0.0, 1.0);
  float spread = smoothstep(0.0, 0.35, t);
  float rise = smoothstep(0.25, 1.0, t);
  vec3 p = mix(uCenter, position, spread);
  p.y = aHeight * rise;
  vAlpha = smoothstep(0.0, 0.08, t);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`

const SCULPT_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(uColor, vAlpha * 0.95);
}`

type Props = {
  active: number | null
  landed: boolean
  onLanded: () => void
  onFocus: (i: number) => void
  onBlur: () => void
}

export default function HeroScene({ active, landed, onLanded, onFocus, onBlur }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pinRefs = useRef<(HTMLDivElement | null)[]>([])
  const cardRef = useRef<HTMLDivElement>(null)
  const figRefs = useRef<(HTMLDivElement | null)[]>([])
  const activeRef = useRef(active)
  const onLandedRef = useRef(onLanded)

  useEffect(() => {
    activeRef.current = active
    onLandedRef.current = onLanded
  }, [active, onLanded])

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const reduced = prefersReducedMotion()

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    } catch {
      onLandedRef.current()
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)

    const scene = new Scene()
    const camera = new PerspectiveCamera(FOV, 1, 10, 8000)
    const city = new Group()
    scene.add(city)
    // soft light so the coloured faces read as volumes
    scene.add(new HemisphereLight('#ffffff', '#cfc6b8', 0.9))
    const sun = new DirectionalLight('#ffffff', 1.5)
    sun.position.set(-500, 700, 350)
    scene.add(sun)

    // --- streets
    const spotUniforms = Array.from({ length: MAX_SPOTS }, () => new Vector4(0, 0, 0, 0))
    const spotRadius = new Array<number>(MAX_SPOTS).fill(0)
    const time = { value: 0 }
    const resolution = { value: new Vector2(1, 1) }
    const disposables: { dispose: () => void }[] = []

    for (const layer of LAYERS) {
      const data = buildStreetLayer(layer.d)
      const geo = new BufferGeometry()
      geo.setAttribute('position', new BufferAttribute(data.positions, 3))
      geo.setAttribute('aAlong', new BufferAttribute(data.along, 1))
      geo.setAttribute('aSeed', new BufferAttribute(data.seed, 1))
      const shared = {
        uColor: { value: new Color(layer.color) },
        uPulseColor: { value: new Color(BRAND.merlot) },
        uAlpha: { value: layer.alpha },
        uPulse: { value: reduced ? 0 : layer.pulse },
        uCurrent: { value: layer.current },
        uCurrentColor: { value: new Color(CURRENT_COLOR) },
        uTime: time,
        uSpots: { value: spotUniforms },
        uSpotRadius: { value: spotRadius },
        uResolution: resolution,
      }
      // the street itself, then (on layers that carry current) two copies
      // nudged by a pixel that only draw the pulses, so they read as cables
      const passes: [number, number, number][] = [[0, 0, 0]]
      if (layer.current > 0) passes.push([1, 1, 0], [1, 0, 1])
      for (const [pass, ox, oy] of passes) {
        const mat = new ShaderMaterial({
          vertexShader: STREET_VERTEX,
          fragmentShader: STREET_FRAGMENT,
          uniforms: { ...shared, uPass: { value: pass }, uOffset: { value: new Vector2(ox, oy) } },
          transparent: true,
          depthWrite: false,
        })
        city.add(new LineSegments(geo, mat))
        disposables.push(mat)
      }
      disposables.push(geo)
    }

    // --- landmark sculptures, built from nearby street segments
    const sculptures = SPOTS.slice(0, MAX_SPOTS).map((spot, s) => {
      const [wx, wz] = toWorld(spot.x, spot.y)
      spotUniforms[s].set(wx, wz, 0, 0)
      const lm = HAIRLINE[spot.id] ? EMPTY_LANDMARK : buildLandmark(spot.id)
      if (HAIRLINE[spot.id]) spotRadius[s] = HAIRLINE[spot.id].radius
      // footprint reach on the ground, for the light patch under the building
      for (let k = 0; k < lm.ground.length; k += 3) {
        spotRadius[s] = Math.max(spotRadius[s], Math.hypot(lm.ground[k], lm.ground[k + 2]))
      }
      const count = lm.height.length
      const position = new Float32Array(count * 3)
      const delay = new Float32Array(count)
      for (let v = 0; v < count; v += 2) {
        for (const k of [v, v + 1]) {
          position[k * 3] = wx + lm.ground[k * 3]
          position[k * 3 + 2] = wz + lm.ground[k * 3 + 2]
        }
        // after the current arrives, lower slices settle first
        const d = RISE_START + ((lm.height[v] + lm.height[v + 1]) / 2 / Math.max(lm.top, 1)) * DELAY_SPREAD + Math.random() * 0.02
        delay[v] = d
        delay[v + 1] = d
      }

      const geo = new BufferGeometry()
      geo.setAttribute('position', new BufferAttribute(position, 3))
      geo.setAttribute('aHeight', new BufferAttribute(lm.height, 1))
      geo.setAttribute('aDelay', new BufferAttribute(delay, 1))
      const progress = { value: 0 }
      const mat = new ShaderMaterial({
        vertexShader: SCULPT_VERTEX,
        fragmentShader: SCULPT_FRAGMENT,
        uniforms: { uProgress: progress, uCenter: { value: new Vector3(wx, 0, wz) }, uColor: { value: new Color(BRAND.merlot) } },
        transparent: true,
        depthWrite: false,
      })
      const lines = new LineSegments(geo, mat)
      lines.frustumCulled = false // vertices move far from their rest bounds
      lines.renderOrder = 2 // over the faces, so hidden edges stay hidden
      city.add(lines)
      disposables.push(geo, mat)

      // solid faces: grow from the ground (clamped to a rising level) and fade in
      const level = { value: 0 }
      const fade = { value: 0 }
      for (const paint of PAINTS) {
        const tris = lm.faces[paint]
        if (!tris.length) continue
        const pos = new Float32Array(tris.length)
        for (let k = 0; k < tris.length; k += 3) {
          pos[k] = wx + tris[k]
          pos[k + 1] = tris[k + 1]
          pos[k + 2] = wz + tris[k + 2]
        }
        const faceGeo = new BufferGeometry()
        faceGeo.setAttribute('position', new BufferAttribute(pos, 3))
        faceGeo.computeVertexNormals()
        const faceMat = new MeshLambertMaterial({
          color: PAINT_COLORS[paint],
          side: DoubleSide,
          transparent: true,
          polygonOffset: true, // push faces back so edge lines drawn on them win
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        })
        faceMat.onBeforeCompile = (shader) => {
          shader.uniforms.uLevel = level
          shader.uniforms.uFade = fade
          shader.vertexShader =
            'uniform float uLevel;\n' +
            shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y = min(transformed.y, uLevel);')
          shader.fragmentShader =
            'uniform float uFade;\n' +
            shader.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a *= uFade;')
        }
        const faces = new Mesh(faceGeo, faceMat)
        faces.frustumCulled = false
        faces.renderOrder = 1
        city.add(faces)
        disposables.push(faceGeo, faceMat)
      }
      return { x: wx, z: wz, top: lm.top, progress, level, fade }
    })

    // --- camera
    const target = new Vector3(VIEW_X, 40, 95)
    let distance = 1500
    let tilt = TILT
    const resize = () => {
      const w = root.clientWidth
      const h = root.clientHeight
      renderer.setSize(w, h, false)
      renderer.getDrawingBufferSize(resolution.value)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const halfTan = Math.tan(((FOV / 2) * Math.PI) / 180)
      // portrait: fit the whole spread of spots (San Siro → NoLo) across the
      // width, and push the view south so the map sits above the logo panel
      const portrait = camera.aspect < 0.8
      distance = Math.min(portrait ? 6000 : 2600, (portrait ? 1150 : VIEW_WIDTH) / 2 / (halfTan * camera.aspect))
      target.set(portrait ? -270 : VIEW_X, 40, portrait ? 330 : 95)
      tilt = portrait ? 62 : TILT // look down more on phones, so the city keeps some height
    }
    const ro = new ResizeObserver(resize)
    ro.observe(root)
    resize()

    // parallax: lean the camera a little towards the cursor
    const lean = { x: 0, y: 0, tx: 0, ty: 0 }
    const onPointer = (e: PointerEvent) => {
      lean.tx = e.clientX / window.innerWidth - 0.5
      lean.ty = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', onPointer)

    let onScreen = true
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      if (onScreen && !raf) raf = requestAnimationFrame(frame)
    })
    io.observe(root)

    const start = performance.now()
    let last = start
    let raf = 0
    let landedFired = false
    const v = new Vector3()

    const toScreen = (x: number, y: number, z: number) => {
      v.set(x, y, z).applyMatrix4(city.matrixWorld).project(camera)
      return { x: ((v.x + 1) / 2) * root.clientWidth, y: ((1 - v.y) / 2) * root.clientHeight, ok: v.z < 1 }
    }

    // Progressive construction of a Hairline figure: every stroke draws itself
    // on (dash offset 1 → 0), lowest first, and each plate fills in right after
    // its outline, so the drawing rises like the 3D sculptures. Runs backwards
    // when the figure goes away; at rest (fully built) the inline styles go.
    type Stroke = { el: SVGGeometryElement; d: number; dot: boolean }
    const strokes: (Stroke[] | null)[] = []
    const lastBuilt: number[] = []
    const buildFigure = (i: number, fig: HTMLElement, built: number) => {
      if (built === lastBuilt[i]) return
      lastBuilt[i] = built
      let list = strokes[i]
      if (!list) {
        const els = [...fig.querySelectorAll<SVGGeometryElement>('path, polygon, line, ellipse, circle')]
        const bottoms = els.map((el) => {
          const b = el.getBBox()
          return b.y + b.height
        })
        const lo = Math.min(...bottoms)
        const hi = Math.max(...bottoms)
        list = els.map((el, n) => ({ el, d: (hi - bottoms[n]) / Math.max(1, hi - lo), dot: el.tagName === 'ellipse' || el.tagName === 'circle' }))
        list.forEach(({ el, dot }) => !dot && el.setAttribute('pathLength', '1'))
        strokes[i] = list
      }
      for (const { el, d, dot } of list) {
        const st = el.style
        if (built >= 1) {
          st.strokeDasharray = st.strokeDashoffset = st.fillOpacity = st.opacity = ''
          continue
        }
        const t = Math.max(0, Math.min(1, (built - d * 0.65) / 0.35))
        const e = t * t * (3 - 2 * t)
        if (dot) {
          st.opacity = String(e)
          continue
        }
        st.strokeDasharray = '1'
        st.strokeDashoffset = String(1 - e)
        st.fillOpacity = String(Math.max(0, (e - 0.5) * 2))
      }
    }

    function frame(now: number) {
      raf = 0
      if (!onScreen) return
      const dt = Math.min(64, now - last)
      last = now
      const elapsed = now - start

      // intro: straight down → tilted
      const introT = reduced ? 1 : Math.min(1, elapsed / INTRO_MS)
      const e = 1 - Math.pow(1 - introT, 3)
      if (introT === 1 && !landedFired) {
        landedFired = true
        onLandedRef.current()
      }
      lean.x += (lean.tx - lean.x) * 0.05
      lean.y += (lean.ty - lean.y) * 0.05
      const elev = ((88 + (tilt - 88) * e - lean.y * 4) * Math.PI) / 180
      const azim = (lean.x * 7 * Math.PI) / 180
      camera.position.set(
        target.x + distance * Math.sin(azim) * Math.cos(elev),
        target.y + distance * Math.sin(elev),
        target.z + distance * Math.cos(azim) * Math.cos(elev),
      )
      camera.lookAt(target)

      const secs = elapsed / 1000
      city.rotation.y = reduced ? 0 : ((SWAY_DEG * Math.PI) / 180) * Math.sin((secs / SWAY_PERIOD_S) * Math.PI * 2)
      city.updateMatrixWorld()
      time.value = reduced ? 0 : secs

      // build / unbuild sculptures
      sculptures.forEach((sc, i) => {
        const want = landedFired && activeRef.current === i ? 1 : 0
        const rate = dt / (want ? BUILD_MS : UNBUILD_MS)
        const p = reduced ? want : sc.progress.value + Math.sign(want - sc.progress.value) * Math.min(rate, Math.abs(want - sc.progress.value))
        sc.progress.value = p
        spotUniforms[i].z = p
        const built = Math.max(0, Math.min(1, (p - RISE_START) / (1 - RISE_START)))
        sc.level.value = sc.top * built * built * (3 - 2 * built)
        sc.fade.value = Math.min(1, Math.max(0, (p - RISE_START) / 0.15)) * 0.95
        spotUniforms[i].w = want // current only flows while building
      })

      renderer.render(scene, camera)

      // HTML overlay
      sculptures.forEach((sc, i) => {
        const pin = pinRefs.current[i]
        if (!pin) return
        const s = toScreen(sc.x, 0, sc.z)
        pin.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`
        pin.style.visibility = s.ok ? '' : 'hidden'
        // Hairline figure: appears once the current has arrived, anchored on the pin
        const hl = HAIRLINE[SPOTS[i].id]
        const fig = figRefs.current[i]
        let figTop: { x: number; y: number } | null = null
        if (hl && fig) {
          const built = Math.max(0, Math.min(1, (sc.progress.value - RISE_START) / (1 - RISE_START)))
          const k = fig.offsetWidth / 400
          const fx = s.x - hl.anchor[0] * k
          const fy = s.y - hl.anchor[1] * k
          fig.style.transform = `translate3d(${fx}px, ${fy}px, 0)`
          fig.style.visibility = built > 0 ? '' : 'hidden'
          fig.style.pointerEvents = built > 0.8 ? 'auto' : 'none'
          buildFigure(i, fig, built)
          // card beside the model's right flank (the card sits 40px right of this point)
          // phones: the card sits above the model, centred on it, instead of beside it
          const cardW = (cardRef.current?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0
          figTop =
            canvas!.clientWidth < 768
              ? { x: s.x - 40 - cardW / 2, y: fy + 20 * k }
              : { x: fx + hl.card[0] * k - 40, y: fy + hl.card[1] * k }
        }
        if (i === activeRef.current && cardRef.current) {
          const top = figTop ?? toScreen(sc.x, sc.top * sc.progress.value * 0.6, sc.z)
          // card hangs up-right of this point; keep all of it on screen
          const card = cardRef.current.firstElementChild as HTMLElement | null
          const cw = (card?.offsetWidth ?? 0) + 40
          const ch = card?.offsetHeight ?? 0
          const cx = Math.min(top.x, canvas!.clientWidth - cw - 16)
          const cy = Math.max(top.y, ch + 16)
          cardRef.current.style.transform = `translate3d(${cx}px, ${cy}px, 0)`
        }
      })

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      ro.disconnect()
      io.disconnect()
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
    }
  }, [])

  // mount the Hairline figures once; they sleep while settled or offscreen
  useEffect(() => {
    const teardown = SPOTS.slice(0, MAX_SPOTS).map((spot, i) => {
      const hl = HAIRLINE[spot.id]
      const el = figRefs.current[i]
      return hl && el ? mountHairline(el, hl.figure) : null
    })
    return () => teardown.forEach((t) => t?.())
  }, [])

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      {SPOTS.slice(0, MAX_SPOTS).map((spot, i) => {
        const on = active === i
        return (
          <div
            key={spot.id}
            ref={(el) => {
              pinRefs.current[i] = el
            }}
            className="absolute left-0 top-0"
          >
            <button
              type="button"
              aria-label={spot.name}
              onMouseEnter={() => onFocus(i)}
              onMouseLeave={onBlur}
              onFocus={() => onFocus(i)}
              onClick={() => onFocus(i)}
              className={`pointer-events-auto absolute bottom-0 left-0 flex -translate-x-1/2 translate-y-1.25 cursor-pointer flex-col items-center transition-opacity duration-700 ${
                landed ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: landed ? `${i * 90}ms` : '0ms' }}
            >
              <span
                className={`hidden rounded-full bg-ivory px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-merlot md:inline shadow-[0_4px_12px_-4px_rgba(30,23,21,0.3)] ring-1 ring-sky transition-opacity duration-300 ${
                  on ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {spot.name}
              </span>
              <span className={`hidden w-0.5 bg-merlot transition-opacity duration-300 md:block ${on ? 'h-8 opacity-0' : 'h-8 opacity-100'}`} />
              <span className="h-2.5 w-2.5 rounded-full bg-merlot ring-4 ring-merlot/15" />
            </button>
          </div>
        )
      })}

      {SPOTS.slice(0, MAX_SPOTS).map((spot, i) =>
        HAIRLINE[spot.id] ? (
          <div
            key={`fig-${spot.id}`}
            ref={(el) => {
              figRefs.current[i] = el
            }}
            onMouseEnter={() => onFocus(i)}
            onMouseLeave={onBlur}
            className="absolute left-0 top-0 w-[min(380px,max(34vw,190px))]"
            style={
              {
                // inline: the kernel's unlayered `position: relative` beats Tailwind's layer
                position: 'absolute',
                visibility: 'hidden',
                colorScheme: 'light',
                // brand palette for the figure: ivory plates, night lines, merlot accent
                '--hairline-plate': BRAND.ivory,
                '--hairline-hi': BRAND.merlot,
                '--hairline-edge': 'rgba(30, 23, 21, 0.62)',
                '--hairline-mid': 'rgba(30, 23, 21, 0.38)',
                '--hairline-lo': 'rgba(30, 23, 21, 0.16)',
              } as CSSProperties
            }
          />
        ) : null,
      )}

      <div ref={cardRef} className="absolute left-0 top-0 z-10">
        {active !== null && (
          <div key={active} className="absolute bottom-0 left-10">
            <SpotCard
              spot={SPOTS[active]}
              compact
              style={{ animation: `card-pop 550ms ${BUILD_MS * 0.75}ms both cubic-bezier(0.34, 1.56, 0.64, 1)` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
