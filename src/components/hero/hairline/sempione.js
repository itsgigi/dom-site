// Hairline figure for a hero spot. Built with the hairline-create skill
// (github.com/lucasmarkes/hairline); exported as data for mountHairline.
/**
 * Sempione: the Arco della Pace as an exploded view, its main front (the
 * three openings) turned to the right, towards the Duomo. Five courses stack up:
 * the plinth, the block with its three round-headed openings, the cornice
 * with corner statues, the attic, and the bronze sestiga on top. The
 * pointer's x opens the gap between the courses, its y picks the course that
 * takes the bright stroke. At rest the courses already stand slightly apart
 * and the sestiga is the bright mark. The slider is the widest gap.
 */
import HL from '../../../vendor/hairline/kernel.js'

const {
  Cam, clamp, facing, fit, prism, proj, rings, rrect, ringAt, run, hull, poly, open,
  spring, stepS, mk, pointer, put, register, disposer, solid,
} = HL;

const NAMES = ["basamento", "fornici", "trabeazione", "attico", "sestiga"];
const REST_GAP = 2.5;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.7);
  fit(C, [[0, 0, 0], [28, 70, 0], [28, 0, 0], [0, 70, 0], [14, 35, 72 + 4 * 22]], 200, 166);
  const P = proj(C), front = facing(C);
  let MAX = value, over = null;
  const gap = spring(REST_GAP, { eps: 0.02 });
  const g = mk("g", {}, svg);

  const box = (el, x0, y0, x1, y1, r, b, z0, z1) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    put(el, prism(P, front, ring, inner, z0, z1));
  };
  const taper = (el, cx, cy, w0, w1, z0, z1) => {
    const sq = (w) => rrect(cx - w / 2, cy - w / 2, cx + w / 2, cy + w / 2, w * 0.3, 4);
    put(el, { sil: poly(hull(ringAt(P, sq(w0), z0).concat(ringAt(P, sq(w1), z1)))), crease: w1 > 2.4 ? open(ringAt(P, run(sq(w1 - 1.2), front), z1)) : "" });
  };
  // a round-headed opening, on the face y = fy (along x) or x = fx (along y)
  const arch = (c, w, z0, spring_, face, alongX) => {
    const r = w / 2, pts = [];
    const at = (a, z) => (alongX ? P(c + a, face, z) : P(face, c + a, z));
    pts.push(at(-r, z0), at(-r, spring_));
    for (let k = 1; k < 8; k++) { const a = Math.PI - (k / 8) * Math.PI; pts.push(at(Math.cos(a) * r, spring_ + Math.sin(a) * r)); }
    pts.push(at(r, spring_), at(r, z0));
    return open(pts);
  };

  // each course: its solids and face marks, redrawn at its own lift
  const S = () => solid(g), M = () => mk("path", { class: "lo nf" }, g);
  const courses = [
    { els: [S()], draw: ([a], z) => box(a, 0, 0, 28, 70, 2.4, 1.2, z, z + 4) },
    {
      els: [S(), M(), M(), M(), M(), M()],
      draw: ([a, f1, f2, f3, side, cols], z) => {
        box(a, 3, 3, 25, 67, 1.6, 1, z + 4, z + 40);
        f1.setAttribute("d", arch(35, 16, z + 4, z + 26, 25, false));
        f2.setAttribute("d", arch(15, 9, z + 4, z + 20, 25, false));
        f3.setAttribute("d", arch(55, 9, z + 4, z + 20, 25, false));
        side.setAttribute("d", arch(14, 9, z + 4, z + 20, 67, true));
        cols.setAttribute("d", [8, 24, 46, 62].map((x) => open([P(25, x, z + 6), P(25, x, z + 38)])).join(""));
      },
    },
    {
      els: [S(), S(), S()],
      draw: ([a, s1, s2], z) => {
        box(a, 1, 1, 27, 69, 1.6, 1, z + 40, z + 46);
        taper(s1, 5, 5, 3.4, 1.4, z + 46, z + 53);
        taper(s2, 5, 65, 3.4, 1.4, z + 46, z + 53);
      },
    },
    {
      els: [S(), S(), S()],
      draw: ([a, s3, s4], z) => {
        box(a, 6, 12, 22, 58, 1.4, 0.9, z + 46, z + 58);
        // the near corner statues stand on the cornice, so they ride its lift
        const zc = z - gap.x;
        taper(s3, 23, 5, 3.4, 1.4, zc + 46, zc + 53);
        taper(s4, 23, 65, 3.4, 1.4, zc + 46, zc + 53);
      },
    },
    {
      els: [S(), S(), S(), S()],
      draw: ([car, h1, h2, fig], z) => {
        box(car, 9, 29, 17, 41, 1.6, 0.8, z + 58, z + 63);
        box(h1, 18, 30, 21, 34, 1, 0.5, z + 58, z + 62);
        box(h2, 18, 36, 21, 40, 1, 0.5, z + 58, z + 62);
        taper(fig, 13, 35, 3, 0.4, z + 63, z + 72);
      },
    },
  ];

  let drawn = NaN;
  const lift = (k) => k * gap.x;
  function draw() {
    if (gap.x === drawn) return;
    drawn = gap.x;
    courses.forEach((c, k) => c.draw(c.els, lift(k)));
  }
  // rule 01: the course under the pointer, by where each one sits at rest
  const bands = courses.map((_, k) => P(14, 35, [2, 22, 43, 52, 64][k] + k * REST_GAP)[1]);

  // one bright course: the one under the pointer, or the sestiga at rest
  const hi = (i, v) => courses[i].els[0].sil.classList.toggle("hi", v);
  let lit = 4;
  hi(lit, true);
  function light(k) {
    const next = k < 0 ? 4 : k;
    if (next === lit) return;
    hi(lit, false);
    lit = next;
    hi(lit, true);
  }

  const B = register(stage, (dt) => { const m = stepS(gap, dt); draw(); return m; });
  bag.add(B.unregister);

  function retarget() {
    let k = -1;
    if (over) {
      gap.t = REST_GAP + clamp((over[0] - 90) / 220, 0, 1) * (MAX - REST_GAP);
      let bd = Infinity;
      bands.forEach((y, i) => { const d = Math.abs(y - over[1]); if (d < bd) { bd = d; k = i; } });
    } else gap.t = REST_GAP;
    light(k);
    read.textContent = k >= 0 ? NAMES[k] : "rest";
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => { over = p; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { MAX = v; if (over) retarget(); }, destroy: bag.dispose };
}

export default {
  name: "sempione",
  means: "The Arco della Pace in courses: the pointer's x opens the gaps, its y lights the course under it.",
  range: [8, 14, 22],
  mount,
};
