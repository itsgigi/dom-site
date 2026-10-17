// Hairline figure for a hero spot. Built with the hairline-create skill
// (github.com/lucasmarkes/hairline); exported as data for mountHairline.
/**
 * Brera: the Palazzo di Brera, four wings round a courtyard with its arcade
 * and Napoleon on his column in the middle, and on the north wing the
 * Specola, the observatory dome. The pointer, read on the ground, is the sky
 * the astronomers want: the dome turns its slit towards it on a spring and
 * runs its telescope out. At rest the slit looks over the courtyard and is
 * the bright mark. The slider is how far the telescope runs out.
 */
import HL from '../../../vendor/hairline/kernel.js'

const {
  Cam, facing, fit, prism, proj, rings, rrect, ringAt, hull, poly, open, run,
  unproj, spring, stepS, mk, pointer, put, register, disposer, solid,
} = HL;

const DX = 60, DY = 6, DR = 9, DZ = 31; // the dome: centre, radius, the top of its tower
const REST_ANGLE = 2.2;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 2.1);
  fit(C, [[0, 0, 0], [80, 0, 0], [80, 56, 0], [0, 56, 0], [DX, DY, DZ + 16]], 200, 166);
  const P = proj(C), front = facing(C);
  let reach = value, over = null;
  const g = mk("g", {}, svg);

  const box = (el, x0, y0, x1, y1, r, b, z0, z1) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    put(el, prism(P, front, ring, inner, z0, z1));
    return el;
  };
  const line = (cls, pts) => mk("path", { class: cls, d: open(pts.map((p) => P(...p))) }, g);
  const circle = (cx, cy, r) => rrect(cx - r, cy - r, cx + r, cy + r, r, 6);

  // far wings first: north (with the Specola on it) and west
  box(solid(g), 0, 0, 80, 11, 1.6, 1, 0, 22);
  box(solid(g), 0, 0, 11, 56, 1.6, 1, 0, 22);
  // the drum and the dome, then the slit and the telescope, redrawn as it turns
  box(solid(g), DX - 10, DY - 6, DX + 10, DY + 10, 1.6, 1, 22, DZ);
  box(solid(g), DX - DR, DY - DR + 2, DX + DR, DY + DR + 2, DR, 1, DZ, DZ + 3);
  const dome = solid(g);
  put(dome, {
    sil: poly(hull([[DR, 3], [DR * 0.86, 7], [DR * 0.55, 11], [2.6, 13]].flatMap(([r, z]) => ringAt(P, circle(DX, DY + 2, r), DZ + z)))),
    crease: open(ringAt(P, run(circle(DX, DY + 2, 2), front), DZ + 13)),
  });
  const slit = mk("path", { class: "hi nf" }, g);
  const scope = mk("path", { class: "nf" }, g);

  // the courtyard: arcade on the two inner faces we see, Napoleon's column
  for (let x = 15; x <= 66; x += 6) line("lo nf", [[x, 11, 0], [x, 11, 9]]);
  for (let y = 15; y <= 42; y += 6) line("lo nf", [[11, y, 0], [11, y, 9]]);
  line("lo nf", [[11, 11, 9], [69, 11, 9]]);
  line("lo nf", [[11, 11, 9], [11, 45, 9]]);
  box(solid(g), 37, 25, 43, 31, 1, 0.5, 0, 3);
  box(solid(g), 39, 27, 41, 29, 1, 0.4, 3, 12);
  // near wings last: east and south
  box(solid(g), 69, 0, 80, 56, 1.6, 1, 0, 22);
  box(solid(g), 0, 45, 80, 56, 1.6, 1, 0, 22);

  const ang = spring(REST_ANGLE, { eps: 0.002 }), ext = spring(0, { eps: 0.02 });
  let drawn = "", behind = false;
  function drawDome() {
    const key = ang.x.toFixed(4) + ext.x.toFixed(3);
    if (key === drawn) return;
    drawn = key;
    const c = Math.cos(ang.x), s = Math.sin(ang.x), cy = DY + 2;
    // the slit: two edges up the dome's face, drum to crown, opening as the
    // telescope runs out
    const edge = (da) => {
      const ca = Math.cos(ang.x + da), sa = Math.sin(ang.x + da), pts = [];
      for (let k = 0; k <= 6; k++) {
        const t = (k / 6) * (Math.PI / 2), r = (DR - 0.2) * Math.cos(t) + 2.4 * Math.sin(t);
        pts.push(P(DX + ca * r, cy + sa * r, DZ + 3 + 10 * Math.sin(t)));
      }
      return open(pts);
    };
    const half = 0.1 + ext.x * 0.025;
    slit.setAttribute("d", edge(-half) + edge(half));
    const L = 2 + ext.x * 1.6;
    scope.setAttribute("d", open([P(DX + c * 2, cy + s * 2, DZ + 7), P(DX + c * (DR + L), cy + s * (DR + L), DZ + 7 + L * 0.9)]));
    // facing away (the viewer is towards +x +y): paint them behind the dome (rule 06)
    const back = c + s < -0.2;
    if (back !== behind) {
      behind = back;
      if (back) dome.g.before(slit, scope);
      else dome.g.after(slit, scope);
    }
  }

  const B = register(stage, (dt) => {
    let m = stepS(ang, dt);
    if (stepS(ext, dt)) m = true;
    drawDome();
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    if (over) {
      const want = Math.atan2(over[1] - DY - 2, over[0] - DX);
      // turn the short way round from where the dome is headed
      let d = want - ang.t;
      d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
      ang.t += d;
      ext.t = reach;
      const deg = ((Math.round((want * 180) / Math.PI) % 360) + 360) % 360;
      read.textContent = `az ${deg}°`;
    } else {
      let d = REST_ANGLE - ang.t;
      d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
      ang.t += d;
      ext.t = 0;
      read.textContent = "rest";
    }
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 22); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { reach = v; if (over) retarget(); }, destroy: bag.dispose };
}

export default {
  name: "brera",
  means: "Palazzo di Brera: the Specola's dome turns its slit towards the pointer and runs its telescope out.",
  range: [4, 8, 13],
  mount,
};
