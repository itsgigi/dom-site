// Hairline figure for a hero spot. Built with the hairline-create skill
// (github.com/lucasmarkes/hairline); exported as data for mountHairline.
/**
 * Monumentale: the Famedio, its striped front, arcaded wings and the dome
 * over its central pavilion, and in front of it an avenue of chapels and
 * obelisks, each with a grave light at its foot. The pointer, read on the
 * ground, lights the lights it passes; each fades back on its own, so a walk
 * leaves a trail. At rest one light burns before the Famedio. The slider is
 * how long a light stays lit.
 */
import HL from '../../../vendor/hairline/kernel.js'

const {
  Cam, facing, fit, prism, proj, rings, rrect, ringAt, run, hull, poly, open,
  unproj, flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const COLS = 7, ROWS = 4, REACH = 17;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.95);
  fit(C, [[8, -4, 0], [92, -4, 0], [92, 70, 0], [8, 70, 0], [50, 7, 42]], 200, 166);
  const P = proj(C), front = facing(C);
  let glow = value, over = null;
  const g = mk("g", {}, svg);

  const box = (x0, y0, x1, y1, r, b, z0, z1) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    const el = solid(g);
    put(el, prism(P, front, ring, inner, z0, z1));
    return el;
  };
  const sq = (cx, cy, w) => rrect(cx - w / 2, cy - w / 2, cx + w / 2, cy + w / 2, w * 0.3, 4);
  const taper = (foot, top, z0, z1, crease = false) => {
    const el = solid(g);
    put(el, { sil: poly(hull(ringAt(P, foot, z0).concat(ringAt(P, top, z1)))), crease: crease ? open(ringAt(P, run(top, front), z1)) : "" });
    return el;
  };
  const line = (cls, pts) => mk("path", { class: cls, d: pts.map((p) => open(p.map((q) => P(...q)))).join("") }, g);
  const arch = (cx, y, w, z0, spring) => {
    const r = w / 2, pts = [[cx - r, y, z0], [cx - r, y, spring]];
    for (let k = 1; k < 8; k++) { const a = Math.PI - (k / 8) * Math.PI; pts.push([cx + Math.cos(a) * r, y, spring + Math.sin(a) * r]); }
    pts.push([cx + r, y, spring], [cx + r, y, z0]);
    return pts;
  };

  // the Famedio: wings with arcades, the striped pavilion, drum, dome, lantern
  box(10, 0, 90, 12, 1.6, 1, 0, 15);
  line("lo nf", [10, 18, 26, 74, 82].map((x) => arch(x + 4, 12, 5, 1, 9)));
  box(38, -3, 62, 15, 1.6, 1, 0, 23);
  line("lo nf", [5, 9, 13, 17, 21].map((z) => [[38, 15, z], [62, 15, z]]).concat([arch(50, 15, 8, 0, 12)]));
  box(43, 1, 57, 13, 7, 1, 23, 28);
  taper(rrect(43, 1, 57, 13, 7, 6), rrect(47.5, 5.5, 52.5, 10.5, 2.5, 4), 28, 37, true);
  taper(sq(50, 7, 2.4), sq(50, 7, 0.3), 37, 42);

  // the avenue: chapels and obelisks, back to front, each with a light
  const lights = [];
  for (let s = 0; s <= COLS + ROWS - 2; s++) for (let i = 0; i < COLS; i++) {
    const j = s - i;
    if (j < 0 || j >= ROWS) continue;
    const x = 16 + i * 11, y = 26 + j * 12;
    if ((i + j) % 3 === 0) {
      box(x - 1.6, y - 1.6, x + 1.6, y + 1.6, 0.8, 0.4, 0, 2);
      taper(sq(x, y, 2.4), sq(x, y, 0.4), 2, 13);
    } else {
      box(x - 3.5, y - 2.5, x + 3.5, y + 2.5, 1, 0.6, 0, 7);
      const a = P(x - 3, y, 10), b = P(x + 3, y, 10);
      put(solid(g), { sil: poly(hull(ringAt(P, rrect(x - 3.5, y - 2.5, x + 3.5, y + 2.5, 1, 4), 7).concat([a, b]))), crease: open([a, b]) });
    }
    const dot = flatDot(g, C, 1.5, "dot off");
    place(dot, P(x, y + 4.2, 0));
    lights.push({ i, j, x, y: y + 4.2, dot, v: 0, cls: "dot off" });
  }
  const restLight = lights.find((l) => l.i === 3 && l.j === 0);
  restLight.v = 1;

  const show = (l) => {
    const cls = l.v > 0.55 ? "dot" : l.v > 0.2 ? "dot m" : "dot off";
    if (cls !== l.cls) { l.cls = cls; l.dot.setAttribute("class", cls); }
  };
  const B = register(stage, (dt) => {
    let m = false;
    if (over) { warm(); m = true; } // a held pointer keeps the lights under it lit
    for (const l of lights) {
      if (l === restLight && !over) l.v = 1;
      else if (l.v > 0) { l.v = Math.max(0, l.v - dt / glow); m = true; }
      show(l);
    }
    return m;
  });
  bag.add(B.unregister);

  function warm() {
    for (const l of lights) {
      const d = Math.hypot(l.x - over[0], l.y - over[1]);
      if (d < REACH) l.v = Math.max(l.v, 1 - (d / REACH) * 0.75);
    }
  }
  function excite() {
    warm();
    let near = null, bd = Infinity;
    for (const l of lights) {
      const d = Math.hypot(l.x - over[0], l.y - over[1]);
      if (d < bd) { bd = d; near = l; }
    }
    read.textContent = bd < 9 ? `tomba ${near.i + 1}·${near.j + 1}` : "rest";
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); excite(); },
    leave: () => { over = null; read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { glow = v; }, destroy: bag.dispose };
}

export default {
  name: "monumentale",
  means: "The Monumentale: the pointer lights the grave lights it passes along the avenue, and each fades back.",
  range: [0.8, 1.6, 3],
  mount,
};
