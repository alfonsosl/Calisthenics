/*
 * Modo entrenamiento: subaplicación a pantalla completa.
 * Calentamiento guiado -> series con registro -> descansos cronometrados ->
 * finisher por intervalos -> vuelta a la calma -> resumen y progresión.
 * Los temporizadores usan marcas de tiempo absolutas, así que siguen siendo
 * correctos aunque la pantalla se apague o la app pase a segundo plano.
 */
const Workout = (() => {
  const S = () => Store.get();
  const { esc } = U;
  let W = null; // estado activo (también se guarda en Store.active)
  let tickId = null;
  let audio = null;
  let wakeLock = null;
  let lastBeep = null;

  /* ---------- Sonido, vibración y pantalla ---------- */
  function beep(freq = 880, ms = 120, vol = 0.25) {
    if (!S().settings.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = freq; o.type = 'sine';
      g.gain.setValueAtTime(vol, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + ms / 1000);
      o.connect(g); g.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + ms / 1000 + 0.02);
    } catch (e) { /* sin audio */ }
  }
  function buzz(p) { if (S().settings.vibrate && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* noop */ } }
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { /* no soportado */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && W) { keepAwake(); render(); } });

  /* ---------- Construcción de pasos ---------- */
  function buildSteps(day) {
    const steps = [];
    for (const id of day.warmup) steps.push({ k: 'warm', id, secs: MOBILITY[id].secs });
    day.items.forEach((it, ii) => {
      const ex = EX[it.exId];
      for (let s = 0; s < it.sets; s++) {
        if (ex.type === 'time' && ex.uni) {
          steps.push({ k: 'set', ii, s, side: 1 });
          steps.push({ k: 'switch', ii, s, secs: 5 });
          steps.push({ k: 'set', ii, s, side: 2 });
        } else steps.push({ k: 'set', ii, s });
        const lastOfAll = ii === day.items.length - 1 && s === it.sets - 1;
        if (!lastOfAll) steps.push({ k: 'rest', secs: it.rest, ii, s });
      }
    });
    if (day.finisher) {
      const f = day.finisher;
      steps.push({ k: 'rest', secs: 60, fin: true });
      for (let r = 0; r < f.rounds; r++) f.ids.forEach((id, j) => {
        steps.push({ k: 'int', id, secs: f.work, r, j });
        const last = r === f.rounds - 1 && j === f.ids.length - 1;
        if (!last) steps.push({ k: 'irest', secs: j === f.ids.length - 1 ? f.rest * 2 : f.rest, r, j });
      });
    }
    for (const id of day.cooldown) steps.push({ k: 'cool', id, secs: MOBILITY[id].secs });
    steps.push({ k: 'summary' });
    return steps;
  }

  function start(dayIndex) {
    const st = S();
    if (st.active && !confirm('Ya tienes una sesión a medias. ¿Empezar una nueva y descartarla?')) { resume(); return; }
    const day = st.plan.days[dayIndex];
    W = { dayIndex, day: JSON.parse(JSON.stringify(day)), steps: buildSteps(day), i: 0, startedAt: Date.now(), results: {}, timer: null, finDone: false, feeling: 0, notes: '', inputs: {} };
    st.active = W; Store.save();
    open();
  }
  function resume() { W = S().active; if (!W) return; open(); }

  function open() {
    let el = document.getElementById('workout');
    if (!el) { el = document.createElement('div'); el.id = 'workout'; document.body.appendChild(el); }
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    try { history.pushState({ workout: 1 }, ''); } catch (e) { /* noop */ }
    keepAwake();
    enterStep(false);
    clearInterval(tickId);
    tickId = setInterval(tick, 250);
  }
  function close() {
    clearInterval(tickId); tickId = null;
    const el = document.getElementById('workout');
    if (el) { el.innerHTML = ''; el.classList.add('hidden'); }
    document.body.style.overflow = '';
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    W = null;
    App.render();
  }
  const isOpen = () => !!W && !!tickId;
  function save() { S().active = W; Store.save(); }

  /* ---------- Navegación entre pasos ---------- */
  const cur = () => W.steps[W.i];
  const timed = st => ['warm', 'cool', 'rest', 'int', 'irest', 'switch'].includes(st.k);

  function enterStep(fresh = true) {
    const st = cur();
    lastBeep = null;
    if (fresh || !W.timer) {
      W.timer = timed(st) ? { end: Date.now() + st.secs * 1000, total: st.secs, paused: null } : null;
      if (st.k === 'set') W.timer = null;
    }
    if (st.k === 'int' && W.i > 0) W.finDone = true;
    save();
    render();
  }
  function next() {
    if (W.i < W.steps.length - 1) { W.i++; enterStep(); }
  }
  function prev() {
    let j = W.i - 1;
    while (j > 0 && ['rest', 'irest', 'switch'].includes(W.steps[j].k)) j--;
    if (j >= 0) { W.i = j; enterStep(); }
  }
  function remaining() {
    const t = W.timer;
    if (!t) return 0;
    return t.paused != null ? t.paused : Math.max(0, (t.end - Date.now()) / 1000);
  }

  function tick() {
    if (!W) return;
    const el = document.getElementById('workout');
    const clock = el && el.querySelector('#wo-clock');
    if (clock) clock.textContent = U.fmt((Date.now() - W.startedAt) / 1000);
    const st = cur();
    const t = W.timer;
    if (t && t.mode === 'hold') {
      // Ejercicio por tiempo en curso (cuenta hacia arriba)
      const el2 = el.querySelector('#hold-num');
      const secs = (Date.now() - t.start) / 1000;
      if (el2) el2.textContent = Math.floor(secs);
      const it = W.day.items[st.ii];
      const ring = el.querySelector('.ring .fg');
      if (ring) ring.style.strokeDashoffset = String(ringLen * (1 - Math.min(1, secs / it.target[1])));
      const s = Math.floor(secs);
      if (s !== lastBeep && (s === it.target[0] || s === it.target[1])) { lastBeep = s; beep(s === it.target[1] ? 1320 : 990, 180); buzz(s === it.target[1] ? [120, 80, 120] : 80); }
      return;
    }
    if (t && t.mode === 'prep') {
      const left = Math.ceil((t.end - Date.now()) / 1000);
      const n = el.querySelector('#prep-num');
      if (n) n.textContent = Math.max(0, left);
      if (left !== lastBeep && left > 0 && left <= 3) { lastBeep = left; beep(660); }
      if (left <= 0) { beep(1100, 250); buzz(150); W.timer = { mode: 'hold', start: Date.now() }; save(); render(); }
      return;
    }
    if (!t || !timed(st) || t.paused != null) return;
    const left = remaining();
    const n = el.querySelector('#t-num');
    if (n) n.textContent = U.fmt(Math.ceil(left));
    const ring = el.querySelector('.ring .fg');
    if (ring) ring.style.strokeDashoffset = String(ringLen * (1 - left / t.total));
    const sec = Math.ceil(left);
    if (sec !== lastBeep && sec > 0 && sec <= 3) { lastBeep = sec; beep(660); }
    if (left <= 0) {
      beep(1100, 300); buzz([200, 100, 200]);
      next();
    }
  }

  /* ---------- Registro de series ---------- */
  function lastResults(exId) {
    const h = Planner.entriesFor(S().sessions, exId);
    return h.length ? h[h.length - 1].sets : null;
  }
  function defaultVal(it, s) {
    const key = it.exId + ':' + s;
    if (W.inputs[key] != null) return W.inputs[key];
    const last = lastResults(it.exId);
    let v = it.target[0];
    if (last && last[s] && last[s].done) v = Math.min(it.target[1], Planner.setVal(last[s]) + (it.type === 'time' ? 0 : 1));
    if (it.type === 'time') v = it.target[0];
    return v;
  }
  function logSet(val, done = true) {
    const st = cur();
    const it = W.day.items[st.ii];
    const arr = W.results[st.ii] || (W.results[st.ii] = []);
    const rec = it.type === 'time' ? { secs: Math.round(val), done } : { reps: Math.round(val), done };
    if (st.side === 2 && arr[st.s]) {
      // Ejercicio unilateral por tiempo: se registra el lado más débil
      if (done) arr[st.s].secs = Math.min(arr[st.s].secs, rec.secs);
    } else arr[st.s] = rec;
    W.timer = null;
    save();
    next();
  }

  /* ---------- Render ---------- */
  const ringLen = 2 * Math.PI * 54;
  function ring(numHtml, frac, cls = '') {
    return `<div class="ring ${cls}"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="54"/><circle class="fg" cx="60" cy="60" r="54" stroke-dasharray="${ringLen}" style="stroke-dashoffset:${ringLen * (1 - frac)}"/></svg><div class="num">${numHtml}</div></div>`;
  }
  function header(title) {
    const pct = W.i / (W.steps.length - 1) * 100;
    return `<div class="wo-top"><button class="icon-btn" data-wo="exit" aria-label="Salir">✕</button><div class="ttl"><b>${esc(W.day.name)}</b><span class="small muted">${title}</span></div><span class="clock" id="wo-clock">${U.fmt((Date.now() - W.startedAt) / 1000)}</span></div><div class="wo-prog"><div style="width:${pct}%"></div></div>`;
  }
  function setDots(it, s) {
    return `<div class="sets-dots">${Array.from({ length: it.sets }, (_, k) => `<i class="${k < s ? 'done' : k === s ? 'cur' : ''}"></i>`).join('')}</div>`;
  }
  function nextInfo() {
    for (let j = W.i + 1; j < W.steps.length; j++) {
      const s = W.steps[j];
      if (s.k === 'set') { const it = W.day.items[s.ii]; const ex = EX[it.exId]; return { fig: ex.id, name: ex.n, sub: `Serie ${s.s + 1} de ${it.sets} · ${U.targetText(it, ex)}` }; }
      if (s.k === 'int') return { fig: s.id, name: EX[s.id].n, sub: `Finisher · ronda ${s.r + 1} · ${s.secs}s` };
      if (s.k === 'cool') return { fig: MOBILITY[s.id].fig, name: MOBILITY[s.id].n, sub: 'Vuelta a la calma' };
      if (s.k === 'summary') return { fig: null, name: 'Fin de la sesión', sub: '¡Ya casi está!' };
    }
    return null;
  }
  function nextCard() {
    const n = nextInfo();
    if (!n) return '';
    return `<div class="small muted" style="margin:4px 0 6px">A continuación</div><div class="next-card">${n.fig && Fig.has(n.fig) ? `<div class="thumb">${Fig.svg(n.fig)}</div>` : '<div class="thumb" style="display:grid;place-items:center;font-size:26px">🏁</div>'}<div class="grow"><b>${esc(n.name)}</b><div class="small muted">${esc(n.sub)}</div></div></div>`;
  }
  const timerControls = () => {
    const paused = W.timer && W.timer.paused != null;
    return `<div class="row"><button class="btn ghost" data-wo="prev" aria-label="Anterior">⏮</button><button class="btn" data-wo="pause">${paused ? '▶ Reanudar' : '⏸ Pausa'}</button><button class="btn ghost" data-wo="skip">Saltar ⏭</button></div>`;
  };

  function viewMob(st, phase) {
    const m = MOBILITY[st.id];
    const left = remaining();
    const n = W.steps.filter(s => s.k === st.k).length;
    const idx = W.steps.filter((s, j) => s.k === st.k && j <= W.i).length;
    return `${header(`${phase} ${idx}/${n}`)}<div class="wo-body">
      <div class="phase">${phase}</div><h2 class="wo-name">${esc(m.n)}</h2><p class="muted">${esc(m.desc)}</p>
      ${m.fig && Fig.has(m.fig) ? `<div class="wo-fig">${Fig.svg(m.fig, { animate: true })}</div>` : ''}
      ${ring(`<div><b id="t-num">${U.fmt(Math.ceil(left))}</b></div>`, left / W.timer.total, 'small work')}
      <div class="wo-actions">${timerControls()}</div></div>`;
  }

  function viewSet(st) {
    const it = W.day.items[st.ii];
    const ex = EX[it.exId];
    const last = lastResults(ex.id);
    const lastTxt = last ? last.map(x => (x.done ? Planner.setVal(x) : '–')).join(' · ') + (ex.type === 'time' ? ' s' : '') : null;
    const side = st.side ? ` · lado ${st.side === 1 ? 'derecho' : 'izquierdo'}` : '';
    const head = `${header(`Ejercicio ${st.ii + 1}/${W.day.items.length}`)}<div class="wo-body">
      <div class="phase">${it.role === 'skill' ? 'Habilidad' : 'Serie'} ${st.s + 1} de ${it.sets}${side}</div>
      <h2 class="wo-name">${esc(ex.n)}</h2>
      <div class="target">Objetivo: <b>${U.targetText(it, ex)}</b></div>
      ${setDots(it, st.s)}
      <div class="wo-fig">${Fig.svg(ex.id, { animate: true })}</div>
      ${lastTxt ? `<div class="lastline">Última vez: ${lastTxt}</div>` : '<div class="lastline">Primera vez: elige una cifra cómoda con buena técnica.</div>'}
      <details><summary>Claves técnicas</summary><ul class="cues small">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details>`;
    if (ex.type === 'time') {
      const t = W.timer;
      if (t && t.mode === 'prep') {
        return head + `${ring(`<div><b id="prep-num">${Math.max(0, Math.ceil((t.end - Date.now()) / 1000))}</b><span>Prepárate</span></div>`, 1)}<div class="wo-actions"><button class="btn ghost block" data-wo="cancel-hold">Cancelar</button></div></div>`;
      }
      if (t && t.mode === 'hold') {
        const secs = (Date.now() - t.start) / 1000;
        return head + `${ring(`<div><b id="hold-num">${Math.floor(secs)}</b><span>segundos · objetivo ${it.target[0]}–${it.target[1]}</span></div>`, Math.min(1, secs / it.target[1]), 'work')}<div class="wo-actions"><button class="btn primary lg block" data-wo="stop-hold">⏹ Terminar</button></div></div>`;
      }
      const v = defaultVal(it, st.s);
      return head + `<div class="wo-actions">
        <button class="btn primary lg block" data-wo="start-hold">▶ Iniciar (${S().settings.prep}s para prepararte)</button>
        <details><summary>Registrar manualmente</summary>
          <div class="stepper"><button data-wo="dec" aria-label="Menos">−</button><div class="val"><span id="val">${v}</span><span class="unit">segundos</span></div><button data-wo="inc" aria-label="Más">+</button></div>
          <button class="btn block" data-wo="done">Guardar ${'serie'}</button></details>
        <button class="btn ghost block sm" data-wo="skipset">Saltar serie</button></div></div>`;
    }
    const v = defaultVal(it, st.s);
    return head + `<div class="stepper"><button data-wo="dec" aria-label="Menos">−</button><div class="val"><span id="val">${v}</span><span class="unit">${ex.uni ? 'reps por lado' : 'repeticiones'}</span></div><button data-wo="inc" aria-label="Más">+</button></div>
      <div class="wo-actions"><button class="btn primary lg block" data-wo="done">✓ Serie completada</button><button class="btn ghost block sm" data-wo="skipset">Saltar serie</button></div></div>`;
  }

  function viewRest(st, label = 'Descanso') {
    const left = remaining();
    const paused = W.timer.paused != null;
    return `${header(label)}<div class="wo-body">
      <div class="phase rest">${label}${paused ? ' · en pausa' : ''}</div>
      ${ring(`<div><b id="t-num">${U.fmt(Math.ceil(left))}</b><span>${st.fin ? 'Prepárate para el finisher' : 'Respira y recupera'}</span></div>`, left / W.timer.total)}
      <div class="row" style="justify-content:center;gap:10px;margin-bottom:14px"><button class="btn sm ghost" data-wo="minus">−15 s</button><button class="btn sm ghost" data-wo="pause">${paused ? '▶' : '⏸'}</button><button class="btn sm ghost" data-wo="plus">+15 s</button></div>
      ${nextCard()}
      <div class="wo-actions"><button class="btn primary lg block" data-wo="skip">Saltar descanso ⏭</button></div></div>`;
  }

  function viewInterval(st) {
    const ex = EX[st.id];
    const f = W.day.finisher;
    const left = remaining();
    return `${header(`Finisher · ronda ${st.r + 1}/${f.rounds}`)}<div class="wo-body">
      <div class="phase">⚡ Finisher · ronda ${st.r + 1} de ${f.rounds}</div><h2 class="wo-name">${esc(ex.n)}</h2><p class="muted small">Máximas repeticiones con buena técnica</p>
      <div class="wo-fig">${Fig.svg(ex.id, { animate: true })}</div>
      ${ring(`<div><b id="t-num">${U.fmt(Math.ceil(left))}</b></div>`, left / W.timer.total, 'small work')}
      <div class="wo-actions">${timerControls()}</div></div>`;
  }

  function buildSession() {
    const day = W.day;
    return {
      id: U.uid(), date: W.startedAt, end: Date.now(), dayIndex: W.dayIndex, dayName: day.name,
      duration: Math.round((Date.now() - W.startedAt) / 1000),
      entries: day.items.map((it, ii) => ({ exId: it.exId, target: it.target, sets: (W.results[ii] || []).filter(Boolean) })),
      finisher: !!(day.finisher && W.finDone), feeling: W.feeling, notes: W.notes,
    };
  }

  function viewSummary() {
    const st = S();
    const ses = buildSession();
    const done = ses.entries.reduce((a, e) => a + e.sets.filter(x => x.done).length, 0);
    const reps = ses.entries.reduce((a, e) => a + e.sets.reduce((b, x) => b + (x.done && x.reps ? x.reps : 0), 0), 0);
    const holds = ses.entries.reduce((a, e) => a + e.sets.reduce((b, x) => b + (x.done && x.secs ? x.secs : 0), 0), 0);
    // Récords personales
    const prs = [];
    for (const e of ses.entries) {
      const best = Math.max(0, ...e.sets.filter(x => x.done).map(Planner.setVal));
      const prev = Planner.entriesFor(st.sessions, e.exId).reduce((m, h) => Math.max(m, ...h.sets.filter(x => x.done).map(Planner.setVal)), 0);
      if (best > 0 && prev > 0 && best > prev) prs.push(`${EX[e.exId].n}: ${best}${EX[e.exId].type === 'time' ? ' s' : ' reps'}`);
    }
    // Vista previa de la progresión (sin aplicar)
    const planCopy = JSON.parse(JSON.stringify(st.plan));
    const changes = Planner.applyProgress(planCopy, ses, st.profile, st.sessions, false);
    const faces = ['😫', '😓', '🙂', '😀', '🤩'];
    return `${header('Resumen')}<div class="wo-body">
      <div class="center" style="font-size:48px;margin-top:6px">🎉</div><h2 class="center">¡Sesión terminada!</h2>
      <div class="stats"><div class="stat"><b>${U.fmt(ses.duration)}</b><span>Duración</span></div><div class="stat"><b>${done}</b><span>Series</span></div><div class="stat"><b>${reps || holds + 's'}</b><span>${reps ? 'Repeticiones' : 'En tensión'}</span></div></div>
      ${prs.length ? `<div class="card tight"><b class="pr">🏆 Nuevos récords</b><div class="small">${prs.map(esc).join('<br>')}</div></div>` : ''}
      ${changes.length ? `<div class="card tight"><b>Progresión</b><p class="small muted" style="margin:2px 0 8px">${st.settings.auto ? 'Se aplicará al guardar:' : 'Sugerencias (progresión automática desactivada):'}</p>${changes.map(App.changeHtml).join('')}</div>` : '<p class="small muted center">Sigue con las mismas variantes: intenta sumar una repetición por serie la próxima vez.</p>'}
      <label class="field"><span>¿Qué tal ha ido?</span></label>
      <div class="feel">${faces.map((f, k) => `<button class="${W.feeling === k + 1 ? 'on' : ''}" data-wo="feel" data-v="${k + 1}">${f}</button>`).join('')}</div>
      <label class="field" style="margin-top:14px"><span>Notas (opcional)</span><textarea id="wo-notes" placeholder="Molestias, sensaciones, ajustes...">${esc(W.notes)}</textarea></label>
      <div class="wo-actions"><button class="btn primary lg block" data-wo="save">Guardar sesión</button><button class="btn ghost block sm" data-wo="discard">Descartar sin guardar</button></div></div>`;
  }

  function render() {
    const el = document.getElementById('workout');
    if (!el || !W) return;
    const st = cur();
    let html;
    switch (st.k) {
      case 'warm': html = viewMob(st, 'Calentamiento'); break;
      case 'cool': html = viewMob(st, 'Vuelta a la calma'); break;
      case 'set': html = viewSet(st); break;
      case 'rest': html = viewRest(st); break;
      case 'switch': html = viewRest(st, 'Cambia de lado'); break;
      case 'irest': html = viewRest(st, 'Descanso'); break;
      case 'int': html = viewInterval(st); break;
      default: html = viewSummary();
    }
    el.innerHTML = `<div class="wo">${html}</div>`;
    el.scrollTop = 0;
    Fig.activate(el);
  }

  /* ---------- Salida ---------- */
  function exitSheet() {
    App.openSheet(`<div class="sheet-head"><h2>¿Salir del entrenamiento?</h2><button class="icon-btn" data-act="close">✕</button></div>
      <p class="muted">Puedes terminar ahora y guardar lo que llevas, o salir y continuar más tarde desde Inicio.</p>
      <div class="stack"><button class="btn primary block" data-wo="finish-now">Terminar y guardar lo hecho</button><button class="btn block" data-wo="later">Continuar más tarde</button><button class="btn danger block" data-wo="discard">Descartar sesión</button></div>`, 'exit');
  }
  function onBack() {
    if (document.querySelector('.sheet-wrap')) { App.closeSheet(true); }
    else exitSheet();
    try { history.pushState({ workout: 1 }, ''); } catch (e) { /* noop */ }
  }

  /* ---------- Acciones ---------- */
  const act = {
    exit: () => exitSheet(),
    'finish-now': () => { App.closeSheet(true); W.i = W.steps.length - 1; enterStep(); },
    later: () => { App.closeSheet(true); save(); close(); },
    discard: () => {
      if (!confirm('¿Descartar esta sesión? No se guardará nada.')) return;
      App.closeSheet(true);
      S().active = null; Store.save(); close();
    },
    prev: () => prev(),
    skip: () => next(),
    pause: () => {
      const t = W.timer;
      if (!t) return;
      if (t.paused != null) { t.end = Date.now() + t.paused * 1000; t.paused = null; } else t.paused = remaining();
      save(); render();
    },
    plus: () => { const t = W.timer; if (t.paused != null) t.paused += 15; else t.end += 15000; t.total += 15; save(); tick(); },
    minus: () => { const t = W.timer; if (t.paused != null) t.paused = Math.max(1, t.paused - 15); else t.end = Math.max(Date.now() + 1000, t.end - 15000); save(); tick(); },
    inc: () => { const st = cur(); const it = W.day.items[st.ii]; const k = it.exId + ':' + st.s; W.inputs[k] = defaultVal(it, st.s) + (it.type === 'time' ? 5 : 1); document.getElementById('val').textContent = W.inputs[k]; },
    dec: () => { const st = cur(); const it = W.day.items[st.ii]; const k = it.exId + ':' + st.s; W.inputs[k] = Math.max(0, defaultVal(it, st.s) - (it.type === 'time' ? 5 : 1)); document.getElementById('val').textContent = W.inputs[k]; },
    done: () => { const st = cur(); const it = W.day.items[st.ii]; logSet(defaultVal(it, st.s)); },
    skipset: () => logSet(0, false),
    'start-hold': () => { W.timer = { mode: 'prep', end: Date.now() + S().settings.prep * 1000 }; lastBeep = null; save(); render(); },
    'cancel-hold': () => { W.timer = null; save(); render(); },
    'stop-hold': () => { const secs = (Date.now() - W.timer.start) / 1000; beep(880, 150); logSet(secs); },
    feel: el => { W.feeling = +el.dataset.v; const ta = document.getElementById('wo-notes'); if (ta) W.notes = ta.value; save(); render(); },
    save: () => {
      const ta = document.getElementById('wo-notes');
      if (ta) W.notes = ta.value;
      const st = S();
      const ses = buildSession();
      if (!ses.entries.some(e => e.sets.some(x => x.done)) && !confirm('No has registrado ninguna serie. ¿Guardar igualmente?')) return;
      st.sessions.push(ses);
      ses.changes = Planner.applyProgress(st.plan, ses, st.profile, st.sessions, st.settings.auto);
      st.active = null;
      Store.save();
      close();
      App.go('home');
      App.toast(ses.changes.some(c => c.applied && c.kind === 'up') ? '¡Sesión guardada y nivel subido! 🚀' : 'Sesión guardada 💪');
    },
  };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-wo]');
    if (!el || !W) return;
    // Desbloquea el audio en iOS con el primer toque
    if (!audio) try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) { /* noop */ }
    const fn = act[el.dataset.wo];
    if (fn) { e.preventDefault(); fn(el); }
  });

  return { start, resume, isOpen, onBack };
})();
