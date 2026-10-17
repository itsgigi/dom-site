// Hairline figure for a hero spot. Built with the hairline-create skill
// (github.com/lucasmarkes/hairline); exported as data for mountHairline.
/**
 * Prada: Fondazione Prada, three gabled sheds, the gold Haunted House and the
 * Torre, whose nine floors alternate between two plans. The pointer's height
 * picks a floor of the Torre; the floors above it lift, staggered outwards
 * from it, opening the tower at that floor. At rest the Haunted House is the
 * bright mark, as its gold leaf is in the real one. The slider is the gap.
 */
import HL from '../../../vendor/hairline/kernel.js'

const {
  Cam, clamp, facing, fit, prism, proj, rings, rrect, ringAt, hull, poly, open,
  tween, tset, tval, tdone, mk, pointer, put, register, disposer, solid,
} = HL;

const FLOORS = 9, FH = 8;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.95);
  fit(C, [[0, 0, 0], [88, 0, 0], [88, 46, 0], [0, 46, 0], [75, 9, FLOORS * FH + 16]], 200, 166);
  const P = proj(C), front = facing(C);
  let GAP = value, over = null;
  const g = mk("g", {}, svg);

  const box = (el, x0, y0, x1, y1, r, b, z0, z1) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    put(el, prism(P, front, ring, inner, z0, z1));
    return el;
  };
  // a pitched roof: the hull of its eaves and its ridge, the ridge as crease
  const gable = (el, x0, y0, x1, y1, z0, rise) => {
    const cy = (y0 + y1) / 2, a = P(x0 + 0.6, cy, z0 + rise), b = P(x1 - 0.6, cy, z0 + rise);
    put(el, { sil: poly(hull(ringAt(P, rrect(x0, y0, x1, y1, 1, 4), z0).concat([a, b]))), crease: open([a, b]) });
    return el;
  };

  for (const y of [0, 16, 32]) {
    box(solid(g), 0, y, 54, y + 12, 1.4, 0.9, 0, 10);
    gable(solid(g), 0, y, 54, y + 12, 10, 8);
  }

  const floors = Array.from({ length: FLOORS }, (_, i) => ({
    i,
    plan: i % 2 ? [63, 3, 87, 15] : [66, 0, 84, 18],
    tw: tween(0),
    lift: 0,
    el: solid(g),
    drawn: NaN,
  }));
  // the Haunted House stands in front of the Torre, so it comes after it
  const haunted = box(solid(g), 62, 30, 72, 40, 1.2, 0.8, 0, 20);
  const hauntedRoof = gable(solid(g), 62, 30, 72, 40, 20, 6);
  function drawFloor(f) {
    if (f.lift === f.drawn) return;
    f.drawn = f.lift;
    const [x0, y0, x1, y1] = f.plan, z = f.i * FH + f.lift;
    box(f.el, x0, y0, x1, y1, 1.6, 1, z, z + FH);
  }

  let chosen; // undefined until the first call, so it always paints
  function light(f) {
    if (f === chosen) return;
    if (chosen) chosen.el.sil.classList.remove("hi");
    chosen = f;
    if (chosen) chosen.el.sil.classList.add("hi");
    for (const el of [haunted, hauntedRoof]) el.sil.classList.toggle("hi", !chosen);
  }
  light(null);

  const B = register(stage, (dt, now) => {
    let m = false;
    for (const f of floors) { f.lift = tval(f.tw, now); if (!tdone(f.tw, now)) m = true; drawFloor(f); }
    return m;
  });
  bag.add(B.unregister);

  // rule 01: the floor whose rest middle is nearest the pointer, on screen
  const mids = floors.map((f) => P(75, 9, f.i * FH + FH / 2));
  function retarget() {
    let pick = null;
    if (over) {
      let bd = Infinity;
      floors.forEach((f, k) => {
        const d = Math.hypot(mids[k][0] - over[0], mids[k][1] - over[1]);
        if (d < bd) { bd = d; pick = f; }
      });
      if (bd > 34) pick = null;
    }
    const now = performance.now();
    for (const f of floors) tset(f.tw, pick && f.i > pick.i ? GAP : 0, now, pick ? Math.abs(f.i - pick.i) * 40 : 0);
    light(pick);
    read.textContent = pick ? `piano ${pick.i + 1}` : "rest";
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => { over = p; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { GAP = clamp(v, 2, 16); if (over) retarget(); }, destroy: bag.dispose };
}

export default {
  name: "prada",
  means: "Fondazione Prada: the pointer picks a floor of the Torre and the floors above it lift, opening the tower.",
  range: [5, 9, 14],
  mount,
};
