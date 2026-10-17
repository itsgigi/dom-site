import { useEffect, useRef } from 'react'
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
import { PAINTS, buildLandmark, type Paint } from './landmarks'
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
const MAX_SPOTS = 8

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
  vFade = 1.0 - smoothstep(480.0, 760.0, length(position.xz));
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
      const lm = buildLandmark(spot.id)
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
    const target = new Vector3(0, 40, 95)
    let distance = 1500
    const resize = () => {
      const w = root.clientWidth
      const h = root.clientHeight
      renderer.setSize(w, h, false)
      renderer.getDrawingBufferSize(resolution.value)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      const halfTan = Math.tan(((FOV / 2) * Math.PI) / 180)
      distance = Math.min(2600, VIEW_WIDTH / 2 / (halfTan * camera.aspect))
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
      const elev = ((88 + (TILT - 88) * e - lean.y * 4) * Math.PI) / 180
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
        if (i === activeRef.current && cardRef.current) {
          const top = toScreen(sc.x, sc.top * sc.progress.value * 0.6, sc.z)
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
                className={`rounded-full bg-ivory px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-merlot shadow-[0_4px_12px_-4px_rgba(30,23,21,0.3)] ring-1 ring-sky transition-opacity duration-300 ${
                  on ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {spot.name}
              </span>
              <span className={`w-0.5 bg-merlot transition-opacity duration-300 ${on ? 'h-8 opacity-0' : 'h-8 opacity-100'}`} />
              <span className="h-2.5 w-2.5 rounded-full bg-merlot ring-4 ring-merlot/15" />
            </button>
          </div>
        )
      })}

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
