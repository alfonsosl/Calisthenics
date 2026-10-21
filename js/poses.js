/* Definición de las figuras de cada ejercicio (ver convenciones en figures.js) */
(() => {
  const J = Fig.joints;
  const floor = { k: 'floor' };
  const def = Fig.define;
  const S = (o = {}) => ({ t: 180, ua: 4, fa: 6, th: 0, sn: 0, fd: 90, an: ['ft', 0, 0], ...o });
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  /* ---------------- Empuje horizontal ---------------- */
  function pushup({ handH = 0, footH = 0, knees = false, lean = 0, botH = 21, oneArm = false, wide = 0, rings = false, extra = {} } = {}) {
    const mk = a => {
      const base = knees
        ? { t: 90 + a, th: a - 90, sn: -125, fd: -150, ua: 0, fa: 0, an: ['kn', 0, -footH - 3] }
        : { t: 90 + a, th: a - 90, sn: a - 90, fd: 12, ua: 0, fa: 0, an: ['toe', 0, -footH] };
      if (oneArm) { base.ua2 = a - 80; base.fa2 = a + 160; }
      return { ...base, ...extra };
    };
    const topH = Math.sqrt(Math.max(49 * 49 - lean * lean, 100));
    const aTop = Fig.solve(mk, -40, 85, j => Math.abs(j.sh[1] + handH + topH));
    const aBot = Fig.solve(mk, -50, 85, j => Math.abs(j.sh[1] + handH + botH));
    const jt = J(mk(aTop));
    const hand = [jt.sh[0] - lean + 3, -handH, 1];
    const ikk = oneArm ? { ha: hand } : wide ? { ha: hand, ha2: [hand[0] + wide, hand[1], 1] } : { ha: hand };
    const top = { ...mk(aTop), ik: ikk };
    const bot = { ...mk(aBot), ik: ikk };
    const props = [floor];
    if (handH && !rings) props.push({ k: 'box', x: hand[0] - 16, y: -handH, w: 36, h: handH });
    if (rings) props.push({ k: 'rings', x: hand[0], y: -handH });
    if (footH) props.push({ k: 'box', x: -26, y: -footH, w: 38, h: footH });
    return { frames: [top, bot], props };
  }
  def('wall_pushup', (() => {
    const mk = p => ({ t: 180 - p, th: -p, sn: -p, fd: 90, ua: 90, fa: 90, an: ['ft', 0, 0] });
    const W = J(mk(16)).sh[0] + 47;
    const ikk = { ha: [W, -100, 1] };
    return { frames: [{ ...mk(16), ik: ikk }, { ...mk(29), ik: ikk }], props: [floor, { k: 'wall', x: W + 2 }] };
  })());
  def('incline_pushup', pushup({ handH: 45 }));
  def('knee_pushup', pushup({ knees: true }));
  def('pushup', pushup());
  def('diamond_pushup', pushup({ lean: 6, botH: 19 }));
  def('decline_pushup', pushup({ footH: 38 }));
  def('ring_pushup', pushup({ handH: 12, rings: true }));
  def('archer_pushup', pushup({ wide: 34 }));
  def('pseudo_planche_pushup', pushup({ lean: 20, botH: 19 }));
  def('one_arm_pushup_incline', pushup({ handH: 45, oneArm: true }));
  def('one_arm_pushup', pushup({ oneArm: true, botH: 20 }));

  /* ---------------- Empuje vertical ---------------- */
  function pike(footH = 0) {
    const legA = footH ? -62 : -27;
    const mk = t => ({ t, th: legA, sn: legA, fd: 25, ua: 0, fa: 0, an: ['toe', 0, -footH] });
    const tTop = Fig.solve(mk, 5, 100, j => Math.abs(j.sh[1] + 47));
    const tBot = Fig.solve(mk, -20, 90, j => Math.abs(j.head[1] + 11));
    const jt = J(mk(tTop));
    const ikk = { ha: [jt.sh[0] - 4, 0, 1] };
    const props = [floor];
    if (footH) props.push({ k: 'box', x: -24, y: -footH, w: 36, h: footH });
    return { frames: [{ ...mk(tTop), ik: ikk }, { ...mk(tBot), ik: ikk }], props };
  }
  def('pike_pushup', pike());
  def('elevated_pike_pushup', pike(40));
  function hs(o = {}) { return { t: -3, ua: 0, fa: 0, th: 183, sn: 183, fd: 273, an: ['ha', 0, 0], ...o }; }
  def('wall_handstand', (() => {
    const a = hs(), b = hs({ t: -5, th: 185, sn: 185 });
    const j = J(a);
    return { frames: [a, b], props: [floor, { k: 'wall', x: Math.min(j.toe[0], j.toe2[0]) - 2, y2: -190 }], dur: 3000 };
  })());
  function hspu(depth) {
    const mk = (sy, t) => ({ t, ua: 0, fa: 0, th: 183, sn: 183, fd: 273, an: ['sh', 2, sy], ik: { ha: [0, 0, 1] } });
    const a = mk(-49, -3), b = mk(depth, -6);
    const j = J(a);
    const props = [floor, { k: 'wall', x: Math.min(j.toe[0], j.toe2[0]) - 2, y2: -190 }];
    return { frames: [a, b], props, w: [2, 1] };
  }
  def('wall_hspu_partial', hspu(-33));
  def('wall_hspu', hspu(-21));
  def('deficit_hspu', (() => {
    const mk = (sy, t) => ({ t, ua: 0, fa: 0, th: 183, sn: 183, fd: 273, an: ['sh', 2, sy], ik: { ha: [0, -12, 1] } });
    const a = mk(-61, -3), b = mk(-24, -6);
    const j = J(a);
    return { frames: [a, b], props: [floor, { k: 'box', x: -8, y: -12, w: 16, h: 12 }, { k: 'wall', x: Math.min(j.toe[0], j.toe2[0]) - 2, y2: -200 }], w: [2, 1] };
  })());
  def('handstand', (() => ({ frames: [hs({ t: 0, th: 180, sn: 180, fd: 270 }), hs({ t: 3, th: 177, sn: 177, fd: 267 })], props: [floor], dur: 3200 }))());

  /* ---------------- Fondos ---------------- */
  function benchDip(straight) {
    const mk = straight
      ? a => ({ t: 180, ua: 0, fa: 0, th: a, sn: a, fd: 180, an: ['ft', 82, -3] })
      : a => ({ t: 180, ua: 0, fa: 0, th: a, sn: 0, fd: 90, an: ['ft', 64, 0] });
    const A = straight ? [48, 70] : [60, 106];
    const jt = J(mk(A[0]));
    const hand = [jt.hip[0] - 9, -48, 1];
    const ikk = { ha: hand };
    return { frames: [{ ...mk(A[0]), ik: ikk }, { ...mk(A[1]), t: 176, ik: ikk }], props: [floor, { k: 'chair', x: hand[0] - 34, y: -48, w: 38, back: -1 }] };
  }
  def('bench_dip_bent', benchDip(false));
  def('bench_dip', benchDip(true));
  function pdip({ rings = false, pack = false } = {}) {
    const by = -92;
    const mk = (sx, sy, t) => ({ t, ua: 0, fa: 0, th: 14, sn: -68, fd: 10, an: ['sh', sx, sy], ik: { ha: [-2, by, 1] } });
    const props = [floor, rings ? { k: 'rings', x: -2, y: by } : { k: 'pbars', x1: -42, x2: 38, y: by }];
    if (pack) props.push({ k: 'pack' });
    return { frames: [mk(0, by - 49, 174), mk(13, by - 22, 156)], props };
  }
  def('dip_negative', { ...pdip(), w: [3, 1] });
  def('dip', pdip());
  def('ring_dip', pdip({ rings: true }));
  def('weighted_dip', pdip({ pack: true }));

  /* ---------------- Tracción vertical ---------------- */
  const BY = -190;
  function hang(sx, sy, o = {}) { return { t: 177, n: 180, ua: 180, fa: 180, th: 6, sn: -18, fd: 20, an: ['sh', sx, sy], ik: { ha: [0, BY, 1] }, ...o }; }
  const barP = [{ k: 'bar', x: 0, y: BY }];
  def('dead_hang', { frames: [hang(-2, BY + 49), hang(-2, BY + 49, { th: 3, sn: -12 })], props: barP, dur: 3000 });
  def('scap_pull', { frames: [hang(-2, BY + 49), hang(-4, BY + 43, { t: 174 })], props: barP });
  def('pullup_negative', { frames: [hang(-9, BY + 13, { t: 168, n: 186, th: 12, sn: -26 }), hang(-2, BY + 49)], props: barP, w: [3, 1] });
  def('band_pullup', { frames: [hang(-2, BY + 49, { th: 0, sn: -70 }), hang(-9, BY + 13, { t: 168, n: 186, th: 4, sn: -72 })], props: [...barP, { k: 'band', from: [0, BY], to: 'kn' }] });
  def('chinup', { frames: [hang(-2, BY + 49), hang(-9, BY + 13, { t: 168, n: 186, th: 12, sn: -26 })], props: barP });
  def('pullup', { frames: [hang(-2, BY + 49), hang(-9, BY + 13, { t: 168, n: 186, th: 12, sn: -26 })], props: barP });
  def('lsit_pullup', { frames: [hang(-2, BY + 49, { th: 88, sn: 88, fd: 120 }), hang(-9, BY + 13, { t: 168, n: 186, th: 92, sn: 92, fd: 120 })], props: barP });
  def('archer_pullup', { frames: [hang(-2, BY + 49), hang(-12, BY + 16, { t: 166, n: 186, th: 12, sn: -26, ik: { ha: [0, BY, 1], ha2: [26, BY, 1] } })], props: [...barP, { k: 'bar', x: 26, y: BY }] });
  def('weighted_pullup', { frames: [hang(-2, BY + 49), hang(-9, BY + 13, { t: 168, n: 186, th: 12, sn: -26 })], props: [...barP, { k: 'pack' }] });
  def('muscle_up', {
    frames: [
      hang(-3, BY + 49),
      hang(-14, BY + 10, { t: 160, n: 175, th: 30, sn: 5 }),
      hang(4, BY - 12, { t: 196, n: 200, th: 20, sn: -10 }),
      hang(3, BY - 49, { t: 182, n: 182, th: 6, sn: -14 }),
    ], props: barP, dur: 5200,
  });
  def('band_pulldown', (() => {
    const mk = hand => ({ t: 180, ua: 180, fa: 180, th: 0, sn: -90, fd: -100, an: ['kn', 0, -3], ik: { ha: hand } });
    return { frames: [mk([10, -152, 1]), mk([16, -108, 1])], props: [floor, { k: 'band', from: [34, -200], to: 'ha' }, { k: 'door', x: 40, hy: -200 }] };
  })());
  // Tumbado boca abajo con el pecho algo elevado: brazos estirados al frente -> codos a las costillas
  def('prone_pulldown', {
    frames: [
      { view: 'top', t: 180, ua: 158, fa: 164, ua2: -158, fa2: -164, th: 4, sn: 2, th2: -4, sn2: -2, fd: 180, fd2: 180, an: ['hip', 0, 0] },
      { view: 'top', t: 180, ua: 58, fa: 150, ua2: -58, fa2: -150, th: 4, sn: 2, th2: -4, sn2: -2, fd: 180, fd2: 180, an: ['hip', 0, 0] },
    ], props: [{ k: 'mat', x: -46, y: -120, w: 92, h: 200 }, { k: 'towel' }], caption: 'Vista desde arriba: brazos en Y → codos a las costillas (W)',
  });

  /* ---------------- Tracción horizontal ---------------- */
  function row({ kind = 'bar', footH = 0, bent = false } = {}) {
    const by = kind === 'table' ? -66 : -64;
    const hx = 0;
    let top, bot;
    if (!bent) {
      const mk = a => ({ t: 90 + a, n: 90 + a, th: a - 90, sn: a - 90, fd: 175, ua: 90, fa: 90, an: ['ft', -104, -footH - 4] });
      const aT = Fig.solve(mk, -10, 70, j => Math.abs(dist(j.sh, [hx, by]) - 15) + (j.sh[1] > by ? 0 : 100));
      const aB = Fig.solve(mk, -10, 70, j => Math.abs(dist(j.sh, [hx, by]) - 49) + (j.sh[1] > by ? 0 : 100));
      const ikk = { ha: [hx, by, -1] };
      top = { ...mk(aT), ik: ikk }; bot = { ...mk(aB), ik: ikk };
    } else {
      const mk = (sx, sy, t) => ({ t, n: t, ua: 90, fa: 90, th: 0, sn: 0, fd: 90, an: ['sh', sx, sy], ik: { ha: [hx, by, -1], ft: [-66, -4, 1] } });
      top = mk(-8, by + 14, 116); bot = mk(-3, by + 49, 103);
    }
    const props = [floor];
    if (kind === 'bar') props.push({ k: 'bar', x: hx, y: by, post: true });
    if (kind === 'rings') props.push({ k: 'rings', x: hx, y: by });
    if (kind === 'table') props.push({ k: 'table', x: -70, y: by, w: 74 });
    if (footH) props.push({ k: 'box', x: -124, y: -footH, w: 36, h: footH });
    return { frames: [bot, top], props };
  }
  def('door_row', (() => {
    const H = [48, -94];
    const mk = p => ({ t: 180 + p, th: p, sn: p, fd: 90, ua: 90, fa: 90, an: ['ft', 26, 0], ik: { ha: [H[0], H[1], 1] } });
    const pB = Fig.solve(mk, 0, 40, j => Math.abs(dist(j.sh, H) - 49));
    return { frames: [mk(pB), mk(3)], props: [floor, { k: 'door', x: 52, hy: H[1] }] };
  })());
  def('table_row', row({ kind: 'table', bent: true }));
  def('australian_row_bent', row({ bent: true }));
  def('australian_row', row());
  def('australian_row_elevated', row({ footH: 34 }));
  def('ring_row', row({ kind: 'rings' }));
  def('archer_row', row({ kind: 'rings', footH: 34 }));
  def('tuck_front_lever_row', (() => {
    const mk = (sx, sy) => ({ t: 90, n: 92, ua: 180, fa: 180, th: 140, sn: -70, fd: -160, an: ['sh', sx, sy], ik: { ha: [0, BY, -1] } });
    return { frames: [mk(-18, BY + 46), mk(-6, BY + 14)], props: barP };
  })());

  /* ---------------- Piernas: sentadilla ---------------- */
  const sqTop = S({ ua: 2, fa: 4 });
  const sqBot = { t: 142, ua: 92, fa: 92, th: 82, sn: -24, fd: 90, an: ['ft', 0, 0] };
  def('chair_squat', (() => {
    const bot = { ...sqBot, th: 74, sn: -20, t: 146 };
    const h = J(bot).hip;
    return { frames: [sqTop, bot], props: [floor, { k: 'chair', x: h[0] - 34, y: h[1] + 9, w: 34, back: -1 }] };
  })());
  def('squat', { frames: [sqTop, sqBot], props: [floor] });
  def('pause_squat', { frames: [sqTop, sqBot], props: [floor], w: [1, 1.6] });
  def('jump_squat', { frames: [sqTop, { ...sqBot, ua: -30, fa: -20 }, S({ an: ['ft', 0, -20], fd: 40, ua: 170, fa: 172 })], props: [floor], loop: 'cycle', dur: 2400 });
  def('deep_squat_hold', { frames: [{ ...sqBot, th: 95, sn: -38, t: 150, ua: 60, fa: 120 }], props: [floor] });
  def('bulgarian_squat', (() => {
    const tg = [-58, -44, -1];
    const top = S({ t: 178, th: 6, sn: -3, ik: { ft2: tg }, fd2: -70 });
    const bot = { t: 166, ua: 4, fa: 6, th: 80, sn: -18, fd: 90, fd2: -70, an: ['ft', 0, 0], ik: { ft2: tg } };
    return { frames: [top, bot], props: [floor, { k: 'chair', x: -84, y: -42, w: 34, back: -1 }] };
  })());
  def('split_squat', (() => {
    const tg = [-56, -8, -1];
    const top = S({ t: 180, th: 8, sn: -3, ik: { ft2: tg }, fd2: 40 });
    const bot = { t: 176, ua: 4, fa: 6, th: 84, sn: -10, fd: 90, fd2: 40, an: ['ft', 0, 0], ik: { ft2: tg } };
    return { frames: [top, bot], props: [floor] };
  })());
  def('cossack_squat', (() => {
    const a = { view: 'front', t: 180, ua: -10, fa: -50, ua2: 10, fa2: 50, th: 30, sn: 30, th2: -30, sn2: -30, an: ['ft', 40, 0], ik: { ft2: [-40, 0, 1] } };
    const b = { view: 'front', t: 174, ua: -20, fa: -60, ua2: 0, fa2: 40, th: 82, sn: -8, th2: -60, sn2: -60, an: ['ft', 40, 0], ik: { ft2: [-40, 0, 1] } };
    return { frames: [a, b], props: [floor] };
  })());
  def('box_pistol', (() => {
    const top = S({ t: 178, th2: 50, sn2: 55, fd2: 140, ua: 90, fa: 90 });
    const bot = { t: 138, ua: 92, fa: 92, th: 96, sn: -32, fd: 90, th2: 82, sn2: 84, fd2: 160, an: ['ft', 0, 0] };
    const h = J(bot).hip;
    return { frames: [top, bot], props: [floor, { k: 'box', x: h[0] - 30, y: h[1] + 9, w: 30, h: -h[1] - 9 }] };
  })());
  def('pistol_squat', {
    frames: [S({ t: 178, th2: 50, sn2: 55, fd2: 140, ua: 90, fa: 90 }), { t: 134, ua: 92, fa: 92, th: 104, sn: -38, fd: 90, th2: 88, sn2: 88, fd2: 165, an: ['ft', 0, 0] }],
    props: [floor],
  });
  def('shrimp_squat', {
    frames: [S({ t: 178, th2: -8, sn2: -120, fd2: -40, ua: 90, fa: 90 }), { t: 140, ua: 92, fa: 92, th: 98, sn: -34, fd: 90, th2: -22, sn2: -96, fd2: -60, an: ['ft', 0, 0] }],
    props: [floor],
  });

  /* ---------------- Piernas: bisagra y gemelos ---------------- */
  function bridge({ single = false, shoulderY = -5, bench = false } = {}) {
    const lo = bench ? -128 : -90, hi = bench ? -90 : -64;
    const base = t => ({ t, n: t - 4, ua: bench ? -120 : 90, fa: bench ? -120 : 90, th: 140, sn: 14, fd: 90, an: ['sh', 0, shoulderY] });
    const ft = J(bench ? { ...base(hi) } : base(lo)).ft;
    const tg = [ft[0] + (bench ? 2 : 0), bench ? -4 : ft[1], -1];
    const extra = single ? { th2: 128, sn2: 128, fd2: 200 } : {};
    const mk = t => ({ ...base(t), ...extra, ik: { ft: [bench ? 66 : tg[0], tg[1], -1] } });
    const props = [floor];
    if (bench) props.push({ k: 'box', x: -36, y: shoulderY + 4, w: 32, h: -shoulderY - 4 });
    return { frames: [mk(lo), mk(hi)], props };
  }
  def('glute_bridge', bridge());
  def('single_leg_bridge', bridge({ single: true }));
  def('single_leg_hip_thrust', bridge({ single: true, bench: true, shoulderY: -46 }));
  def('sl_rdl', {
    frames: [S({ t: 178, th2: -6, sn2: -30, fd2: 60 }), { t: 94, n: 98, ua: 2, fa: 2, th: -6, sn: 6, fd: 90, th2: -86, sn2: -86, fd2: 0, an: ['ft', 0, 0] }],
    props: [floor],
  });
  function nordic(w) {
    const mk = (th, ua, fa) => ({ t: th + 180, n: th + 182, ua, fa, th, sn: -90, fd: -170, an: ['kn', 0, -4] });
    return { frames: [mk(0, 50, 150), mk(-62, 70, 75)], props: [floor, { k: 'box', x: -52, y: -34, w: 26, h: 22 }], w };
  }
  def('nordic_negative', nordic([3, 1]));
  def('nordic_curl', nordic([1.5, 1.5]));
  def('calf_raise', { frames: [S({ an: ['toe', 8, 0], fd: 90 }), S({ an: ['toe', 8, 0], fd: 32 })], props: [floor] });
  def('sl_calf_raise', {
    frames: [S({ an: ['toe', 8, -16], fd: 112, th2: 0, sn2: -70, fd2: 30, ua: 30, fa: 70 }), S({ an: ['toe', 8, -16], fd: 32, th2: 0, sn2: -70, fd2: 30, ua: 30, fa: 70 })],
    props: [floor, { k: 'box', x: -6, y: -16, w: 40, h: 16 }],
  });

  /* ---------------- Core ---------------- */
  const plankMk = a => ({ t: 90 + a, n: 90 + a, th: a - 90, sn: a - 90, fd: 12, ua: 0, fa: 90, an: ['toe', 0, 0] });
  const aPl = Fig.solve(plankMk, 0, 40, j => Math.abs(j.el[1] + 3));
  def('plank', { frames: [plankMk(aPl)], props: [floor] });
  def('side_plank', (() => {
    const mk = a => ({ view: 'front', t: 90 + a, n: 90 + a, ua: 0, fa: 70, ua2: 180, fa2: 180, th: a - 90, sn: a - 90, th2: a - 90, sn2: a - 90, fd: a, fd2: a, an: ['ft', 0, 0] });
    const a = Fig.solve(mk, 0, 45, j => Math.abs(j.el[1] + 3));
    return { frames: [mk(a)], props: [floor] };
  })());
  def('dead_bug', {
    frames: [
      { t: -90, n: -94, ua: 180, fa: 180, ua2: -100, fa2: -100, th: 180, sn: 90, th2: 96, sn2: 96, fd: 180, fd2: 186, an: ['hip', 0, -5] },
      { t: -90, n: -94, ua: -100, fa: -100, ua2: 180, fa2: 180, th: 96, sn: 96, th2: 180, sn2: 90, fd: 186, fd2: 180, an: ['hip', 0, -5] },
    ], props: [floor],
  });
  def('hollow_tuck', { frames: [{ t: -104, n: -110, ua: -100, fa: -100, th: 150, sn: 70, fd: 160, an: ['hip', 0, -5] }, { t: -106, n: -112, ua: -102, fa: -102, th: 148, sn: 68, fd: 158, an: ['hip', 0, -5] }], props: [floor], dur: 3000 });
  def('hollow_hold', { frames: [{ t: -104, n: -110, ua: -100, fa: -100, th: 100, sn: 100, fd: 190, an: ['hip', 0, -5] }, { t: -106, n: -112, ua: -102, fa: -102, th: 102, sn: 102, fd: 192, an: ['hip', 0, -5] }], props: [floor], dur: 3000 });
  def('lying_leg_raise', { frames: [{ t: -90, n: -92, ua: 90, fa: 90, th: 96, sn: 96, fd: 186, an: ['hip', 0, -5] }, { t: -90, n: -92, ua: 90, fa: 90, th: 178, sn: 178, fd: 268, an: ['hip', 0, -5] }], props: [floor] });
  const hangCore = (th, sn, o = {}) => ({ t: 178, n: 180, ua: 180, fa: 180, th, sn, fd: sn + 70, an: ['sh', -2, BY + 49], ik: { ha: [0, BY, 1] }, ...o });
  def('hanging_knee_raise', { frames: [hangCore(4, -2), hangCore(104, 6)], props: barP });
  def('hanging_leg_raise', { frames: [hangCore(4, -2), hangCore(94, 94)], props: barP });
  def('toes_to_bar', { frames: [hangCore(4, -2), hangCore(158, 165, { t: 168, an: ['sh', -6, BY + 47] })], props: barP });
  const lsit = (th, sn) => ({ t: 180, n: 180, ua: 0, fa: 0, th, sn, fd: sn + 70, an: ['hip', 0, -8], ik: { ha: [3, 0, 1] } });
  def('tuck_lsit', { frames: [lsit(140, 35), lsit(142, 37)], props: [floor], dur: 3000 });
  def('lsit', { frames: [lsit(90, 90), lsit(92, 92)], props: [floor], dur: 3000 });
  def('dragon_flag', (() => {
    const mk = t => ({ t, n: -90, ua: -110, fa: -110, th: t + 180, sn: t + 180, fd: t + 270, an: ['sh', 0, -44], ik: { ha: [-26, -40, -1] } });
    return { frames: [mk(-28), mk(-80)], props: [floor, { k: 'box', x: -36, y: -40, w: 60, h: 40 }], w: [3, 1] };
  })());
  def('superman', {
    frames: [
      { t: 90, n: 92, ua: 92, fa: 92, th: -90, sn: -90, fd: -170, an: ['hip', 0, -6] },
      { t: 99, n: 106, ua: 106, fa: 108, th: -98, sn: -101, fd: -175, an: ['hip', 0, -6] },
    ], props: [floor],
  });
  def('arch_hold', { frames: [{ t: 100, n: 106, ua: 108, fa: 110, th: -99, sn: -102, fd: -175, an: ['hip', 0, -6] }, { t: 101, n: 107, ua: 109, fa: 111, th: -100, sn: -103, fd: -176, an: ['hip', 0, -6] }], props: [floor], dur: 3000 });
  def('bird_dog', (() => {
    const t = 108;
    const a = { t, n: t, ua: 0, fa: 0, th: 0, sn: -90, fd: -100, an: ['kn', 0, -2] };
    const b = { ...a, ua: 100, fa: 100, th2: -94, sn2: -94, fd2: -100, ua2: 0, fa2: 0 };
    return { frames: [{ ...a, ua2: 0, fa2: 0, th2: 0, sn2: -90, fd2: -100 }, b], props: [floor] };
  })());

  /* ---------------- Habilidades ---------------- */
  def('crow', { frames: [{ t: 80, n: 75, ua: 0, fa: 0, th: 52, sn: -125, fd: -170, an: ['sh', 18, -34], ik: { ha: [0, 0, 1] } }, { t: 82, n: 76, ua: 0, fa: 0, th: 54, sn: -123, fd: -170, an: ['sh', 18, -35], ik: { ha: [0, 0, 1] } }], props: [floor], dur: 3000 });
  def('tuck_planche', { frames: [{ t: 92, n: 98, ua: 0, fa: 0, th: 52, sn: -120, fd: -170, an: ['sh', 15, -46], ik: { ha: [0, 0, 1] } }, { t: 93, n: 99, ua: 0, fa: 0, th: 54, sn: -118, fd: -170, an: ['sh', 16, -46], ik: { ha: [0, 0, 1] } }], props: [floor], dur: 3000 });
  def('tuck_front_lever', { frames: [{ t: 90, n: 92, ua: 180, fa: 180, th: 140, sn: -70, fd: -160, an: ['sh', -18, BY + 46], ik: { ha: [0, BY, -1] } }, { t: 91, n: 93, ua: 180, fa: 180, th: 142, sn: -68, fd: -160, an: ['sh', -18, BY + 46], ik: { ha: [0, BY, -1] } }], props: barP, dur: 3000 });

  /* ---------------- Acondicionamiento ---------------- */
  def('jumping_jack', {
    frames: [
      { view: 'front', t: 180, ua: 8, fa: 8, ua2: -8, fa2: -8, th: 4, sn: 4, th2: -4, sn2: -4, an: ['hip', 0, -70] },
      { view: 'front', t: 180, ua: 155, fa: 168, ua2: -155, fa2: -168, th: 20, sn: 20, th2: -20, sn2: -20, an: ['hip', 0, -67] },
    ], props: [floor], dur: 1300,
  });
  def('high_knees', {
    frames: [
      { t: 178, ua: -35, fa: 60, ua2: 40, fa2: 130, th: 92, sn: 0, fd: 60, th2: -4, sn2: 0, fd2: 70, an: ['toe2', 4, 0] },
      { t: 178, ua: 40, fa: 130, ua2: -35, fa2: 60, th: -4, sn: 0, fd: 70, th2: 92, sn2: 0, fd2: 60, an: ['toe', 4, 0] },
    ], props: [floor], dur: 1100,
  });
  def('mountain_climber', (() => {
    const base = { t: 112, n: 108, ua: 0, fa: 0, fd: 15, an: ['sh', 0, -49], ik: { ha: [0, 0, 1] } };
    return {
      frames: [{ ...base, th: 30, sn: -70, th2: -68, sn2: -68, fd2: 15 }, { ...base, th: -68, sn: -68, th2: 30, sn2: -70, fd2: 15 }],
      props: [floor], dur: 1200,
    };
  })());
  def('burpee', (() => {
    const pl = pushup();
    return {
      frames: [
        sqTop,
        { t: 120, n: 110, ua: 0, fa: 0, th: 96, sn: -40, fd: 90, an: ['ft', 0, 0], ik: { ha: [26, 0, 1] } },
        { ...pl.frames[0], an: ['toe', -76, 0] },
        { t: 120, n: 110, ua: 0, fa: 0, th: 96, sn: -40, fd: 90, an: ['ft', 0, 0], ik: { ha: [26, 0, 1] } },
        S({ an: ['ft', 0, -18], fd: 40, ua: 170, fa: 172 }),
      ], props: [floor], loop: 'cycle', dur: 4200,
    };
  })());
  def('burpee_pushup', (() => {
    const pl = pushup();
    return {
      frames: [
        sqTop,
        { t: 120, n: 110, ua: 0, fa: 0, th: 96, sn: -40, fd: 90, an: ['ft', 0, 0], ik: { ha: [26, 0, 1] } },
        { ...pl.frames[0], an: ['toe', -76, 0] },
        { ...pl.frames[1], an: ['toe', -76, 0] },
        { ...pl.frames[0], an: ['toe', -76, 0] },
        { t: 120, n: 110, ua: 0, fa: 0, th: 96, sn: -40, fd: 90, an: ['ft', 0, 0], ik: { ha: [26, 0, 1] } },
        S({ an: ['ft', 0, -18], fd: 40, ua: 170, fa: 172 }),
      ], props: [floor], loop: 'cycle', dur: 5600,
    };
  })());

  /* ---------------- Movilidad / calentamiento / estiramientos ---------------- */
  def('arm_circles', {
    frames: [
      { view: 'front', t: 180, ua: 10, fa: 10, ua2: -10, fa2: -10, th: 6, sn: 6, th2: -6, sn2: -6, an: ['hip', 0, -70] },
      { view: 'front', t: 180, ua: 90, fa: 90, ua2: -90, fa2: -90, th: 6, sn: 6, th2: -6, sn2: -6, an: ['hip', 0, -70] },
      { view: 'front', t: 180, ua: 172, fa: 176, ua2: -172, fa2: -176, th: 6, sn: 6, th2: -6, sn2: -6, an: ['hip', 0, -70] },
    ], props: [floor],
  });
  def('leg_swing', { frames: [S({ th: 60, sn: 62, fd: 150, an: ['ft2', 0, 0], ua: 90, fa: 90, th2: 0, sn2: 0, fd2: 90 }), S({ th: -32, sn: -30, fd: 50, an: ['ft2', 0, 0], ua: 90, fa: 90, th2: 0, sn2: 0, fd2: 90 })], props: [floor, { k: 'wall', x: 50, y2: -150 }], dur: 1600 });
  def('cat_cow', (() => {
    const a = { t: 106, n: 135, ua: 0, fa: 0, th: 0, sn: -90, fd: -100, an: ['kn', 0, -2] };
    return { frames: [a, { ...a, t: 110, n: 60 }], props: [floor], dur: 3000 };
  })());
  def('hip_hinge_stretch', { frames: [S({ ua: 2, fa: 2 }), S({ t: 62, n: 50, ua: -4, fa: -4, th: -10, sn: 4 })], props: [floor], dur: 3600 });
  def('seated_hamstring', { frames: [{ t: 150, n: 140, ua: 120, fa: 110, th: 90, sn: 90, fd: 175, an: ['hip', 0, -7] }, { t: 118, n: 110, ua: 98, fa: 96, th: 90, sn: 90, fd: 175, an: ['hip', 0, -7] }], props: [floor], dur: 3600 });
  def('child_pose', { frames: [{ t: 78, n: 82, ua: 92, fa: 90, th: 58, sn: -90, fd: -90, an: ['kn', 0, -3] }, { t: 80, n: 84, ua: 93, fa: 91, th: 60, sn: -90, fd: -90, an: ['kn', 0, -3] }], props: [floor], dur: 3600 });
  def('quad_stretch', (() => {
    const p = S({ th2: -4, sn2: -168, fd2: -80, ua: 8, fa: 8 });
    const j = J(p);
    const q = { ...p, ik: { ha2: [j.ft2[0] - 3, j.ft2[1], 1] } };
    return { frames: [q], props: [floor] };
  })());
  def('chest_stretch', { frames: [S({ ua2: -90, fa2: -90, ua: -60, fa: -60 }), S({ ua2: -100, fa2: -100, ua: -75, fa: -75, t: 176 })], props: [floor], dur: 3600 });
  /* ---- Calentamiento y estiramientos adicionales ---- */
  def('wrist_rock', (() => {
    const a = { t: 106, n: 110, ua: 0, fa: 0, th: 0, sn: -90, fd: -100, an: ['kn', 0, -2] };
    const h = J(a).ha;
    const ikk = { ha: [h[0], h[1], 1] };
    return { frames: [{ ...a, t: 112, ik: ikk }, { ...a, t: 98, n: 102, ik: ikk }], props: [floor], dur: 2600 };
  })());
  def('scap_pushup', (() => {
    const pf = pushup().frames[0];
    return { frames: [pf, { ...pf, t: pf.t - 3, n: pf.n == null ? pf.t - 3 : pf.n - 3 }], props: [floor], dur: 2000 };
  })());
  def('hip_circles', {
    frames: [
      { view: 'front', t: 174, ua: 40, fa: -50, ua2: -40, fa2: 50, th: 8, sn: 2, th2: -2, sn2: -6, an: ['hip', 4, -68] },
      { view: 'front', t: 186, ua: 40, fa: -50, ua2: -40, fa2: 50, th: 2, sn: 6, th2: -8, sn2: -2, an: ['hip', -4, -68] },
    ], props: [floor], dur: 2400,
  });
  def('lat_stretch', (() => {
    const mk = t => ({ t, n: t + 4, ua: t, fa: t, th: -12, sn: 2, fd: 90, an: ['ft', 0, 0] });
    const h = J(mk(96)).ha;
    return { frames: [{ ...mk(100), ik: { ha: [h[0], h[1], -1] } }, { ...mk(92), ik: { ha: [h[0], h[1], -1] } }], props: [floor, { k: 'chair', x: h[0] - 6, y: h[1] + 4, w: 34, back: 1 }], dur: 3600 };
  })());
  def('breathing', (() => {
    const base = { t: -90, n: -94, ua: 140, fa: 60, th: 140, sn: 14, fd: 90, an: ['sh', 0, -5] };
    const ft = J(base).ft;
    return { frames: [{ ...base, ik: { ft: [ft[0], ft[1], -1] } }], props: [floor] };
  })());
  def('hip_flexor', (() => {
    const a = { t: 180, ua: 4, fa: 6, th: 84, sn: 0, fd: 90, th2: -20, sn2: -92, fd2: -100, an: ['kn2', 0, -3] };
    const f = J(a).ft;
    const ikk = { ft: [f[0], f[1], -1] };
    return { frames: [{ ...a, ik: ikk }, { ...a, t: 176, th2: -38, ik: ikk }], props: [floor], dur: 3600 };
  })());
  def('calf_stretch', (() => {
    const a = { t: 158, n: 162, ua: 100, fa: 100, th: 28, sn: -6, fd: 90, th2: -24, sn2: -24, fd2: 66, an: ['ft2', 0, 0] };
    const j = J(a);
    const W = j.sh[0] + 46;
    return { frames: [{ ...a, ik: { ha: [W, j.sh[1] - 4, 1] } }], props: [floor, { k: 'wall', x: W + 2, y2: -160 }] };
  })());
  def('shoulder_stretch', {
    frames: [{ view: 'front', t: 180, ua: -80, fa: -95, ua2: -30, fa2: 70, th: 6, sn: 6, th2: -6, sn2: -6, an: ['hip', 0, -70] }],
    props: [floor],
  });
})();
