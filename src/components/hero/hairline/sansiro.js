// Hairline figure for a hero spot. Built with the hairline-create skill
// (github.com/lucasmarkes/hairline); exported as data for mountHairline.
/**
 * San Siro: the Meazza's oval bowl with the pitch inside, the four tall
 * corner towers carrying the roof beams, and the eleven spiral ramp towers
 * round its flanks. The pointer picks the ramp tower nearest it; that tower
 * and its neighbours rise, staggered outwards round the bowl. At rest one
 * corner tower is the bright mark. The slider is how far they rise.
 */
import HL from '../../../vendor/hairline/kernel.js'

const {
  Cam, clamp, facing, fit, prism, proj, rings, open, poly,
  tween, tset, tval, tdone, mk, pointer, put, register, disposer, solid,
} = HL;

const CX = 55, CY = 42, N = 11, BASE = 19, TR = 4;
const RAMPS = Array.from({ length: N }, (_, i) => {
  const a = -Math.PI * 0.75 + (i / N) * Math.PI * 2 + 0.2;
  return { i, x: CX + Math.cos(a) * 64, y: CY + Math.sin(a) * 51 };
});
const CORNERS = [[10, 8], [100, 8], [10, 76], [100, 76]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.75);
  fit(C, [[-14, -14, 0], [124, -14, 0], [124, 98, 0], [-14, 98, 0], [CX, CY, 48]], 200, 166);
  const P = proj(C), front = facing(C);
  let RISE = value;
  const g = mk("g", {}, svg);

  const block = (el, x0, y0, x1, y1, r, b, z0, z1) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    put(el, prism(P, front, ring, inner, z0, z1));
    return el;
  };
  const path = (cls) => mk("path", { class: cls }, g);
  // the spiral ramp, drawn only where it faces us (the viewer is towards +x +y)
  const helix = (cx, cy, r, z0, z1) => {
    const subs = [];
    let cur = [];
    for (let t = 0; t <= (z1 - z0) / 6 * Math.PI * 2; t += 0.25) {
      const a = t + 0.6, z = z0 + (t / (Math.PI * 2)) * 6;
      if (Math.cos(a) + Math.sin(a) > 0.15) cur.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z));
      else if (cur.length) { subs.push(cur); cur = []; }
    }
    if (cur.length) subs.push(cur);
    return subs.filter((s) => s.length > 1).map(open).join("");
  };

  const ramps = RAMPS.map((r) => ({ ...r, tw: tween(0), lift: 0, drawn: NaN, el: null, spiral: null }));
  const corners = CORNERS.map(([x, y]) => ({ x, y, el: null }));
  const bowl = { el: null };

  // back to front: everything behind the bowl's middle, the bowl, the rest
  const items = [
    ...ramps.map((r) => ({ k: r.x + r.y, make: () => { r.el = solid(g); r.spiral = path("lo nf"); } })),
    ...corners.map((c) => ({ k: c.x + c.y, make: () => { c.el = block(solid(g), c.x - 5, c.y - 5, c.x + 5, c.y + 5, 5, 1.2, 0, 34); } })),
    { k: CX + CY, make: () => {
      bowl.el = block(solid(g), 0, 0, 110, 84, 34, 2, 0, 22);
      // the opening and the pitch, seen from above on the bowl's rim
      path("lo nf").setAttribute("d", poly(rings(14, 12, 96, 72, 26, 1)[0].map((s) => P(s.u, s.v, 22))));
      const pitch = [[30, 24], [80, 24], [80, 60], [30, 60], [30, 24]];
      const circle = Array.from({ length: 17 }, (_, k) => P(CX + Math.cos((k / 16) * 6.283) * 6, CY + Math.sin((k / 16) * 6.283) * 6, 22));
      path("lo nf").setAttribute("d", open(pitch.map(([x, y]) => P(x, y, 22))) + open([P(CX, 24, 22), P(CX, 60, 22)]) + open(circle));
    } },
  ];
  items.sort((a, b) => a.k - b.k).forEach((it) => it.make());
  // the roof beams, spanning the long sides from corner tower to corner tower
  path("nf").setAttribute("d", open([P(10, 8, 34), P(100, 8, 34)]) + open([P(10, 76, 34), P(100, 76, 34)]));

  function drawRamp(r) {
    if (r.lift === r.drawn) return;
    r.drawn = r.lift;
    const top = BASE + r.lift;
    block(r.el, r.x - TR, r.y - TR, r.x + TR, r.y + TR, TR, 1, 0, top);
    r.spiral.setAttribute("d", helix(r.x, r.y, TR, 1, top - 1));
  }

  const restMark = corners[3].el;
  let chosen;
  function light(r) {
    if (r === chosen) return;
    if (chosen) chosen.el.sil.classList.remove("hi");
    chosen = r;
    if (chosen) chosen.el.sil.classList.add("hi");
    restMark.sil.classList.toggle("hi", !chosen);
  }
  light(null);

  const B = register(stage, (dt, now) => {
    let m = false;
    for (const r of ramps) { r.lift = tval(r.tw, now); if (!tdone(r.tw, now)) m = true; drawRamp(r); }
    return m;
  });
  bag.add(B.unregister);

  // rule 01: the ramp tower whose rest top is nearest the pointer, on screen
  const tops = ramps.map((r) => P(r.x, r.y, BASE));
  function pick(p) {
    if (!p) return null;
    let best = null, bd = Infinity;
    tops.forEach((t, k) => { const d = Math.hypot(t[0] - p[0], t[1] - p[1]); if (d < bd) { bd = d; best = ramps[k]; } });
    return bd < 30 ? best : null;
  }
  function retarget(p) {
    const a = pick(p), now = performance.now();
    for (const r of ramps) {
      const d = a ? Math.min(Math.abs(r.i - a.i), N - Math.abs(r.i - a.i)) : 0;
      tset(r.tw, a ? RISE * clamp(1 - d / 3, 0, 1) : 0, now, a ? d * 45 : 0);
    }
    light(a);
    read.textContent = a ? `torre ${a.i + 1}` : "rest";
    B.wake();
  }
  bag.add(pointer(stage, { move: retarget, leave: () => retarget(null) }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { RISE = v; }, destroy: bag.dispose };
}

export default {
  name: "sansiro",
  means: "San Siro: the pointer picks a spiral ramp tower; it and its neighbours rise, staggered round the bowl.",
  range: [12, 20, 28],
  mount,
};
