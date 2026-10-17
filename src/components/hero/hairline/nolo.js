// Hairline figure for a hero spot. Built with the hairline-create skill
// (github.com/lucasmarkes/hairline); exported as data for mountHairline.
/**
 * NoLo: Parco Trotter, the old open-air school's two gabled pavilions under
 * a crowd of trees. The pointer is a gust across the lawn: trees near it
 * lean away on their springs, the nearer the further, and stand back up when
 * it leaves. At rest they lean a little with the prevailing wind and the
 * tallest crown is the bright mark. The slider is the gust's reach.
 */
import HL from '../../../vendor/hairline/kernel.js'

const {
  Cam, facing, fit, prism, proj, rings, rrect, ringAt, run, hull, poly, open,
  unproj, spring, stepS, mk, pointer, put, register, disposer, solid,
} = HL;

const LEAN = 6.5;
const TREES = [ // x, y, crown radius, height
  [26, 30, 5, 17], [50, 28, 6, 20], [60, 12, 4.5, 15], [76, 24, 5.5, 18], [90, 12, 4, 14],
  [88, 36, 5, 17], [36, 46, 5.5, 19], [16, 58, 4.5, 15], [52, 64, 5, 16], [92, 60, 4.5, 15], [72, 36, 4, 13],
];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.95);
  fit(C, [[0, 0, -2], [100, 0, -2], [100, 70, -2], [0, 70, -2], [50, 28, 24]], 200, 166);
  const P = proj(C), front = facing(C);
  let R = value, over = null;
  const g = mk("g", {}, svg);

  const box = (el, x0, y0, x1, y1, r, b, z0, z1) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    put(el, prism(P, front, ring, inner, z0, z1));
    return el;
  };
  const circle = (cx, cy, r) => rrect(cx - r, cy - r, cx + r, cy + r, r, 5);
  const gable = (el, x0, y0, x1, y1, z0, rise) => {
    const cy = (y0 + y1) / 2, a = P(x0 + 0.6, cy, z0 + rise), b = P(x1 - 0.6, cy, z0 + rise);
    put(el, { sil: poly(hull(ringAt(P, rrect(x0, y0, x1, y1, 1, 4), z0).concat([a, b]))), crease: open([a, b]) });
  };

  box(solid(g), 0, 0, 100, 70, 10, 2.2, -2, 0);

  // pavilions and trees, painted back to front by their footprint's x + y
  const items = [
    { k: 24 + 13, draw: () => { box(solid(g), 8, 6, 40, 20, 1.4, 0.9, 0, 12); gable(solid(g), 8, 6, 40, 20, 12, 10); } },
    { k: 70 + 51, draw: () => { box(solid(g), 58, 46, 82, 56, 1.4, 0.9, 0, 9); gable(solid(g), 58, 46, 82, 56, 9, 7); } },
  ];
  const trees = TREES.map(([x, y, r, h], n) => {
    const rest = [1 + (n % 3) * 0.4, 0.5 - (n % 2) * 0.6];
    return { n: n + 1, x, y, r, h, rest, lx: spring(rest[0], { eps: 0.02 }), ly: spring(rest[1], { eps: 0.02 }), trunk: null, crown: null, drawn: "" };
  });
  trees.forEach((t) => items.push({ k: t.x + t.y, draw: () => { t.trunk = solid(g); t.crown = solid(g); } }));
  items.sort((a, b) => a.k - b.k).forEach((it) => it.draw());

  function drawTree(t) {
    const key = t.lx.x.toFixed(2) + "," + t.ly.x.toFixed(2);
    if (key === t.drawn) return;
    t.drawn = key;
    const z1 = t.h * 0.5, cx = t.x + t.lx.x, cy = t.y + t.ly.x;
    put(t.trunk, { sil: poly(hull(ringAt(P, circle(t.x, t.y, 0.9), 0).concat(ringAt(P, circle(t.x + t.lx.x * 0.8, t.y + t.ly.x * 0.8, 0.6), z1)))), crease: "" });
    // the crown: a rounded solid swelling out of the trunk and closing at the top
    put(t.crown, {
      sil: poly(hull([[0.6, 0], [1, 0.3], [0.85, 0.75], [0.35, 1]].flatMap(([k, f]) => ringAt(P, circle(cx, cy, t.r * k), z1 - 1 + (t.h - z1 + 1) * f)))),
      crease: open(ringAt(P, run(rrect(cx - t.r * 0.3, cy - t.r * 0.3, cx + t.r * 0.3, cy + t.r * 0.3, t.r * 0.3, 5), front), t.h)),
    });
  }

  const tallest = trees.reduce((a, b) => (b.h > a.h ? b : a));
  let chosen;
  function light(t) {
    const next = t ?? tallest;
    if (next === chosen) return;
    if (chosen) chosen.crown.sil.classList.remove("hi");
    chosen = next;
    chosen.crown.sil.classList.add("hi");
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const t of trees) { if (stepS(t.lx, dt)) m = true; if (stepS(t.ly, dt)) m = true; drawTree(t); }
    return m;
  });
  bag.add(B.unregister);
  for (const t of trees) drawTree(t);
  light(null);

  function retarget() {
    let pick = null, bd = Infinity;
    for (const t of trees) {
      let [tx, ty] = t.rest;
      if (over) {
        const dx = t.x - over[0], dy = t.y - over[1], d = Math.hypot(dx, dy);
        if (d < R) {
          const push = LEAN * (1 - d / R) + 1;
          tx = (d > 0.5 ? dx / d : 1) * push;
          ty = (d > 0.5 ? dy / d : 0) * push;
        }
        // rule 01: pick by the trunks, which never move
        if (d < bd) { bd = d; pick = t; }
      }
      t.lx.t = tx;
      t.ly.t = ty;
    }
    if (bd > 12) pick = null;
    light(pick);
    read.textContent = pick ? `albero ${pick.n}` : "rest";
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 8); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { R = v; if (over) retarget(); }, destroy: bag.dispose };
}

export default {
  name: "nolo",
  means: "Parco Trotter: the pointer is a gust across the lawn; the trees near it lean away and stand back up.",
  range: [18, 28, 40],
  mount,
};
