/*
 * Motor de figuras explicativas.
 * Muñeco articulado en SVG: cinemática directa (ángulos absolutos) + IK de dos
 * segmentos para fijar manos/pies en un punto (barra, suelo, silla...).
 *
 * Convención de ángulos (grados, coordenadas SVG con y hacia abajo):
 *   0 = hacia abajo, 90 = hacia delante (derecha), 180 = arriba, -90 = atrás.
 * Claves de una pose:
 *   t  tronco (cadera -> hombro)     n  cabeza (por defecto = t)
 *   ua/fa   brazo/antebrazo           ua2/fa2  brazo del fondo
 *   th/sn   muslo/espinilla           th2/sn2  pierna del fondo
 *   fd/fd2  dirección del pie
 *   an: [articulación, x, y]   fija esa articulación en ese punto
 *   ik: { ha:[x,y,signo], ha2, ft, ft2 }  manos/pies a un punto
 *   view: 'front'  vista frontal (ambos lados del mismo color)
 * El suelo está en y = 0.
 */
const Fig = (() => {
  const L = { torso: 46, neck: 15, head: 9, ua: 26, fa: 24, th: 34, sn: 33, foot: 9 };
  const R = Math.PI / 180;
  const dir = (a, l) => [Math.sin(a * R) * l, Math.cos(a * R) * l];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const len = v => Math.hypot(v[0], v[1]);
  const lerp = (a, b, u) => a + (b - a) * u;
  const ANG = ['t', 'n', 'ua', 'fa', 'ua2', 'fa2', 'th', 'sn', 'th2', 'sn2', 'fd', 'fd2'];

  function ik(root, target, l1, l2, bend) {
    const d = sub(target, root);
    const dist = len(d) || 0.001;
    const maxR = l1 + l2 - 0.01;
    const minR = Math.abs(l1 - l2) + 0.01;
    const D = Math.min(Math.max(dist, minR), maxR);
    const base = Math.atan2(d[1], d[0]);
    const cosA = (l1 * l1 + D * D - l2 * l2) / (2 * l1 * D);
    const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
    const ang = base + (bend || 1) * A;
    const mid = [root[0] + Math.cos(ang) * l1, root[1] + Math.sin(ang) * l1];
    const end = dist > maxR ? add(root, [d[0] / dist * maxR, d[1] / dist * maxR]) : target.slice(0, 2);
    return [mid, end];
  }

  // Rellena los valores por defecto para poder interpolar entre poses
  function normalize(p) {
    const q = { ...p };
    const front = q.view === 'front';
    const arm2Free = p.ua2 == null && p.fa2 == null;
    const leg2Free = p.th2 == null && p.sn2 == null;
    q.n = q.n ?? q.t;
    q.ua2 = q.ua2 ?? q.ua; q.fa2 = q.fa2 ?? q.fa;
    q.th2 = q.th2 ?? q.th; q.sn2 = q.sn2 ?? q.sn;
    q.fd = q.fd ?? (q.sn + 90);
    q.fd2 = q.fd2 ?? (p.fd != null && leg2Free ? q.fd : (front ? q.sn2 - 90 : q.sn2 + 90));
    if (p.ik) {
      q.ik = { ...p.ik };
      if (!front && arm2Free && q.ik.ha && !q.ik.ha2) q.ik.ha2 = q.ik.ha;
      if (!front && leg2Free && q.ik.ft && !q.ik.ft2) q.ik.ft2 = q.ik.ft;
    }
    return q;
  }

  function joints(p0) {
    const p = p0.__n ? p0 : normalize(p0);
    const front = p.view === 'front';
    const j = {};
    j.hip = [0, 0];
    j.sh = add(j.hip, dir(p.t, L.torso));
    j.head = add(j.sh, dir(p.n, L.neck + L.head));
    j.neck = add(j.sh, dir(p.n, L.neck - 3));
    const so = front ? 10 : 0, ho = front ? 6 : 0;
    j.s1 = add(j.sh, dir(p.t - 90, so)); j.s2 = add(j.sh, dir(p.t + 90, so));
    j.h1 = add(j.hip, dir(p.t - 90, ho)); j.h2 = add(j.hip, dir(p.t + 90, ho));
    j.el = add(j.s1, dir(p.ua, L.ua)); j.ha = add(j.el, dir(p.fa, L.fa));
    j.el2 = add(j.s2, dir(p.ua2, L.ua)); j.ha2 = add(j.el2, dir(p.fa2, L.fa));
    j.kn = add(j.h1, dir(p.th, L.th)); j.ft = add(j.kn, dir(p.sn, L.sn));
    j.kn2 = add(j.h2, dir(p.th2, L.th)); j.ft2 = add(j.kn2, dir(p.sn2, L.sn));
    j.toe = add(j.ft, dir(p.fd, L.foot)); j.toe2 = add(j.ft2, dir(p.fd2, L.foot));
    if (p.an) {
      const [name, x, y] = p.an;
      const off = sub([x, y], j[name]);
      for (const k in j) j[k] = add(j[k], off);
    }
    if (p.ik) {
      const I = p.ik;
      if (I.ha) { [j.el, j.ha] = ik(j.s1, I.ha, L.ua, L.fa, I.ha[2]); }
      if (I.ha2) { [j.el2, j.ha2] = ik(j.s2, I.ha2, L.ua, L.fa, I.ha2[2]); }
      if (I.ft) { [j.kn, j.ft] = ik(j.h1, I.ft, L.th, L.sn, I.ft[2]); j.toe = add(j.ft, dir(p.fd, L.foot)); }
      if (I.ft2) { [j.kn2, j.ft2] = ik(j.h2, I.ft2, L.th, L.sn, I.ft2[2]); j.toe2 = add(j.ft2, dir(p.fd2, L.foot)); }
    }
    return j;
  }

  function prep(p) { const q = normalize(p); q.__n = true; return q; }

  // Interpola dos poses: por ángulos si comparten anclaje, si no por posiciones
  function blend(a, b, u) {
    const sameAnchor = a.an && b.an && a.an[0] === b.an[0];
    const ikKeys = o => Object.keys(o.ik || {}).sort().join();
    if (sameAnchor && ikKeys(a) === ikKeys(b) && a.view === b.view) {
      const q = { __n: true, view: a.view };
      for (const k of ANG) q[k] = lerp(a[k], b[k], u);
      q.an = [a.an[0], lerp(a.an[1], b.an[1], u), lerp(a.an[2], b.an[2], u)];
      if (a.ik) {
        q.ik = {};
        for (const k in a.ik) {
          const A = a.ik[k], B = b.ik[k];
          q.ik[k] = [lerp(A[0], B[0], u), lerp(A[1], B[1], u), u < 0.5 ? A[2] : B[2]];
        }
      }
      return joints(q);
    }
    const ja = joints(a), jb = joints(b), j = {};
    for (const k in ja) j[k] = [lerp(ja[k][0], jb[k][0], u), lerp(ja[k][1], jb[k][1], u)];
    return j;
  }

  /* ---------- Dibujo ---------- */
  const f1 = n => Math.round(n * 10) / 10;
  const pts = (...ps) => ps.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ');

  function drawProp(pr, j) {
    switch (pr.k) {
      case 'floor': return `<line class="pf" x1="-600" y1="${pr.y || 0}" x2="600" y2="${pr.y || 0}"/>`;
      case 'wall': return `<line class="pw" x1="${pr.x}" y1="${pr.y1 ?? 0}" x2="${pr.x}" y2="${pr.y2 ?? -170}"/>`;
      case 'box': return `<rect class="pb" x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${pr.h}" rx="2"/>`;
      case 'chair': {
        const { x, y, w } = pr;
        return `<g class="pc"><line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}"/><line x1="${x + 2}" y1="${y}" x2="${x + 2}" y2="0"/><line x1="${x + w - 2}" y1="${y}" x2="${x + w - 2}" y2="0"/>${pr.back ? `<line x1="${x + (pr.back > 0 ? w - 2 : 2)}" y1="${y}" x2="${x + (pr.back > 0 ? w - 2 : 2)}" y2="${y - 40}"/>` : ''}</g>`;
      }
      case 'table': {
        const { x, y, w } = pr;
        return `<g class="pc"><line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" style="stroke-width:5"/><line x1="${x + 4}" y1="${y}" x2="${x + 4}" y2="0"/><line x1="${x + w - 4}" y1="${y}" x2="${x + w - 4}" y2="0"/></g>`;
      }
      case 'bar': return `<g class="pbar">${pr.post ? `<line class="ppost" x1="${pr.x}" y1="${pr.y}" x2="${pr.x}" y2="0"/>` : ''}<circle cx="${pr.x}" cy="${pr.y}" r="4"/></g>`;
      case 'rings': return `<g class="pring"><line x1="${pr.x}" y1="${pr.y - 70}" x2="${pr.x}" y2="${pr.y - 7}"/><circle cx="${pr.x}" cy="${pr.y}" r="6"/></g>`;
      case 'pbars': return `<g class="pc"><line x1="${pr.x1}" y1="${pr.y}" x2="${pr.x2}" y2="${pr.y}" style="stroke-width:5"/><line x1="${pr.x1 + 6}" y1="${pr.y}" x2="${pr.x1 + 6}" y2="0"/><line x1="${pr.x2 - 6}" y1="${pr.y}" x2="${pr.x2 - 6}" y2="0"/></g>`;
      case 'door': return `<g class="pdoor"><line x1="${pr.x}" y1="0" x2="${pr.x}" y2="-175"/><circle cx="${pr.x - 3}" cy="${pr.hy}" r="3"/></g>`;
      case 'band': {
        const to = typeof pr.to === 'string' ? j[pr.to] : pr.to;
        return `<line class="pband" x1="${pr.from[0]}" y1="${pr.from[1]}" x2="${f1(to[0])}" y2="${f1(to[1])}"/>`;
      }
      case 'pack': {
        const c = j[pr.at || 'sh'], h = j.hip;
        const m = [lerp(c[0], h[0], 0.4), lerp(c[1], h[1], 0.4)];
        return `<rect class="ppack" x="${f1(m[0] - 14)}" y="${f1(m[1] - 9)}" width="12" height="18" rx="3"/>`;
      }
      case 'arrow': {
        const { x1, y1, x2, y2 } = pr;
        const a = Math.atan2(y2 - y1, x2 - x1), s = 5;
        const p1 = [x2 - s * Math.cos(a - 0.5), y2 - s * Math.sin(a - 0.5)];
        const p2 = [x2 - s * Math.cos(a + 0.5), y2 - s * Math.sin(a + 0.5)];
        return `<g class="parrow"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><polygon points="${pts([x2, y2], p1, p2)}"/></g>`;
      }
    }
    return '';
  }

  function drawBody(j, front, props) {
    const back = front ? 'fb fb2' : 'fb';
    let s = '';
    for (const pr of props || []) if (pr.k === 'band' && typeof pr.to === 'string') s += drawProp(pr, j);
    s += `<polyline class="${back}" points="${pts(j.h2, j.kn2, j.ft2, j.toe2)}"/>`;
    s += `<polyline class="${back}" points="${pts(j.s2, j.el2, j.ha2)}"/>`;
    for (const pr of props || []) if (pr.k === 'pack') s += drawProp(pr, j);
    s += `<polyline class="ft" points="${pts(front ? j.h1 : j.hip, j.hip, j.h2)}"/>`;
    s += `<polyline class="ft tor" points="${pts(j.hip, j.sh, j.neck)}"/>`;
    if (front) s += `<polyline class="ft" points="${pts(j.s1, j.s2)}"/>`;
    s += `<polyline class="ff" points="${pts(j.h1, j.kn, j.ft, j.toe)}"/>`;
    s += `<polyline class="ff" points="${pts(j.s1, j.el, j.ha)}"/>`;
    s += `<circle class="fh" cx="${f1(j.head[0])}" cy="${f1(j.head[1])}" r="${L.head}"/>`;
    return s;
  }

  function bbox(spec) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const inc = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    const frames = spec.frames;
    const samples = [];
    frames.forEach((f, i) => {
      samples.push(joints(f));
      if (i < frames.length - 1) samples.push(blend(prep(f), prep(frames[i + 1]), 0.5));
    });
    for (const j of samples) for (const k in j) {
      const r = k === 'head' ? L.head + 2 : 4;
      inc(j[k][0] - r, j[k][1] - r); inc(j[k][0] + r, j[k][1] + r);
    }
    for (const pr of spec.props || []) {
      if (pr.k === 'floor') inc(x0, (pr.y || 0) + 2);
      else if (pr.k === 'wall') { inc(pr.x - 2, y0); inc(pr.x + 2, y1); }
      else if (pr.k === 'box' || pr.k === 'chair' || pr.k === 'table') { inc(pr.x, pr.y - (pr.back ? 40 : 0)); inc(pr.x + pr.w, pr.y + (pr.h || 0)); if (pr.k !== 'box') inc(pr.x, 2); }
      else if (pr.k === 'bar') { inc(pr.x - 6, pr.y - 6); inc(pr.x + 6, pr.y + 6); }
      else if (pr.k === 'rings') { inc(pr.x - 8, pr.y - 30); inc(pr.x + 8, pr.y + 8); }
      else if (pr.k === 'pbars') { inc(pr.x1, pr.y - 3); inc(pr.x2, 2); }
      else if (pr.k === 'door') { inc(pr.x - 5, Math.min(y0, pr.hy - 20)); inc(pr.x + 3, 2); }
      else if (pr.k === 'band' && Array.isArray(pr.from)) inc(pr.from[0], pr.from[1]);
    }
    const pad = 10;
    let w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
    // Proporción mínima para que no quede demasiado estrecha
    const minW = h * 0.9;
    let cx = (x0 + x1) / 2;
    if (w < minW) w = minW;
    const minH = w * 0.55;
    let cy = (y0 + y1) / 2;
    if (h < minH) { h = minH; }
    return [f1(cx - w / 2), f1(cy - h / 2), f1(w), f1(h)];
  }

  /* ---------- Animación ---------- */
  const registry = new Map(); // id -> spec
  const prepared = new Map();
  let live = [];
  let rafOn = false;
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function framesOf(id) {
    if (!prepared.has(id)) {
      const spec = registry.get(id);
      prepared.set(id, { spec, frames: spec.frames.map(prep), vb: bbox(spec) });
    }
    return prepared.get(id);
  }

  const smooth = u => u * u * (3 - 2 * u);

  function poseAt(P, time) {
    const { spec, frames } = P;
    const n = frames.length;
    if (n === 1) return joints(frames[0]);
    const cycle = spec.loop === 'cycle';
    const segs = cycle ? n : 2 * (n - 1);
    const w = spec.w ? spec.w.slice() : Array(segs).fill(1);
    if (!cycle && spec.w && spec.w.length === n - 1) for (let i = n - 2; i >= 0; i--) w.push(spec.w[i]);
    while (w.length < segs) w.push(1);
    const total = w.reduce((a, b) => a + b, 0);
    const dur = spec.dur || 1300 * segs;
    let tt = ((time % dur) / dur) * total;
    let i = 0;
    while (tt > w[i] && i < segs - 1) { tt -= w[i]; i++; }
    let u = tt / w[i];
    const hold = 0.22;
    u = u < hold ? 0 : Math.min(1, (u - hold) / (1 - hold));
    u = smooth(u);
    let a, b;
    if (cycle) { a = i; b = (i + 1) % n; } else if (i < n - 1) { a = i; b = i + 1; } else { a = segs - i; b = a - 1; }
    return blend(frames[a], frames[b], u);
  }

  function tick(now) {
    live = live.filter(o => o.el.isConnected);
    for (const o of live) {
      if (now - o.last < 33) continue;
      o.last = now;
      o.g.innerHTML = drawBody(poseAt(o.P, now - o.start), o.P.spec.frames[0].view === 'front', o.P.spec.props);
    }
    if (live.length) requestAnimationFrame(tick); else rafOn = false;
  }

  function define(id, spec) { registry.set(id, spec); prepared.delete(id); }
  function has(id) { return registry.has(id); }

  function svg(id, { animate = false, cls = '', frame = null } = {}) {
    if (!registry.has(id)) return `<svg class="fig ${cls}" viewBox="0 0 100 60"></svg>`;
    const P = framesOf(id);
    const spec = P.spec;
    const still = frame ?? spec.still ?? spec.frames.length - 1;
    const j = joints(P.frames[Math.min(still, P.frames.length - 1)]);
    const front = spec.frames[0].view === 'front';
    const propsHtml = (spec.props || []).filter(p => !(p.k === 'band' && typeof p.to === 'string') && p.k !== 'pack' && p.k !== 'arrow').map(p => drawProp(p, j)).join('');
    const arrows = (spec.props || []).filter(p => p.k === 'arrow').map(p => drawProp(p, j)).join('');
    const anim = animate && !reduce && spec.frames.length > 1;
    return `<svg class="fig ${cls}" viewBox="${P.vb.join(' ')}" preserveAspectRatio="xMidYMid meet" data-fig="${id}"${anim ? ' data-anim="1"' : ''} role="img" aria-label="Figura del ejercicio">${propsHtml}<g class="body">${drawBody(j, front, spec.props)}</g>${animate ? arrows : ''}</svg>`;
  }

  function activate(root) {
    (root || document).querySelectorAll('svg.fig[data-anim="1"]').forEach(el => {
      if (live.some(o => o.el === el)) return;
      const P = framesOf(el.dataset.fig);
      live.push({ el, g: el.querySelector('g.body'), P, start: performance.now(), last: 0 });
    });
    if (live.length && !rafOn) { rafOn = true; requestAnimationFrame(tick); }
  }

  /* ---------- Utilidades para construir poses ---------- */
  // Busca el valor del parámetro que minimiza el coste (búsqueda por fuerza bruta)
  function solve(fn, lo, hi, cost, step = 0.25) {
    let best = lo, bc = Infinity;
    for (let v = lo; v <= hi; v += step) {
      const c = cost(joints(fn(v)));
      if (c < bc) { bc = c; best = v; }
    }
    return best;
  }

  return { define, has, svg, activate, joints, solve, L, ids: () => [...registry.keys()] };
})();
