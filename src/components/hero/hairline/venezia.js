// Hairline figure for a hero spot. Built with the hairline-create skill
// (github.com/lucasmarkes/hairline); exported as data for mountHairline.
/**
 * Venezia: the two neoclassical toll houses of Porta Venezia, one either side
 * of the corso, and a tram on its rails between them. The pointer, read on
 * the ground, calls the tram along the corso on a spring; it runs through
 * the gate between the two caselli. At rest it waits short of the gate, and
 * it is the one bright mark. The slider is how far it follows the pointer.
 */
import HL from '../../../vendor/hairline/kernel.js'

const {
  Cam, clamp, facing, fit, prism, proj, rings, rrect, ringAt, run, hull, poly, open, lerp,
  unproj, spring, stepS, mk, pointer, put, register, disposer, solid,
} = HL;

const LEN = 150, REST_X = 28;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.95);
  fit(C, [[0, 10, 0], [LEN, 10, 0], [LEN, 86, 0], [0, 86, 0], [70, 48, 42]], 200, 166);
  const P = proj(C), front = facing(C);
  let follow = value, over = null;
  const g = mk("g", {}, svg);

  const box = (el, x0, y0, x1, y1, r, b, z0, z1) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    put(el, prism(P, front, ring, inner, z0, z1));
    return el;
  };
  const taper = (el, cx, cy, w0, w1, z0, z1) => {
    const sq = (w) => rrect(cx - w / 2, cy - w / 2, cx + w / 2, cy + w / 2, w * 0.3, 4);
    put(el, { sil: poly(hull(ringAt(P, sq(w0), z0).concat(ringAt(P, sq(w1), z1)))), crease: w1 > 2.4 ? open(ringAt(P, run(sq(w1 - 1.2), front), z1)) : "" });
  };
  const line = (cls, pts) => mk("path", { class: cls, d: open(pts.map((p) => P(...p))) }, g);

  // a casello: plinth, portico with its columns on the two faces we see,
  // cornice, upper floor, statues on the corners
  function casello(y0, y1) {
    box(solid(g), 56, y0 - 1, 86, y1 + 1, 2, 1, 0, 3);
    box(solid(g), 59, y0 + 2, 83, y1 - 2, 1.4, 0.9, 3, 20);
    for (let x = 62; x <= 80; x += 4.5) line("lo nf", [[x, y1 - 2, 4], [x, y1 - 2, 19]]);
    for (let y = y0 + 5; y <= y1 - 5; y += 4.5) line("lo nf", [[83, y, 4], [83, y, 19]]);
    box(solid(g), 57, y0, 85, y1, 1.6, 1, 20, 23);
    box(solid(g), 61, y0 + 4, 81, y1 - 4, 1.4, 0.9, 23, 33);
    for (const [x, y] of [[62.5, y0 + 5.5], [79.5, y0 + 5.5], [62.5, y1 - 5.5], [79.5, y1 - 5.5]]) taper(solid(g), x, y, 2.4, 0.4, 33, 40);
  }

  casello(12, 36);
  // the corso: kerbs and rails
  line("lo nf", [[0, 40, 0], [LEN, 40, 0]]);
  line("dash nf", [[0, 45, 0], [LEN, 45, 0]]);
  line("dash nf", [[0, 51, 0], [LEN, 51, 0]]);
  line("lo nf", [[0, 56, 0], [LEN, 56, 0]]);

  // the tram: body, roof, pantograph
  const tram = { body: solid(g), roof: solid(g), pole: mk("path", { class: "nf" }, g) };
  tram.body.sil.classList.add("hi");
  const pos = spring(REST_X, { eps: 0.05 });
  let drawn = NaN;
  function drawTram() {
    if (pos.x === drawn) return;
    drawn = pos.x;
    const x = pos.x;
    box(tram.body, x - 15, 44, x + 15, 52, 2.6, 1, 1.5, 10);
    box(tram.roof, x - 12, 45.5, x + 12, 50.5, 2, 0.8, 10, 11.5);
    tram.pole.setAttribute("d", open([P(x - 3, 48, 11.5), P(x, 48, 18), P(x + 3, 48, 11.5)]) + open([P(x - 3, 46, 18), P(x + 3, 50, 18)]));
  }
  casello(60, 84);

  const B = register(stage, (dt) => { const m = stepS(pos, dt); drawTram(); return m; });
  bag.add(B.unregister);

  function retarget() {
    if (over) {
      const target = clamp(over[0], 18, LEN - 18);
      pos.t = lerp(REST_X, target, follow);
      read.textContent = `tram ${Math.round((pos.t / LEN) * 100)}%`;
    } else {
      pos.t = REST_X;
      read.textContent = "rest";
    }
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { follow = v; if (over) retarget(); }, destroy: bag.dispose };
}

export default {
  name: "venezia",
  means: "The caselli of Porta Venezia: the pointer calls the tram along the corso, through the gate between them.",
  range: [0.45, 0.75, 1],
  mount,
};
