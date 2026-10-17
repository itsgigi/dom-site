// Hairline figure for a hero spot. Built with the hairline-create skill
// (github.com/lucasmarkes/hairline); exported as data for mountHairline.
/**
 * Isola: Bosco Verticale, two towers of staggered balcony slabs with trees
 * spilling over them. The pointer's height picks a floor of the tower under
 * it; the balconies near that floor slide further out, staggered outwards
 * from it and falling off by floors. At rest the slabs already step in and out,
 * and the crown of the taller tower is the bright mark. The slider is the
 * reach, in floors.
 */
import HL from '../../../vendor/hairline/kernel.js'

const {
  Cam, clamp, facing, fit, prism, proj, rings, tween, tset, tval, tdone,
  mk, pointer, put, register, disposer, solid,
} = HL;

const FH = 6, PUSH = 2.4; // extra stagger, as a multiple of the rest one
const TOWERS = [ // footprint and floor count, far tower first
  { x0: 0, y0: 0, x1: 26, y1: 26, n: 19 },
  { x0: 40, y0: 14, x1: 62, y1: 36, n: 13 },
];

const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.417 ? 1 - (u / 0.417) * 0.6875 : u <= 1 ? 0.3125 - ((u - 0.417) / 0.583) * 0.2185 : 0.094;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.75);
  fit(C, [[-8, -8, 0], [70, 44, 0], [70, -8, 0], [-8, 44, 0], [13, 13, 19 * FH + 8]], 200, 166);
  const P = proj(C), front = facing(C);
  let R = value, over = null;
  const g = mk("g", {}, svg);
  const block = (x0, y0, x1, y1, r, b, z0, z1, el = solid(g)) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    put(el, prism(P, front, ring, inner, z0, z1));
    return el;
  };

  const floors = [];
  const crowns = [];
  TOWERS.forEach((t, ti) => {
    const cx = (t.x0 + t.x1) / 2, cy = (t.y0 + t.y1) / 2;
    for (let i = 0; i < t.n; i++) {
      const z = i * FH;
      // core of this storey, then the slab that caps it, so the next storey's
      // core hides the slab's far side (rule 06)
      block(t.x0 + 3, t.y0 + 3, t.x1 - 3, t.y1 - 3, 2, 0.8, z, z + FH);
      const s = Math.sin(i * 2.1 + ti), c = Math.cos(i * 1.7 + ti * 2);
      const f = { ti, i, t, cx, cy, z: z + FH, dx: s * 3, dy: c * 3, tw: tween(0), push: 0, el: solid(g), trees: [], drawn: NaN };
      if ((i * 7 + ti * 3) % 3 !== 0) {
        for (const k of [0, 1]) if ((i + k) % 2 === 0 || k === 0) f.trees.push({ el: solid(g), u: k ? -1 : 1 });
      }
      floors.push(f);
    }
    crowns.push(block(t.x0 + 5, t.y0 + 5, t.x1 - 5, t.y1 - 5, 2, 0.8, t.n * FH, t.n * FH + 5));
  });

  // the slab grows out along its own stagger, by its spring
  function drawFloor(f) {
    const k = 1 + f.push;
    if (k === f.drawn) return;
    f.drawn = k;
    const ox = f.dx * k, oy = f.dy * k, t = f.t;
    block(t.x0 - 2 + ox, t.y0 - 2 + oy, t.x1 + 2 + ox, t.y1 + 2 + oy, 2.4, 1, f.z - 1, f.z, f.el);
    f.trees.forEach((tr) => {
      const tx = tr.u > 0 ? t.x1 + ox : t.x0 + 2 + ox, ty = f.cy + oy + tr.u * 4;
      block(tx - 3.4, ty - 3.4, tx + 3.4, ty + 3.4, 3.4, 1, f.z, f.z + 5.5, tr.el);
    });
  }

  let chosen; // undefined until the first call, so it always paints
  function light(next) {
    if (next === chosen) return;
    if (chosen) chosen.el.sil.classList.remove("hi");
    chosen = next;
    if (chosen) chosen.el.sil.classList.add("hi");
    crowns[0].sil.classList.toggle("hi", !chosen);
  }
  light(null);

  const B = register(stage, (dt, now) => {
    let m = false;
    for (const f of floors) { f.push = tval(f.tw, now); if (!tdone(f.tw, now)) m = true; drawFloor(f); }
    return m;
  });
  bag.add(B.unregister);

  // rule 01: pick from rest positions, the tower by screen x, then the floor by screen y
  const towerX = TOWERS.map((t) => P((t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2, 0)[0]);
  function retarget() {
    let pick = null;
    if (over) {
      const ti = Math.abs(over[0] - towerX[0]) < Math.abs(over[0] - towerX[1]) ? 0 : 1;
      let bd = Infinity;
      for (const f of floors) {
        if (f.ti !== ti) continue;
        const d = Math.abs(P(f.cx, f.cy, f.z)[1] - over[1]);
        if (d < bd) { bd = d; pick = f; }
      }
      if (bd > 14) pick = null;
    }
    const now = performance.now();
    for (const f of floors) {
      const near = pick && f.ti === pick.ti;
      tset(f.tw, near ? PUSH * falloff(Math.abs(f.i - pick.i) / R) : 0, now, near ? Math.abs(f.i - pick.i) * 40 : 0);
    }
    light(pick);
    read.textContent = pick ? `piano ${pick.i + 1}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = p; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { R = clamp(v, 1, 9); if (over) retarget(); }, destroy: bag.dispose };
}

export default {
  name: "isola",
  means: "Bosco Verticale: the balconies near the floor under the pointer slide out, falling off floor by floor.",
  range: [2, 3.5, 6],
  mount,
};
