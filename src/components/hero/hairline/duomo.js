// Hairline figure for a hero spot. Built with the hairline-create skill
// (github.com/lucasmarkes/hairline); exported as data for mountHairline.
/**
 * Duomo: Milan's cathedral, façade towards the viewer, its five aisles
 * stepping up to the nave and a forest of pinnacles along every roof edge.
 * The pointer is read on each pinnacle's own rest top; each pinnacle rises from its rest
 * height on its own spring, by distance, and the one nearest the pointer takes
 * the bright stroke. At rest the pinnacles swell towards the façade and the
 * tiburio, and the Madonnina on the main spire is the one bright mark. The
 * slider is the reach, in world units.
 */
import HL from '../../../vendor/hairline/kernel.js'

const {
  Cam, clamp, facing, fit, prism, proj, rings, rrect, ringAt, run, hull, poly, open,
  unproj, spring, stepS, flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const L = 120, W = 56, LIFT = 32;
const ROWS = [ // [y, roof height] from the far side to the near one
  [2, 20], [10, 30], [19, 44], [37, 44], [46, 30], [54, 20],
];
const TX = 34, TY = 28; // the crossing, under the tiburio

const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.417 ? 1 - (u / 0.417) * 0.6875 : u <= 1 ? 0.3125 - ((u - 0.417) / 0.583) * 0.2185 : 0.094;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.46);
  fit(C, [[-14, -8, 0], [L + 3, 64, 0], [L + 3, -8, 0], [-14, 64, 0], [TX, TY, 100], [L - 6, 54, 20 + 14 + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);
  let R = value, over = null;
  const g = mk("g", {}, svg);

  const block = (x0, y0, x1, y1, r, b, z0, z1) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    const el = solid(g);
    put(el, prism(P, front, ring, inner, z0, z1));
    return el;
  };
  // A solid whose top is smaller than its foot: the hull of two rings, and a
  // crease on the top ring when it is big enough to hold one.
  const taper = (el, cx, cy, w0, w1, z0, z1) => {
    const sq = (w) => rrect(cx - w / 2, cy - w / 2, cx + w / 2, cy + w / 2, w * 0.3, 4);
    const sil = poly(hull(ringAt(P, sq(w0), z0).concat(ringAt(P, sq(w1), z1))));
    const crease = w1 > 2.4 ? open(ringAt(P, run(sq(w1 - 1.2), front), z1)) : "";
    put(el, { sil, crease });
  };

  // Back to front: apse, far transept arm, then the aisles stepping up and
  // down again, each roof's pinnacles after the roof they stand on.
  block(-14, 6, 18, 50, 20, 1.8, 0, 38);
  block(26, -5, 42, 2, 2.4, 0.9, 0, 26);
  const pins = [];
  const row = (y, z) => {
    for (let x = 48; x <= L - 6; x += 8) {
      const u = x / L;
      const h0 = 8 + 6 * Math.exp(-((u - 1) ** 2) / 0.02) + 3 * Math.exp(-((x - TX) ** 2) / 400) + (z === 44 ? 2 : 0);
      pins.push({ x, y, z, h0, sp: spring(h0, { eps: 0.04 }), el: solid(g), drawn: NaN, n: 0 });
    }
  };
  block(0, 0, L, W, 6, 1.6, 0, 20);
  row(...ROWS[0]);
  block(0, 8, L, 48, 4, 1.2, 20, 30);
  row(...ROWS[1]);
  block(0, 18, L, 38, 3, 1, 30, 44);
  block(TX - 7, TY - 7, TX + 7, TY + 7, 7, 1.2, 44, 56);
  taper(solid(g), TX, TY, 9, 3.4, 56, 74);
  const needle = solid(g);
  taper(needle, TX, TY, 3.2, 0.3, 74, 98);
  const madonnina = flatDot(g, C, 0.9, "dot");
  place(madonnina, P(TX, TY, 99.5));
  for (const r of ROWS.slice(2)) row(...r);
  block(26, 56, 42, 61, 2.4, 0.9, 0, 26);
  // the façade's piers, each carrying a spire, nearest of all
  for (const [y, z] of ROWS) {
    const top = z + 14;
    block(L, y - 1.6, L + 3.2, y + 1.6, 1, 0.5, 0, top - 9);
    taper(solid(g), L + 1.6, y, 3.2, 0.3, top - 9, top);
  }
  pins.forEach((p, i) => { p.n = i + 1; });

  function drawPin(p) {
    const h = Math.max(0.6, p.sp.x);
    if (h === p.drawn) return;
    p.drawn = h;
    taper(p.el, p.x, p.y, 2.6, 0.3, p.z, p.z + h);
  }

  let chosen; // undefined until the first call, so it always paints
  function light(next) {
    if (next === chosen) return;
    if (chosen) chosen.el.sil.classList.remove("hi");
    chosen = next;
    if (chosen) chosen.el.sil.classList.add("hi");
    madonnina.setAttribute("class", chosen ? "dot m" : "dot");
    needle.sil.classList.toggle("hi", !chosen);
  }
  light(null);

  const B = register(stage, (dt) => {
    let m = false;
    for (const p of pins) { if (stepS(p.sp, dt)) m = true; drawPin(p); }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    let best = null, bd = Infinity;
    for (const p of pins) {
      if (!over) { p.sp.t = p.h0; continue; }
      // rule 01: the pointer on this pinnacle's rest top, never its live pose
      const at = unproj(C, over[0], over[1], p.z + p.h0);
      const d = Math.hypot(p.x - at[0], p.y - at[1]);
      p.sp.t = p.h0 + LIFT * falloff(d / R);
      if (d < bd) { bd = d; best = p; }
    }
    const pick = over && bd < clamp(R * 0.6, 6, 14) ? best : null;
    light(pick);
    read.textContent = pick ? `guglia ${pick.n}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = p; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "duomo",
  means: "Milan's cathedral: the pinnacles near the pointer rise from the roofs, falling off with distance.",
  range: [14, 24, 36],
  mount,
};
