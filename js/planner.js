/* Planificador: nivel, rutina, prescripción, progresión y recomendaciones */
const Planner = (() => {
  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const DAYS_S = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const GOALS = {
    salud: { n: 'Salud y forma general', icon: '💚', sets: 3, reps: [8, 12], rest: 75, ts: 1 },
    fuerza: { n: 'Ganar fuerza', icon: '🏋️', sets: 4, reps: [4, 8], rest: 150, ts: 0.85 },
    hipertrofia: { n: 'Ganar músculo', icon: '💪', sets: 3, reps: [8, 15], rest: 90, ts: 1 },
    perder_grasa: { n: 'Perder grasa', icon: '🔥', sets: 3, reps: [10, 15], rest: 50, ts: 1.15 },
    resistencia: { n: 'Resistencia muscular', icon: '🫀', sets: 3, reps: [15, 25], rest: 45, ts: 1.4 },
    habilidades: { n: 'Aprender habilidades', icon: '🤸', sets: 3, reps: [5, 10], rest: 120, ts: 1 },
  };

  const DAY_TPL = {
    FB_A: { n: 'Cuerpo completo A', slots: ['push_h', 'pull_v', 'squat', 'core_a', 'hinge', 'dips', 'calves', 'core_p'] },
    FB_B: { n: 'Cuerpo completo B', slots: ['pull_h', 'push_v', 'hinge', 'core_p', 'squat', 'push_h*', 'core_a', 'calves'] },
    FB_C: { n: 'Cuerpo completo C', slots: ['dips', 'pull_v', 'squat', 'core_a', 'hinge', 'pull_h', 'core_p', 'push_v'] },
    UP_A: { n: 'Tren superior A', slots: ['push_h', 'pull_v', 'push_v', 'pull_h', 'dips', 'core_a', 'core_p'] },
    UP_B: { n: 'Tren superior B', slots: ['pull_h', 'push_v', 'pull_v*', 'push_h*', 'dips', 'core_p', 'core_a'] },
    LO_A: { n: 'Tren inferior A', slots: ['squat', 'hinge', 'core_a', 'calves', 'squat*', 'core_p', 'hinge*'] },
    LO_B: { n: 'Tren inferior B', slots: ['hinge', 'squat', 'core_p', 'calves', 'hinge*', 'core_a', 'squat*'] },
    PUSH: { n: 'Empuje', slots: ['push_h', 'push_v', 'dips', 'push_h*', 'core_a', 'push_v*', 'core_p'] },
    PULL: { n: 'Tracción', slots: ['pull_v', 'pull_h', 'pull_v*', 'pull_h*', 'core_p', 'core_a', 'hinge'] },
    LEGS: { n: 'Piernas y core', slots: ['squat', 'hinge', 'squat*', 'calves', 'core_a', 'hinge*', 'core_p'] },
    PUSH2: { n: 'Empuje B', slots: ['push_v', 'push_h', 'dips*', 'push_h*', 'core_p', 'push_v*', 'core_a'] },
    PULL2: { n: 'Tracción B', slots: ['pull_h', 'pull_v', 'pull_h*', 'pull_v*', 'core_a', 'core_p', 'hinge'] },
    LEGS2: { n: 'Piernas y core B', slots: ['hinge', 'squat', 'hinge*', 'calves', 'core_p', 'squat*', 'core_a'] },
    MOB: { n: 'Movilidad y recuperación', slots: ['core_p', 'core_a', 'hinge'], mobility: true },
  };
  const SPLITS = {
    1: ['FB_A'], 2: ['FB_A', 'FB_B'], 3: ['FB_A', 'FB_B', 'FB_C'],
    4: ['UP_A', 'LO_A', 'UP_B', 'LO_B'], 5: ['PUSH', 'PULL', 'LEGS', 'UP_A', 'LO_A'],
    6: ['PUSH', 'PULL', 'LEGS', 'PUSH2', 'PULL2', 'LEGS2'], 7: ['PUSH', 'PULL', 'LEGS', 'MOB', 'PUSH2', 'PULL2', 'LEGS2'],
  };
  const SPLIT_NAMES = { 1: 'Cuerpo completo', 2: 'Cuerpo completo A/B', 3: 'Cuerpo completo A/B/C', 4: 'Torso / Pierna', 5: 'Empuje / Tracción / Pierna + Torso / Pierna', 6: 'Empuje / Tracción / Pierna ×2', 7: 'Empuje / Tracción / Pierna ×2 + recuperación' };
  const FALLBACK = { pull_v: ['pull_h', 'core_p'], pull_h: ['pull_v', 'core_p'], dips: ['push_h'], push_v: ['push_h'], calves: ['squat'], skill: [] };
  const EX_BY_MIN = m => (m <= 20 ? 4 : m <= 30 ? 5 : m <= 45 ? 6 : m <= 60 ? 7 : 8);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r5 = v => Math.max(5, Math.round(v / 5) * 5);

  /* ---------- Perfil ---------- */
  function bmi(p) { return p.weight && p.height ? p.weight / Math.pow(p.height / 100, 2) : null; }
  function bmiLabel(b) { return b == null ? '' : b < 18.5 ? 'Bajo peso' : b < 25 ? 'Normal' : b < 30 ? 'Sobrepeso' : 'Obesidad'; }
  function lowImpact(p) { const b = bmi(p); return (b && b >= 30) || p.age >= 55 || (p.limits || []).includes('knees'); }

  function assess(p) {
    const t = p.tests || {};
    const pu = +t.pushups || 0, pl = t.pullups, sq = +t.squats || 0, pk = +t.plank || 0;
    const L = {};
    L.push_h = pu === 0 ? 1 : pu < 5 ? 2 : pu < 13 ? 3 : pu < 25 ? 4 : pu < 40 ? 5 : pu < 60 ? 6 : 7;
    L.push_v = Math.max(1, L.push_h - 1);
    L.dips = L.push_h;
    if (pl == null || pl === '' || pl < 0) {
      L.pull_v = clamp(L.push_h - 1, 1, 4);
    } else {
      const n = +pl;
      L.pull_v = n === 0 ? (pu < 5 ? 2 : 3) : n < 3 ? 4 : n < 6 ? 5 : n < 10 ? 6 : n < 15 ? 7 : 8;
    }
    L.pull_h = clamp(Math.max(L.pull_v, L.push_h - 1), 1, 7);
    L.squat = sq < 10 ? 1 : sq < 25 ? 2 : sq < 40 ? 3 : sq < 60 ? 4 : 5;
    if (p.experience === 'advanced') L.squat += 1;
    const b = bmi(p);
    if (b && b >= 30) L.squat = Math.min(L.squat, 3);
    L.hinge = L.squat;
    L.calves = L.squat >= 3 ? 3 : 1;
    L.core_a = pk < 20 ? 1 : pk < 45 ? 2 : pk < 90 ? 3 : pk < 150 ? 4 : 5;
    L.core_p = clamp(L.core_a, 1, 3);
    L.skill = Math.round((L.push_h + L.pull_v) / 2);
    L.cond = { sedentary: 1, light: 2, moderate: 3, active: 5 }[p.activity] || 2;
    if (p.experience === 'advanced') for (const k of ['push_h', 'pull_v', 'core_a']) L[k] = Math.min(10, L[k] + 1);
    return L;
  }

  function hasEq(ex, eq) {
    const set = new Set(eq || []);
    return (ex.eq || []).every(req => req.split('|').some(r => set.has(r)));
  }
  function allowed(ex, p) {
    if (!hasEq(ex, p.equipment)) return false;
    const lim = p.limits || [];
    if ((ex.avoid || []).some(a => lim.includes(a))) return false;
    if (ex.impact && lowImpact(p)) return false;
    return true;
  }
  function family(fam, p) { return EXERCISES.filter(e => e.fam === fam && (!p || allowed(e, p))).sort((a, b) => a.lvl - b.lvl); }

  function pick(fam, level, p, exclude = []) {
    const list = family(fam, p).filter(e => !exclude.includes(e.id));
    if (!list.length) return null;
    const under = list.filter(e => e.lvl <= level);
    return under.length ? under[under.length - 1] : (list[0].lvl <= level + 1 ? list[0] : null);
  }

  /* ---------- Prescripción ---------- */
  function prescribe(ex, p, role = 'main') {
    const g = GOALS[p.goal] || GOALS.salud;
    let sets = g.sets, rest = g.rest;
    if (p.goal === 'hipertrofia' && ex.lvl >= 4) sets = 4;
    if (p.experience === 'none' && ex.lvl <= 3) sets = Math.max(2, sets - 1);
    if (role === 'alt') sets = Math.max(2, sets - 1);
    if (ex.fam === 'core_a' || ex.fam === 'core_p' || ex.fam === 'calves') rest = Math.min(rest, 60);
    let target;
    if (ex.type === 'time') {
      const s = role === 'skill' ? 1 : g.ts;
      target = [r5(ex.time[0] * s), r5(ex.time[1] * s)];
      if (target[1] <= target[0]) target[1] = target[0] + 10;
    } else {
      target = ex.reps ? ex.reps.slice() : g.reps.slice();
      if (ex.reps && p.goal === 'resistencia' && ex.reps[1] >= 12) target = [ex.reps[0] + 3, ex.reps[1] + 5];
      if (ex.reps && p.goal === 'fuerza' && ex.reps[1] > 10) target = [Math.max(5, ex.reps[0] - 4), ex.reps[1] - 5];
    }
    if (role === 'skill') { sets = 4; rest = 120; }
    return { exId: ex.id, fam: ex.fam, sets, target, rest, type: ex.type, role };
  }

  /* ---------- Generación ---------- */
  function generate(p) {
    const L = assess(p);
    const days = (p.days || []).slice().sort((a, b) => a - b);
    const n = clamp(days.length, 1, 7);
    const split = SPLITS[n];
    const count = EX_BY_MIN(p.minutes || 45);
    const wantsSkill = p.goal === 'habilidades' || (p.interests || []).includes('habilidades');
    const wantsCond = p.goal === 'perder_grasa' || p.goal === 'resistencia' || (p.interests || []).includes('cardio');
    const wantsMob = (p.interests || []).includes('movilidad') || p.age >= 40;
    const plan = { createdAt: Date.now(), split: SPLIT_NAMES[n], levels: L, days: [], mobV: 2 };

    split.forEach((key, i) => {
      const tpl = DAY_TPL[key];
      const items = [];
      const used = [];
      if (wantsSkill && !tpl.mobility && L.skill >= 4) {
        const sk = pick('skill', L.skill, p, used);
        if (sk) { items.push(prescribe(sk, p, 'skill')); used.push(sk.id); }
      }
      const limit = tpl.mobility ? 3 : count;
      for (const slot of tpl.slots) {
        if (items.length >= limit) break;
        const alt = slot.endsWith('*');
        const fam = slot.replace('*', '');
        let lvl = L[fam] - (alt ? 1 : 0);
        if (tpl.mobility) lvl = Math.min(lvl, 2);
        let ex = pick(fam, lvl, p, used);
        if (!ex || (alt && used.includes(ex.id))) {
          for (const fb of FALLBACK[fam] || []) { ex = pick(fb, L[fb] - 1, p, used); if (ex) break; }
        }
        if (!ex) continue;
        used.push(ex.id);
        items.push(prescribe(ex, p, alt ? 'alt' : 'main'));
      }
      let finisher = null;
      if (wantsCond && !tpl.mobility) finisher = makeFinisher(p, L);
      plan.days.push({
        key, name: tpl.name || tpl.n, weekday: days[i] ?? i, items, finisher,
        warmup: warmupFor(tpl, p), cooldown: cooldownFor(tpl, p, wantsMob), mobility: !!tpl.mobility,
      });
    });
    return plan;
  }

  function makeFinisher(p, L) {
    let list = family('cond', p).filter(e => e.lvl <= Math.max(2, L.cond));
    if (list.length < 3) {
      const extra = [pick('squat', 2, p), pick('push_h', Math.min(3, L.push_h), p), EX.mountain_climber].filter(e => e && allowed(e, p));
      list = [...list, ...extra];
    }
    const uniq = [...new Map(list.map(e => [e.id, e])).values()].slice(-3);
    const adv = (L.push_h + L.squat) / 2;
    return { ids: uniq.map(e => e.id), work: adv >= 5 ? 40 : 30, rest: adv >= 5 ? 15 : 20, rounds: adv <= 2 ? 2 : adv >= 5 ? 4 : 3 };
  }

  // Calentamiento (5-7 min): general para subir pulsaciones y específico de las zonas del día
  function warmupFor(tpl, p) {
    const upper = tpl.slots.filter(s => /push|pull|dips/.test(s)).length;
    const lower = tpl.slots.filter(s => /squat|hinge|calves/.test(s)).length;
    const ids = [lowImpact(p) ? 'march' : 'jacks', 'cat_cow'];
    if (upper) ids.push('arm_circles', 'wrists', 'scap');
    if (lower) ids.push('hip_circles', 'leg_swings', 'deep_squat');
    if (lower && (p.age >= 40 || (p.limits || []).length)) ids.push('bridge_warm');
    return [...new Set(ids)];
  }
  // Estiramientos finales (4-6 min) de los músculos trabajados
  function cooldownFor(tpl, p, mob) {
    const upper = tpl.slots.filter(s => /push|pull|dips/.test(s)).length;
    const lower = tpl.slots.filter(s => /squat|hinge|calves/.test(s)).length;
    const ids = [];
    if (tpl.mobility) ids.push('cat_cow', 'deep_squat', 'leg_swings', 'arm_circles', 'hip_circles');
    if (upper) ids.push('chest_stretch', 'shoulder_stretch', 'lat_hang');
    if (lower) ids.push('quad', 'hip_flexor', 'hamstring', 'calf_stretch');
    if (mob || tpl.mobility || !lower) ids.push('child_pose');
    if (mob || tpl.mobility) ids.push('hinge_stretch');
    ids.push('breathing');
    return [...new Set(ids)];
  }
  // Actualiza calentamiento y estiramientos de un plan guardado con una versión anterior
  function refreshMobility(plan, p) {
    if (!plan || plan.mobV === 2) return false;
    const wantsMob = (p.interests || []).includes('movilidad') || p.age >= 40;
    for (const d of plan.days) {
      const tpl = DAY_TPL[d.key];
      if (!tpl) continue;
      d.warmup = warmupFor(tpl, p);
      d.cooldown = cooldownFor(tpl, p, wantsMob);
    }
    plan.mobV = 2;
    return true;
  }
  const mobMin = ids => Math.round(ids.reduce((a, id) => a + (MOBILITY[id]?.secs || 40), 0) / 60);

  function estimateMin(day) {
    let s = day.warmup.reduce((a, id) => a + (MOBILITY[id]?.secs || 40), 0);
    s += day.cooldown.reduce((a, id) => a + (MOBILITY[id]?.secs || 40), 0);
    for (const it of day.items) {
      const ex = EX[it.exId];
      const work = it.type === 'time' ? (it.target[0] + it.target[1]) / 2 : (it.target[0] + it.target[1]) / 2 * 3;
      s += it.sets * work * (ex.uni ? 2 : 1) + (it.sets - 1) * it.rest + 60;
    }
    if (day.finisher) s += day.finisher.rounds * day.finisher.ids.length * (day.finisher.work + day.finisher.rest);
    return Math.round(s / 60);
  }

  /* ---------- Progresión ---------- */
  function entriesFor(sessions, exId) {
    const out = [];
    for (const s of sessions) for (const e of s.entries) if (e.exId === exId && e.sets.some(x => x.done)) out.push({ date: s.date, ...e });
    return out.sort((a, b) => a.date - b.date);
  }
  function setVal(x) { return x.reps ?? x.secs ?? 0; }

  // Evalúa el rendimiento de un ejercicio en la sesión: 'up' | 'keep' | 'down'
  function evaluate(entry, item, prevEntry) {
    const done = entry.sets.filter(x => x.done);
    if (!done.length) return 'keep';
    const [mn, mx] = item.target;
    const allTop = done.length >= item.sets && done.every(x => setVal(x) >= mx);
    if (allTop) return 'up';
    const avg = done.reduce((a, x) => a + setVal(x), 0) / done.length;
    if (avg < mn * 0.75) {
      if (prevEntry) {
        const pd = prevEntry.sets.filter(x => x.done);
        const pavg = pd.reduce((a, x) => a + setVal(x), 0) / (pd.length || 1);
        if (pavg < mn * 0.75) return 'down';
      }
    }
    return 'keep';
  }

  function nextIn(exId, p, dirn) {
    const ex = EX[exId];
    const fam = family(ex.fam, p);
    if (dirn > 0) return fam.find(e => e.lvl > ex.lvl && e.id !== exId) || null;
    const lower = fam.filter(e => e.lvl < ex.lvl);
    return lower.length ? lower[lower.length - 1] : null;
  }

  // Aplica la progresión al plan tras una sesión. Devuelve la lista de cambios.
  function applyProgress(plan, session, p, sessions, auto) {
    const changes = [];
    const day = plan.days[session.dayIndex];
    if (!day) return changes;
    for (const entry of session.entries) {
      if (entry.aborted) continue; // ejercicio saltado o adaptado por molestias
      const item = day.items.find(i => i.exId === entry.exId);
      if (!item) continue;
      const hist = entriesFor(sessions.filter(s => s.id !== session.id), entry.exId);
      const res = evaluate(entry, item, hist[hist.length - 1]);
      if (res === 'keep') continue;
      const ex = EX[entry.exId];
      const nx = nextIn(entry.exId, p, res === 'up' ? 1 : -1);
      const change = { exId: entry.exId, kind: res, to: nx ? nx.id : null, applied: false };
      if (res === 'up' && !nx) change.note = item.type === 'time' ? 'Has llegado al tope: +5 s al objetivo' : 'Has llegado al tope: +2 repeticiones al objetivo';
      if (auto) {
        for (const d of plan.days) for (let k = 0; k < d.items.length; k++) {
          const it = d.items[k];
          if (it.exId !== entry.exId) continue;
          if (nx) d.items[k] = { ...prescribe(nx, p, it.role), sets: it.sets };
          else if (res === 'up') it.target = it.type === 'time' ? [it.target[0] + 5, it.target[1] + 5] : [it.target[0] + 2, it.target[1] + 2];
        }
        change.applied = true;
      }
      if (res === 'down' && !nx) continue;
      changes.push({ ...change, name: ex.n });
    }
    return changes;
  }

  function swapExercise(plan, dayIdx, itemIdx, newId, p) {
    const it = plan.days[dayIdx].items[itemIdx];
    plan.days[dayIdx].items[itemIdx] = { ...prescribe(EX[newId], p, it.role), sets: it.sets };
  }

  /* ---------- Recomendaciones ---------- */
  function energy(p) {
    if (!p.weight || !p.height || !p.age) return null;
    const base = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : p.sex === 'f' ? -161 : -78);
    const f = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }[p.activity] || 1.375;
    const tdee = base * f + (p.days || []).length * 35;
    let target = tdee, note = 'mantenimiento';
    if (p.goal === 'perder_grasa') { target = tdee - 400; note = 'déficit moderado (-400 kcal)'; }
    if (p.goal === 'hipertrofia') { target = tdee + 250; note = 'superávit ligero (+250 kcal)'; }
    const b = bmi(p);
    if (b && b < 18.5 && p.goal !== 'perder_grasa') { target = tdee + 300; note = 'superávit (+300 kcal)'; }
    const refW = b && b > 27 ? 25 * Math.pow(p.height / 100, 2) : p.weight;
    const prot = { hipertrofia: [1.6, 2.2], fuerza: [1.6, 2.0], perder_grasa: [1.8, 2.2] }[p.goal] || [1.2, 1.6];
    return { bmr: Math.round(base), tdee: Math.round(tdee), target: Math.round(target / 10) * 10, note, prot: prot.map(x => Math.round(x * refW)), water: Math.round((refW * 35 + 500) / 100) / 10 };
  }

  function recommendations(p, plan, sessions) {
    const R = [];
    const add = (cat, icon, title, text, prio = 2) => R.push({ cat, icon, title, text, prio });
    const b = bmi(p);
    const L = plan ? plan.levels : assess(p);
    const avgL = (L.push_h + L.pull_v + L.squat) / 3;
    const eq = new Set(p.equipment || []);
    const lim = p.limits || [];
    const now = Date.now();
    const last = sessions.length ? Math.max(...sessions.map(s => s.date)) : null;

    // Dinámicas a partir del historial
    if (last && now - last > 7 * 864e5) add('Progreso', '⏰', 'Retoma con calma', `Llevas ${Math.floor((now - last) / 864e5)} días sin entrenar. Haz la primera sesión con una serie menos por ejercicio para recuperar el ritmo sin agujetas excesivas.`, 0);
    const recent = sessions.slice(-4);
    if (recent.length >= 3 && recent.reduce((a, s) => a + (s.feeling || 3), 0) / recent.length <= 2.2) add('Progreso', '🔋', 'Toca una semana de descarga', 'Tus últimas sesiones las has valorado como muy duras. Reduce un 40% el número de series durante una semana manteniendo los ejercicios. Volverás más fuerte.', 0);
    if (plan) {
      const stalled = [];
      for (const d of plan.days) for (const it of d.items) {
        const h = entriesFor(sessions, it.exId).slice(-3);
        if (h.length === 3) {
          const tot = h.map(e => e.sets.reduce((a, x) => a + (x.done ? setVal(x) : 0), 0));
          if (tot[2] <= tot[0]) stalled.push(EX[it.exId].n);
        }
      }
      if (stalled.length) add('Progreso', '📉', 'Estancamiento detectado', `Sin mejora en 3 sesiones: ${[...new Set(stalled)].slice(0, 3).join(', ')}. Prueba a bajar 3 s en la fase excéntrica (tempo 3-1-1), añadir una serie o descansar 30 s más.`, 1);
    }
    const weekAgo = now - 7 * 864e5;
    const thisWeek = sessions.filter(s => s.date > weekAgo).length;
    if (sessions.length && thisWeek >= (p.days || []).length && (p.days || []).length) add('Progreso', '🏆', '¡Semana completada!', `Has hecho ${thisWeek} sesiones en los últimos 7 días. La constancia es el factor nº1 de progreso.`, 1);

    // Nutrición
    const E = energy(p);
    if (E) {
      add('Nutrición', '🍽️', `Energía orientativa: ~${E.target} kcal/día`, `Gasto estimado ${E.tdee} kcal (Mifflin-St Jeor × actividad). Objetivo: ${E.note}. Es una estimación: ajústala según la evolución de tu peso en 2-3 semanas.`, 1);
      add('Nutrición', '🥚', `Proteína: ${E.prot[0]}–${E.prot[1]} g/día`, 'Repártela en 3-5 tomas de 25-40 g (huevos, lácteos, legumbres, carne, pescado, tofu). Es clave para recuperar y ganar fuerza.', 1);
      add('Nutrición', '💧', `Agua: ~${E.water} L/día`, 'Bebe algo más los días de entrenamiento y si hace calor. Orina clara = buena hidratación.', 3);
    }
    if (p.diet === 'irregular') add('Nutrición', '🥗', 'Ordena tus comidas', 'Empieza por algo simple: verdura y proteína en cada comida principal, y reduce ultraprocesados y bebidas azucaradas. Pequeños cambios sostenidos funcionan mejor que dietas estrictas.', 1);
    if (b && b < 18.5) add('Nutrición', '⚖️', 'IMC bajo', 'Prioriza comer suficiente: añade frutos secos, aceite de oliva y una comida extra. Con déficit de energía apenas ganarás fuerza.', 1);

    // Descanso y hábitos
    if (p.sleep && p.sleep < 7) add('Hábitos', '😴', 'Duerme más', `Duermes ~${p.sleep} h. Con menos de 7 h la recuperación y la fuerza se resienten. Objetivo: 7-9 h con horario regular y sin pantallas 30-60 min antes.`, 0);
    if (p.stress === 'high') add('Hábitos', '🧘', 'Estrés alto', 'El estrés también fatiga. En semanas malas reduce el volumen en lugar de saltarte la sesión, y termina con 2-3 min de respiración diafragmática.', 1);
    if (p.activity === 'sedentary') add('Hábitos', '🚶', 'Muévete fuera del entrenamiento', 'Suma pasos poco a poco (objetivo 7.000-10.000/día) y levántate cada 45-60 min si trabajas sentado. Mejora salud y recuperación.', 1);
    if (p.goal === 'perder_grasa') add('Hábitos', '👟', 'El NEAT importa', 'Caminar a diario quema más calorías a la semana que los finishers de alta intensidad. Combina ambos.', 2);

    // Entrenamiento según perfil
    const nd = (p.days || []).length;
    if (avgL <= 3 && nd >= 5) add('Entrenamiento', '⚠️', 'Cuidado con el volumen', 'Al empezar, 3-4 días por semana son suficientes. Si notas agujetas fuertes o dolor articular, convierte un día en sesión de movilidad.', 0);
    if (nd === 7) add('Entrenamiento', '🛌', 'Descanso', 'Entrenar los 7 días exige dormir y comer bien. Hemos incluido un día de recuperación activa: no lo conviertas en intenso.', 1);
    if (nd === 1) add('Entrenamiento', '📅', 'Un día es un buen comienzo', 'Con una sesión semanal mantendrás la forma; para progresar de verdad intenta llegar a 2-3 días.', 1);
    add('Entrenamiento', '🎯', 'Técnica antes que repeticiones', 'Termina cada serie con 1-3 repeticiones "en la recámara" (RIR 1-3). Cuando completes todas las series en el máximo del rango, la app te subirá de nivel.', 2);
    add('Entrenamiento', '📈', 'Descarga cada 6-8 semanas', 'Planifica una semana con la mitad de series cada 6-8 semanas de progreso continuado, o antes si te notas estancado.', 3);
    const g = p.goal;
    if (g === 'fuerza') add('Entrenamiento', '⏱️', 'Descansa lo necesario', 'Para fuerza los descansos largos (2-3 min) son productivos. No acortes el temporizador si la siguiente serie va a salir peor.', 2);
    if (g === 'hipertrofia') add('Entrenamiento', '💪', 'Volumen semanal', 'Apunta a 10-20 series semanales por grupo muscular, cerca del fallo técnico. Prioriza la fase excéntrica lenta (2-3 s).', 2);
    if (g === 'resistencia') add('Entrenamiento', '🔁', 'Densidad', 'Cuando la rutina se quede corta, reduce descansos 10-15 s antes de subir de variante.', 2);
    if (g === 'habilidades' || (p.interests || []).includes('habilidades')) {
      if (L.skill >= 4) add('Entrenamiento', '🤸', 'Habilidades al principio', 'Practica la habilidad al inicio de la sesión, fresco. Calidad sobre cantidad: para la serie cuando pierdas la forma.', 1);
      else add('Entrenamiento', '🧱', 'Primero la base', 'Para habilidades como el pino o el front lever necesitas una base: ~15 flexiones, 5 dominadas y 45 s de hollow body. La rutina está enfocada a construirla.', 1);
    }

    // Material
    if (!eq.has('bar')) add('Material', '🛒', 'La mejor inversión: barra de dominadas', 'Una barra de puerta (20-35 €) desbloquea dominadas, elevaciones de piernas y front lever. Mientras tanto, la rutina usa remos con toalla y jalones tumbado.', 1);
    if (eq.has('bar') && !eq.has('band') && L.pull_v <= 4) add('Material', '🎗️', 'Bandas elásticas', 'Un juego de bandas (15-25 €) permite hacer dominadas asistidas con recorrido completo, la forma más rápida de llegar a la primera dominada.', 2);
    if (!eq.has('rings') && avgL >= 5) add('Material', '⭕', 'Anillas', 'Con tu nivel, unas anillas de madera (25-40 €) añaden fondos, remos y flexiones mucho más exigentes y se cuelgan en cualquier árbol o barra.', 3);
    if (!eq.has('parallels') && L.push_h >= 4) add('Material', '🟰', 'Fondos', 'Dos sillas robustas enfrentadas o unas paralelas bajas sirven para fondos completos, uno de los mejores ejercicios de empuje.', 3);

    // Limitaciones
    if (lim.includes('wrists')) add('Salud', '✋', 'Muñecas', 'Calienta bien las muñecas, haz flexiones sobre puños o agarres (paralelas, mancuernas) y evita apoyos con la muñeca muy extendida si duele.', 0);
    if (lim.includes('shoulders')) add('Salud', '🦴', 'Hombros', 'Hemos retirado fondos profundos y pinos. Añade rotaciones externas con banda y retracciones escapulares. Si un ejercicio duele (no confundir con esfuerzo), para.', 0);
    if (lim.includes('knees')) add('Salud', '🦵', 'Rodillas', 'Sin saltos y con sentadillas a caja para controlar la profundidad. Fortalecer cuádriceps y glúteo suele mejorar las molestias, sin superar un dolor 3/10.', 0);
    if (lim.includes('back')) add('Salud', '🔙', 'Espalda baja', 'Prioriza dead bug, bird dog y plancha lateral (los "tres grandes" de McGill). Mantén la columna neutra y evita ejercicios que reproduzcan el dolor.', 0);
    if (lim.includes('elbows')) add('Salud', '💪', 'Codos', 'Evita las flexiones diamante y calienta con series ligeras. Aumenta el volumen de tracción poco a poco.', 1);
    if (p.age >= 40) add('Salud', '🧓', 'Calentamiento más largo', 'A partir de los 40 conviene alargar el calentamiento y la movilidad. Ya los hemos incluido en cada sesión.', 2);
    if (p.age >= 60 || (b && b >= 35)) add('Salud', '🩺', 'Revisión médica', 'Antes de aumentar la intensidad es recomendable una revisión médica, sobre todo si hay hipertensión, diabetes o problemas cardiacos.', 0);
    if (b && b >= 30) add('Salud', '🦶', 'Bajo impacto', 'Hemos eliminado saltos para proteger articulaciones. Caminar a diario y la fuerza son la mejor combinación para perder grasa de forma sostenible.', 1);

    return R.sort((a, b) => a.prio - b.prio);
  }

  return { refreshMobility, mobMin, DAYS, DAYS_S, GOALS, assess, generate, prescribe, family, allowed, hasEq, pick, estimateMin, entriesFor, setVal, applyProgress, swapExercise, recommendations, energy, bmi, bmiLabel, lowImpact, nextIn, DAY_TPL };
})();
