// Hairline figure for a hero spot. Built with the hairline-create skill
// (github.com/lucasmarkes/hairline); exported as data for mountHairline.
/**
 * Navigli: the Darsena, a long basin let into the quay, the Naviglio Grande
 * leaving it, Porta Ticinese at its head, lamps along the near quay and seven
 * moored boats. The pointer, read on the water, pushes the boats away; each
 * drifts on two springs and comes back to its mooring when the pointer
 * leaves. The boat nearest the pointer takes the bright stroke; at rest the
 * cabin boat in the middle does. The slider is the push's reach.
 */
import HL from '../../../vendor/hairline/kernel.js'

const {
  Cam, clamp, facing, fit, prism, proj, rings, rrect, ringAt, hull, poly, open,
  unproj, spring, stepS, flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const PUSH = 16;
const MOORINGS = [[14, 7, 0], [34, 29, 1], [52, 8, 0], [62, 27, 1], [80, 9, 0], [96, 28, 0], [106, 12, 1]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.6);
  fit(C, [[-24, -8, 0], [158, -8, 0], [158, 44, 0], [-24, 44, 0], [-14, 18, 34]], 200, 166);
  const P = proj(C), front = facing(C);
  let R = value, over = null;
  const g = mk("g", {}, svg);

  const box = (el, x0, y0, x1, y1, r, b, z0, z1) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    put(el, prism(P, front, ring, inner, z0, z1));
    return el;
  };
  const line = (cls, pts, parent = g) => mk("path", { class: cls, d: open(pts.map((p) => P(...p))) }, parent);

  // Porta Ticinese: block, columns facing the basin, pediment
  box(solid(g), -22, 4, -8, 32, 1.4, 0.9, 0, 24);
  for (let y = 8; y <= 28; y += 5) line("lo nf", [[-8, y, 1], [-8, y, 21]]);
  const pa = P(-15, 4.6, 31), pb = P(-15, 31.4, 31);
  put(solid(g), { sil: poly(hull(ringAt(P, rrect(-22, 4, -8, 32, 1, 4), 24).concat([pa, pb]))), crease: open([pa, pb]) });

  // quay, the water let into it, the canal leaving it, ripples
  box(solid(g), -6, -8, 158, 44, 6, 2, -3, 0);
  box(solid(g), 0, 0, 120, 36, 10, 2.2, -2.2, -1.4);
  box(solid(g), 112, 14, 158, 22, 2, 0.8, -2.2, -1.4);
  for (const [x0, x1, y] of [[18, 40, 18], [56, 86, 20], [92, 108, 17], [26, 50, 31]]) line("dash nf", [[x0, y, -1.4], [x1, y, -1.4]]);

  const boatsG = mk("g", {}, g);
  const boats = MOORINGS.map(([x, y, cabin], n) => ({
    n: n + 1, rx: x, ry: y, cabin,
    sx: spring(x, { eps: 0.03 }), sy: spring(y, { eps: 0.03 }),
    g: null, hull: null, top: null, drawn: "",
  }));
  for (const b of boats) {
    b.g = mk("g", {}, boatsG);
    b.hull = solid(b.g);
    if (b.cabin) b.top = solid(b.g);
  }
  function drawBoat(b) {
    const key = b.sx.x.toFixed(2) + "," + b.sy.x.toFixed(2);
    if (key === b.drawn) return;
    b.drawn = key;
    const x = b.sx.x, y = b.sy.x;
    box(b.hull, x - 9, y - 3, x + 9, y + 3, 3, 1, -1.4, 1.6);
    if (b.top) box(b.top, x - 4.5, y - 2, x + 2.5, y + 2, 1.2, 0.6, 1.6, 4.6);
  }
  let order = "";
  function sortBoats() {
    const sorted = [...boats].sort((a, b) => a.sx.x + a.sy.x - (b.sx.x + b.sy.x));
    const key = sorted.map((b) => b.n).join(",");
    if (key === order) return;
    order = key;
    sorted.forEach((b) => boatsG.appendChild(b.g)); // back to front (rule 06)
  }

  // lamps along the near quay
  for (let x = 6; x <= 114; x += 18) {
    line("nf", [[x, 40, 0], [x, 40, 12]]);
    place(flatDot(g, C, 1.1, "dot m"), P(x, 40, 12.5));
  }

  const restLit = boats[3];
  let chosen;
  function light(b) {
    const next = b ?? restLit;
    if (next === chosen) return;
    if (chosen) chosen.hull.sil.classList.remove("hi");
    chosen = next;
    chosen.hull.sil.classList.add("hi");
  }
  light(null);

  const B = register(stage, (dt) => {
    let m = false;
    for (const b of boats) { if (stepS(b.sx, dt)) m = true; if (stepS(b.sy, dt)) m = true; drawBoat(b); }
    sortBoats();
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    let pick = null, bd = Infinity;
    for (const b of boats) {
      let tx = b.rx, ty = b.ry;
      if (over) {
        const dx = b.rx - over[0], dy = b.ry - over[1], d = Math.hypot(dx, dy);
        if (d < R) {
          // away from the pointer; straight across the basin when it is on top
          const ux = d > 0.5 ? dx / d : 0, uy = d > 0.5 ? dy / d : (b.ry < 18 ? 1 : -1);
          const push = PUSH * (1 - d / R);
          tx = clamp(b.rx + ux * push, 9, 111);
          ty = clamp(b.ry + uy * push, 4, 32);
        }
        // rule 01: pick by the boats' moorings, which never move
        if (d < bd) { bd = d; pick = b; }
      }
      b.sx.t = tx;
      b.sy.t = ty;
    }
    if (bd > 16) pick = null;
    light(pick);
    read.textContent = pick ? `barca ${pick.n}` : "rest";
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], -1.4); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { R = v; if (over) retarget(); }, destroy: bag.dispose };
}

export default {
  name: "navigli",
  means: "The Darsena: the pointer pushes the moored boats away across the water; they drift back when it leaves.",
  range: [14, 22, 32],
  mount,
};
