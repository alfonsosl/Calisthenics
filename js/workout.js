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


  async function start(dayIndex) {
    const st = S();
    if (st.active && !(await App.ask('Ya tienes una sesión a medias. ¿Empezar una nueva y descartar la anterior?', 'Empezar nueva', true))) { resume(); return; }
    const day = st.plan.days[dayIndex];
    W = { dayIndex, day: JSON.parse(JSON.stringify(day)), steps: buildSteps(day), i: 0, startedAt: Date.now(), results: {}, timer: null, finDone: false, feeling: 0, notes: '', inputs: {}, aborted: {}, prevEntries: [], issues: [], stopped: null };
    st.active = W; Store.save();
    open();
  }
  function resume() { W = S().active; if (!W) return; W.aborted = W.aborted || {}; W.prevEntries = W.prevEntries || []; W.issues = W.issues || []; open(); }

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
    if (window.Music) Music.startPoll();
  }
  function close() {
    clearInterval(tickId); tickId = null;
    if (window.Music) Music.stopPoll();
    const el = document.getElementById('workout');
    if (el) { el.innerHTML = ''; el.classList.add('hidden'); }
    document.body.style.overflow = '';
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    W = null;
    App.render();
  }
  const isOpen = () => !!W && !!tickId;
  function save() { S().active = W; Store.save(); }

  /* ---------- Temporizadores ----------
   * W.timer según el paso:
   *   cuenta atrás (calentamiento, descanso, intervalo, estiramiento): { kind:'cd', total, started, end, paused }
   *   serie por repeticiones: null (lista) -> { kind:'reps', start, pausedAt } -> { kind:'log', secs }
   *   serie por tiempo: null (lista) -> { kind:'prep', end } -> { kind:'hold', start, pausedAt }
   */
  const cur = () => W.steps[W.i];
  const cdStep = st => ['warm', 'cool', 'rest', 'int', 'irest', 'switch'].includes(st.k);
  const restStep = st => ['rest', 'irest', 'switch'].includes(st.k);

  function newTimer(st) {
    if (!cdStep(st)) return null;
    // Los descansos arrancan solos; los ejercicios esperan al botón «Empezar»
    const auto = !!(restStep(st) || S().settings.autoStart);
    return { kind: 'cd', total: st.secs, started: auto, end: auto ? Date.now() + st.secs * 1000 : null, paused: null };
  }
  function enterStep(fresh = true) {
    const st = cur();
    lastBeep = null;
    if (fresh || W.timer === undefined || (W.timer === null && cdStep(st))) W.timer = newTimer(st);
    if (st.k === 'int' && W.i > 0 && W.timer && W.timer.started) W.finDone = true;
    save();
    render();
  }
  function goTo(j) { W.i = Math.max(0, Math.min(W.steps.length - 1, j)); enterStep(); }
  function next() { if (W.i < W.steps.length - 1) goTo(W.i + 1); }
  function prev() {
    let j = W.i - 1;
    while (j > 0 && restStep(W.steps[j])) j--;
    if (j >= 0) goTo(j);
  }
  function remaining() {
    const t = W.timer;
    if (!t || t.kind !== 'cd') return 0;
    if (!t.started) return t.total;
    return t.paused != null ? t.paused : Math.max(0, (t.end - Date.now()) / 1000);
  }
  const elapsed = t => ((t.pausedAt || Date.now()) - t.start) / 1000;
  function isRunning() {
    const t = W && W.timer;
    if (!t) return false;
    if (t.kind === 'cd') return t.started && t.paused == null;
    if (t.kind === 'reps' || t.kind === 'hold') return !t.pausedAt;
    return t.kind === 'prep';
  }
  function pauseTimer() {
    const t = W.timer;
    if (!t) return;
    if (t.kind === 'cd' && t.started && t.paused == null) t.paused = remaining();
    else if ((t.kind === 'reps' || t.kind === 'hold') && !t.pausedAt) t.pausedAt = Date.now();
    else if (t.kind === 'prep') W.timer = null;
  }
  function resumeTimer() {
    const t = W.timer;
    if (!t) return;
    if (t.kind === 'cd' && t.paused != null) { t.end = Date.now() + t.paused * 1000; t.paused = null; }
    else if ((t.kind === 'reps' || t.kind === 'hold') && t.pausedAt) { t.start += Date.now() - t.pausedAt; t.pausedAt = null; }
  }
  function startCountdown() {
    const t = W.timer;
    if (!t || t.kind !== 'cd' || t.started) return;
    t.started = true; t.end = Date.now() + t.total * 1000;
    if (cur().k === 'int') W.finDone = true;
    beep(1100, 160); buzz(80);
  }

  function tick() {
    if (!W) return;
    const el = document.getElementById('workout');
    if (!el) return;
    const clock = el.querySelector('#wo-clock');
    if (clock) clock.textContent = U.fmt((Date.now() - W.startedAt) / 1000);
    if (W.stopped) return;
    const st = cur();
    const t = W.timer;
    if (!t) return;
    if (t.kind === 'reps') {
      const n = el.querySelector('#run-num');
      if (n) n.textContent = U.fmt(elapsed(t));
      return;
    }
    if (t.kind === 'hold') {
      if (t.pausedAt) return;
      const secs = elapsed(t);
      const n = el.querySelector('#hold-num');
      if (n) n.textContent = Math.floor(secs);
      const it = W.day.items[st.ii];
      const r = el.querySelector('.ring .fg');
      if (r) r.style.strokeDashoffset = String(ringLen * (1 - Math.min(1, secs / it.target[1])));
      const s = Math.floor(secs);
      if (s !== lastBeep && (s === it.target[0] || s === it.target[1])) { lastBeep = s; beep(s === it.target[1] ? 1320 : 990, 180); buzz(s === it.target[1] ? [120, 80, 120] : 80); }
      return;
    }
    if (t.kind === 'prep') {
      const left = Math.ceil((t.end - Date.now()) / 1000);
      const n = el.querySelector('#prep-num');
      if (n) n.textContent = Math.max(0, left);
      if (left !== lastBeep && left > 0 && left <= 3) { lastBeep = left; beep(660); }
      if (left <= 0) { beep(1100, 250); buzz(150); W.timer = { kind: 'hold', start: Date.now(), pausedAt: null }; save(); render(); }
      return;
    }
    if (t.kind !== 'cd' || !t.started || t.paused != null) return;
    const left = remaining();
    const n = el.querySelector('#t-num');
    if (n) n.textContent = U.fmt(Math.ceil(left));
    const r = el.querySelector('.ring .fg');
    if (r) r.style.strokeDashoffset = String(ringLen * (1 - left / t.total));
    const sec = Math.ceil(left);
    if (sec !== lastBeep && sec > 0 && sec <= 3) { lastBeep = sec; beep(660); }
    if (left <= 0) { beep(1100, 300); buzz([200, 100, 200]); next(); }
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
    if (it.type !== 'time' && last && last[s] && last[s].done) v = Math.min(it.target[1], Planner.setVal(last[s]) + 1);
    return v;
  }
  function logSet(val, done = true) {
    const st = cur();
    const it = W.day.items[st.ii];
    const arr = W.results[st.ii] || (W.results[st.ii] = []);
    const rec = it.type === 'time' ? { secs: Math.round(val), done } : { reps: Math.round(val), done };
    if (st.side === 2 && arr[st.s] && arr[st.s].secs != null) {
      // Ejercicio unilateral por tiempo: se registra el lado más débil
      if (done) arr[st.s].secs = Math.min(arr[st.s].secs, rec.secs);
    } else arr[st.s] = rec;
    W.timer = null;
    save();
    next();
  }

  /* ---------- Parada (botón ✋) ---------- */
  // Ejercicio al que se refiere la parada: el actual o, en un descanso, el siguiente
  function contextIi() {
    const st = cur();
    if (st.k === 'set' || st.k === 'switch') return st.ii;
    if (st.k === 'rest' && !st.fin) for (let j = W.i + 1; j < W.steps.length; j++) if (W.steps[j].k === 'set') return W.steps[j].ii;
    return null;
  }
  async function stop() {
    if (W.stopped) return;
    pauseTimer();
    W.stopped = { at: Date.now(), music: false };
    save();
    render();
    buzz(120);
    if (window.Music) W.stopped.music = await Music.pauseForStop();
  }
  function resumeFromStop() {
    const m = W.stopped && W.stopped.music;
    W.stopped = null;
    resumeTimer();
    save();
    render();
    if (m && window.Music) Music.play();
  }
  function skipExercise() {
    const ii = contextIi();
    const st = cur();
    W.stopped = null;
    if (ii == null) { // calentamiento, intervalo o estiramiento: solo este paso
      const name = st.k === 'int' ? EX[st.id].n : MOBILITY[st.id] ? MOBILITY[st.id].n : '';
      if (name) W.issues.push(`Saltado por molestia: ${name}`);
      next();
      return;
    }
    W.aborted[ii] = true;
    W.issues.push(`Molestia: se saltó ${EX[W.day.items[ii].exId].n}`);
    let j = W.i;
    while (j < W.steps.length - 1 && ((W.steps[j].ii === ii && ['set', 'switch', 'rest'].includes(W.steps[j].k)) || (W.steps[j].k === 'rest' && W.steps[j + 1] && W.steps[j + 1].ii === ii))) j++;
    goTo(j);
    App.toast('Ejercicio saltado. No contará para tu progresión.');
  }
  function easierVariant() {
    const ii = contextIi();
    if (ii == null) return;
    const it = W.day.items[ii];
    const easier = Planner.nextIn(it.exId, S().profile, -1);
    if (!easier) { App.toast('Ya es la variante más fácil. Puedes saltar el ejercicio.'); return; }
    const done = (W.results[ii] || []).filter(Boolean);
    if (done.length) W.prevEntries.push({ exId: it.exId, target: it.target, sets: done, aborted: true });
    W.issues.push(`Cambio a variante más fácil: ${EX[it.exId].n} → ${easier.n}`);
    W.day.items[ii] = { ...Planner.prescribe(easier, S().profile, it.role), sets: it.sets };
    W.results[ii] = [];
    W.aborted[ii] = true; // sesión adaptada: no se usa para subir o bajar de nivel
    W.stopped = null;
    // Vuelve al inicio de la serie actual de ese ejercicio
    if (cur().k !== 'set' || cur().ii !== ii) { let j = W.i; while (j < W.steps.length - 1 && !(W.steps[j].k === 'set' && W.steps[j].ii === ii)) j++; W.i = j; }
    W.timer = null;
    save(); render();
    App.toast(`Cambiado a ${easier.n}`);
  }
  function stopOverlay() {
    const ii = contextIi();
    const st = cur();
    const exName = ii != null ? EX[W.day.items[ii].exId].n : st.k === 'int' ? EX[st.id].n : (MOBILITY[st.id] || {}).n;
    const easier = ii != null ? Planner.nextIn(W.day.items[ii].exId, S().profile, -1) : null;
    return `<div class="stop-wrap" role="dialog" aria-modal="true" aria-labelledby="stop-t"><div class="stop-card">
      <div class="stop-ico">✋</div><h2 id="stop-t">Entrenamiento parado</h2>
      <p class="muted">El tiempo está detenido${W.stopped.music ? ' y la música en pausa' : ''}. Tómate lo que necesites.</p>
      <div class="stack">
        <button class="btn primary lg block" data-wo="resume-stop">▶ Continuar</button>
        ${easier ? `<button class="btn block" data-wo="easier">⬇️ Seguir con algo más fácil<span class="small muted" style="display:block;font-weight:500">${esc(easier.n)}</span></button>` : ''}
        ${exName ? `<button class="btn block" data-wo="skip-ex">⏭ Me molesta: saltar ${esc(exName)}</button>` : ''}
        <button class="btn ghost block" data-wo="stop-finish">🏁 Terminar y guardar lo hecho</button>
        <button class="btn ghost block" data-wo="later">🚪 Salir y seguir más tarde</button>
      </div>
      <p class="center" style="margin:12px 0 0"><button class="link" data-wo="discard">Descartar la sesión sin guardar</button></p>
      <div class="alert"><b>Para del todo y pide ayuda</b> si notas dolor en el pecho, mareo, falta de aire que no mejora al descansar, palpitaciones fuertes o un dolor intenso en una articulación. Emergencias: <a href="tel:112"><b>112</b></a>.</div>
      <p class="tiny muted">Molestia leve: baja la intensidad. Dolor agudo o punzante: no continúes con ese ejercicio hoy.</p>
    </div></div>`;
  }

  /* ---------- Render ---------- */
  const ringLen = 2 * Math.PI * 54;
  function ring(numHtml, frac, cls = '') {
    return `<div class="ring ${cls}"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="54"/><circle class="fg" cx="60" cy="60" r="54" stroke-dasharray="${ringLen}" style="stroke-dashoffset:${ringLen * (1 - frac)}"/></svg><div class="num">${numHtml}</div></div>`;
  }
  function header(title, summary) {
    const pct = W.i / (W.steps.length - 1) * 100;
    const music = window.Music ? Music.barHtml() : '';
    return `<div class="wo-top"><div class="ttl"><b>${esc(W.day.name)}</b><span class="small muted">${title}</span></div><span class="clock" id="wo-clock">${U.fmt((Date.now() - W.startedAt) / 1000)}</span>${summary ? '' : '<button class="stop-btn" data-wo="stop" aria-label="Parar el entrenamiento">✋ Parar</button>'}</div><div class="wo-prog"><div style="width:${pct}%"></div></div>${music}`;
  }
  function setDots(it, s) {
    return `<div class="sets-dots">${Array.from({ length: it.sets }, (_, k) => `<i class="${k < s ? 'done' : k === s ? 'cur' : ''}"></i>`).join('')}</div>`;
  }
  function nextInfo() {
    for (let j = W.i + 1; j < W.steps.length; j++) {
      const s = W.steps[j];
      if (s.k === 'set') { const it = W.day.items[s.ii]; const ex = EX[it.exId]; return { fig: ex.id, name: ex.n, sub: `Serie ${s.s + 1} de ${it.sets} · ${U.targetText(it, ex)}` }; }
      if (s.k === 'int') return { fig: s.id, name: EX[s.id].n, sub: `Finisher · ronda ${s.r + 1} · ${s.secs}s` };
      if (s.k === 'cool') return { fig: MOBILITY[s.id].fig, name: MOBILITY[s.id].n, sub: 'Estiramientos' };
      if (s.k === 'summary') return { fig: null, name: 'Fin de la sesión', sub: '¡Ya casi está!' };
    }
    return null;
  }
  function nextCard() {
    const n = nextInfo();
    if (!n) return '';
    return `<div class="small muted" style="margin:4px 0 6px">A continuación</div><div class="next-card">${n.fig && Fig.has(n.fig) ? `<div class="thumb">${Fig.svg(n.fig)}</div>` : '<div class="thumb" style="display:grid;place-items:center;font-size:26px">🏁</div>'}<div class="grow"><b>${esc(n.name)}</b><div class="small muted">${esc(n.sub)}</div></div></div>`;
  }
  // Controles de los pasos con cuenta atrás: Empezar / Pausa / Reanudar
  function cdControls() {
    const t = W.timer;
    const nav = `<div class="ctrl-row"><button class="btn sm" data-wo="prev">◀ Anterior</button><button class="btn sm" data-wo="skip">Saltar ▶</button></div>`;
    if (!t.started) return `<button class="btn primary lg block" data-wo="go">▶ Empezar</button><p class="hint">Colócate en posición y pulsa Empezar</p>${nav}`;
    if (t.paused != null) return `<button class="btn primary lg block" data-wo="pause">▶ Reanudar</button><p class="hint">En pausa</p>${nav}`;
    return `<button class="btn lg block" data-wo="pause">⏸ Pausa</button><p class="hint">Pasará solo al siguiente cuando acabe el tiempo</p>${nav}`;
  }
  const stateLabel = t => (!t.started ? 'Pulsa Empezar cuando estés listo' : t.paused != null ? 'En pausa' : '');

  function viewMob(st, phase) {
    const m = MOBILITY[st.id];
    const left = remaining();
    const n = W.steps.filter(s => s.k === st.k).length;
    const idx = W.steps.filter((s, j) => s.k === st.k && j <= W.i).length;
    return `${header(`${phase} ${idx}/${n}`)}<div class="wo-body">
      <div class="phase">${phase}</div><h2 class="wo-name">${esc(m.n)}</h2><p class="muted">${esc(m.desc)}</p>
      ${m.fig && Fig.has(m.fig) ? `<div class="wo-fig">${Fig.svg(m.fig, { animate: true, marks: cueMarks(m.cues) })}</div>` : ''}
      ${m.cues && m.cues.length ? `<div class="wo-keys">${App.keyList(m.cues)}</div>` : ''}
      ${ring(`<div><b id="t-num">${U.fmt(Math.ceil(left))}</b><span>${stateLabel(W.timer)}</span></div>`, left / W.timer.total, 'small work')}
      <div class="wo-actions">${cdControls()}</div></div>`;
  }

  function viewSet(st) {
    const it = W.day.items[st.ii];
    const ex = EX[it.exId];
    const t = W.timer;
    const last = lastResults(ex.id);
    const lastTxt = last ? last.map(x => (x.done ? Planner.setVal(x) : '–')).join(' · ') + (ex.type === 'time' ? ' s' : '') : null;
    const side = st.side ? ` · lado ${st.side === 1 ? 'derecho' : 'izquierdo'}` : '';
    const running = t && (t.kind === 'reps' || t.kind === 'hold' || t.kind === 'prep');
    const head = `${header(`Ejercicio ${st.ii + 1}/${W.day.items.length}`)}<div class="wo-body">
      <div class="phase">${it.role === 'skill' ? 'Habilidad' : 'Serie'} ${st.s + 1} de ${it.sets}${side}</div>
      <h2 class="wo-name">${esc(ex.n)}</h2>
      <div class="target">Objetivo: <b>${U.targetText(it, ex)}</b></div>
      ${setDots(it, st.s)}
      <div class="wo-fig">${Fig.svg(ex.id, { animate: true, marks: cueMarks(ex.cues) })}${Fig.caption(ex.id) ? `<div class="tiny muted center">${esc(Fig.caption(ex.id))}</div>` : ''}</div>
      ${running ? '' : `<div class="wo-keys">${App.keyList(ex.cues)}</div>
      ${ex.safe && ex.safe[0] ? `<p class="wo-safe">🛡️ ${esc(ex.safe[0])}</p>` : ''}
      ${lastTxt ? `<div class="lastline">Última vez: ${lastTxt}</div>` : '<div class="lastline">Primera vez: elige una cifra cómoda con buena técnica.</div>'}`}`;
    const pauseBtn = p => `<button class="btn block" data-wo="pause">${p ? '▶ Reanudar' : '⏸ Pausa'}</button>`;

    if (ex.type === 'time') {
      if (t && t.kind === 'prep') {
        return head + `${ring(`<div><b id="prep-num">${Math.max(0, Math.ceil((t.end - Date.now()) / 1000))}</b><span>Prepárate</span></div>`, 1)}<div class="wo-actions"><button class="btn ghost block" data-wo="cancel-hold">Cancelar</button></div></div>`;
      }
      if (t && t.kind === 'hold') {
        const secs = elapsed(t);
        return head + `${ring(`<div><b id="hold-num">${Math.floor(secs)}</b><span>${t.pausedAt ? 'En pausa' : `segundos · objetivo ${it.target[0]}–${it.target[1]}`}</span></div>`, Math.min(1, secs / it.target[1]), 'work')}<div class="wo-actions"><button class="btn primary lg block" data-wo="stop-hold">⏹ Terminar</button><p class="hint">Aguanta y pulsa Terminar cuando no puedas mantener la postura</p>${pauseBtn(t.pausedAt)}</div></div>`;
      }
      const v = defaultVal(it, st.s);
      return head + `<div class="wo-actions">
        <button class="btn primary lg block" data-wo="start-hold">▶ Empezar</button><p class="hint">Tendrás ${S().settings.prep} segundos para colocarte</p>
        <details><summary>Registrar sin cronómetro</summary>
          <div class="stepper"><button data-wo="dec" aria-label="Menos">−</button><div class="val"><span id="val">${v}</span><span class="unit">segundos</span></div><button data-wo="inc" aria-label="Más">+</button></div>
          <button class="btn block" data-wo="done">Guardar serie</button></details>
        <button class="btn ghost block sm" data-wo="skipset">Saltar serie</button></div></div>`;
    }
    // Series por repeticiones: Empezar -> Terminar -> anotar repeticiones
    if (t && t.kind === 'reps') {
      return head + `${ring(`<div><b id="run-num">${U.fmt(elapsed(t))}</b><span>${t.pausedAt ? 'En pausa' : 'Serie en curso'}</span></div>`, 1, 'small work')}
        <div class="wo-actions"><button class="btn primary lg block" data-wo="end-reps">✓ Terminar serie</button><p class="hint">Haz tus repeticiones y pulsa Terminar</p></div></div>`;
    }
    if (t && t.kind === 'log') {
      const v = defaultVal(it, st.s);
      return head + `<p class="center small muted" style="margin:6px 0 0">¿Cuántas has hecho${ex.uni ? ' por lado' : ''}? (${U.fmt(t.secs)})</p>
        <div class="stepper"><button data-wo="dec" aria-label="Menos">−</button><div class="val"><span id="val">${v}</span><span class="unit">${ex.uni ? 'reps por lado' : 'repeticiones'}</span></div><button data-wo="inc" aria-label="Más">+</button></div>
        <div class="wo-actions"><button class="btn primary lg block" data-wo="done">Guardar y seguir</button><p class="hint">Ajusta el número con − y + si hace falta</p></div></div>`;
    }
    return head + `<div class="wo-actions"><button class="btn primary lg block" data-wo="start-reps">▶ Empezar serie</button><p class="hint">Colócate en posición y pulsa Empezar</p>
      <div class="ctrl-row"><button class="btn sm" data-wo="log-now">Ya la hice</button><button class="btn sm" data-wo="skipset">Saltar serie ▶</button></div></div></div>`;
  }

  function viewRest(st, label = 'Descanso') {
    const left = remaining();
    const paused = W.timer.paused != null;
    return `${header(label)}<div class="wo-body">
      <div class="phase rest">${label}${paused ? ' · en pausa' : ''}</div>
      <p class="hint" style="text-align:left">${st.k === 'switch' ? 'Cambia al otro lado' : 'Descansa: el siguiente ejercicio esperará a que pulses Empezar'}</p>
      ${ring(`<div><b id="t-num">${U.fmt(Math.ceil(left))}</b><span>${st.fin ? 'Prepárate para el finisher' : 'Respira y recupera'}</span></div>`, left / W.timer.total)}
      <div class="row" style="justify-content:center;gap:10px;margin-bottom:14px"><button class="btn sm ghost" data-wo="minus">−15 s</button><button class="btn sm ghost" data-wo="pause">${paused ? '▶ Reanudar' : '⏸ Pausa'}</button><button class="btn sm ghost" data-wo="plus">+15 s</button></div>
      ${nextCard()}
      <div class="wo-actions"><button class="btn primary lg block" data-wo="skip">Saltar descanso ⏭</button></div></div>`;
  }

  function viewInterval(st) {
    const ex = EX[st.id];
    const f = W.day.finisher;
    const left = remaining();
    return `${header(`Finisher · ronda ${st.r + 1}/${f.rounds}`)}<div class="wo-body">
      <div class="phase">⚡ Finisher · ronda ${st.r + 1} de ${f.rounds}</div><h2 class="wo-name">${esc(ex.n)}</h2><p class="muted small">Máximas repeticiones con buena técnica</p>
      <div class="wo-fig">${Fig.svg(ex.id, { animate: true, marks: cueMarks(ex.cues) })}</div>
      ${ring(`<div><b id="t-num">${U.fmt(Math.ceil(left))}</b><span>${stateLabel(W.timer)}</span></div>`, left / W.timer.total, 'small work')}
      <div class="wo-actions">${cdControls()}</div></div>`;
  }

  function buildSession() {
    const day = W.day;
    const entries = day.items.map((it, ii) => ({ exId: it.exId, target: it.target, sets: (W.results[ii] || []).filter(Boolean), ...(W.aborted[ii] ? { aborted: true } : {}) }));
    return {
      id: U.uid(), date: W.startedAt, end: Date.now(), dayIndex: W.dayIndex, dayName: day.name,
      duration: Math.round((Date.now() - W.startedAt) / 1000),
      entries: (W.prevEntries || []).concat(entries),
      finisher: !!(day.finisher && W.finDone), feeling: W.feeling,
      notes: [W.notes, ...(W.issues || [])].filter(Boolean).join('\n'),
    };
  }

  function viewSummary() {
    const st = S();
    const ses = buildSession();
    const done = ses.entries.reduce((a, e) => a + e.sets.filter(x => x.done).length, 0);
    const reps = ses.entries.reduce((a, e) => a + e.sets.reduce((b, x) => b + (x.done && x.reps ? x.reps : 0), 0), 0);
    const holds = ses.entries.reduce((a, e) => a + e.sets.reduce((b, x) => b + (x.done && x.secs ? x.secs : 0), 0), 0);
    const prs = [];
    for (const e of ses.entries) {
      const best = Math.max(0, ...e.sets.filter(x => x.done).map(Planner.setVal));
      const prevBest = Planner.entriesFor(st.sessions, e.exId).reduce((m, h) => Math.max(m, ...h.sets.filter(x => x.done).map(Planner.setVal)), 0);
      if (best > 0 && prevBest > 0 && best > prevBest) prs.push(`${EX[e.exId].n}: ${best}${EX[e.exId].type === 'time' ? ' s' : ' reps'}`);
    }
    const planCopy = JSON.parse(JSON.stringify(st.plan));
    const changes = Planner.applyProgress(planCopy, ses, st.profile, st.sessions, false);
    const faces = ['😫', '😓', '🙂', '😀', '🤩'];
    return `${header('Resumen', true)}<div class="wo-body">
      <div class="center" style="font-size:48px;margin-top:6px">🎉</div><h2 class="center">¡Sesión terminada!</h2>
      <div class="stats"><div class="stat"><b>${U.fmt(ses.duration)}</b><span>Duración</span></div><div class="stat"><b>${done}</b><span>Series</span></div><div class="stat"><b>${reps || holds + 's'}</b><span>${reps ? 'Repeticiones' : 'En tensión'}</span></div></div>
      ${prs.length ? `<div class="card tight"><b class="pr">🏆 Nuevos récords</b><div class="small">${prs.map(esc).join('<br>')}</div></div>` : ''}
      ${W.issues && W.issues.length ? `<div class="card tight"><b>🩹 Incidencias</b><div class="small muted">${W.issues.map(esc).join('<br>')}</div><p class="tiny muted" style="margin:6px 0 0">Si la molestia se repite o dura más de unos días, consulta con un fisioterapeuta.</p></div>` : ''}
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
      case 'cool': html = viewMob(st, 'Estiramientos'); break;
      case 'set': html = viewSet(st); break;
      case 'rest': html = viewRest(st); break;
      case 'switch': html = viewRest(st, 'Cambia de lado'); break;
      case 'irest': html = viewRest(st, 'Descanso'); break;
      case 'int': html = viewInterval(st); break;
      default: html = viewSummary();
    }
    el.innerHTML = `<div class="wo">${html}</div>${W.stopped && st.k !== 'summary' ? stopOverlay() : ''}`;
    el.scrollTop = 0;
    Fig.activate(el);
    const first = el.querySelector('.stop-wrap [data-wo="resume-stop"]');
    if (first) first.focus();
  }

  /* ---------- Salida ---------- */
  function exitSheet() {
    pauseTimer(); save(); render();
    App.openSheet(`<div class="sheet-head"><h2>¿Salir del entrenamiento?</h2><button class="icon-btn" data-act="close">✕</button></div>
      <p class="muted">El tiempo está en pausa. Puedes terminar ahora y guardar lo que llevas, o salir y continuar más tarde desde Inicio.</p>
      <div class="stack"><button class="btn primary block" data-wo="finish-now">Terminar y guardar lo hecho</button><button class="btn block" data-wo="later">Continuar más tarde</button><button class="btn danger block" data-wo="discard">Descartar sesión</button></div>`, 'exit');
  }
  function onBack() {
    // Botón «atrás» del móvil: abre o cierra el menú de parada
    if (document.querySelector('.sheet-wrap')) { App.closeSheet(true); }
    else if (W.stopped) resumeFromStop();
    else if (cur().k === 'summary') exitSheet();
    else stop();
    try { history.pushState({ workout: 1 }, ''); } catch (e) { /* noop */ }
  }

  /* ---------- Confirmación antes de saltar ---------- */
  async function confirmSkip(msg, ok) {
    const was = isRunning();
    if (was) { pauseTimer(); save(); }
    const yes = await App.ask(msg, ok, true);
    if (!yes && was) resumeTimer();
    save();
    if (!yes) render();
    return yes;
  }
  function stepName(st) {
    if (st.k === 'set') return EX[W.day.items[st.ii].exId].n;
    if (st.k === 'int') return EX[st.id].n;
    if (MOBILITY[st.id]) return MOBILITY[st.id].n;
    return 'este paso';
  }

  /* ---------- Acciones ---------- */
  const act = {
    exit: () => exitSheet(),
    stop: () => stop(),
    'resume-stop': () => resumeFromStop(),
    'skip-ex': async () => {
      const ii = contextIi();
      const name = ii != null ? EX[W.day.items[ii].exId].n : stepName(cur());
      if (await App.ask(`¿Saltar «${name}»${ii != null ? ' y todas sus series restantes' : ''}?`, 'Sí, saltar', true)) skipExercise();
    },
    easier: () => easierVariant(),
    'stop-finish': () => { W.stopped = null; goTo(W.steps.length - 1); },
    'finish-now': () => { App.closeSheet(true); goTo(W.steps.length - 1); },
    later: () => { App.closeSheet(true); save(); close(); },
    discard: async () => {
      if (!(await App.ask('¿Descartar esta sesión? No se guardará nada.', 'Descartar', true))) return;
      App.closeSheet(true);
      S().active = null; Store.save(); close();
    },
    prev: () => prev(),
    skip: async () => {
      const st = cur();
      if (!restStep(st) && !(await confirmSkip(`¿Saltar «${stepName(st)}»?`, 'Sí, saltar'))) return;
      next();
    },
    go: () => { startCountdown(); save(); render(); },
    pause: () => { if (isRunning()) pauseTimer(); else resumeTimer(); save(); render(); },
    plus: () => { const t = W.timer; if (t.paused != null) t.paused += 15; else t.end += 15000; t.total += 15; save(); tick(); },
    minus: () => { const t = W.timer; if (t.paused != null) t.paused = Math.max(1, t.paused - 15); else t.end = Math.max(Date.now() + 1000, t.end - 15000); save(); tick(); },
    inc: () => { const st = cur(); const it = W.day.items[st.ii]; const k = it.exId + ':' + st.s; W.inputs[k] = defaultVal(it, st.s) + (it.type === 'time' ? 5 : 1); document.getElementById('val').textContent = W.inputs[k]; },
    dec: () => { const st = cur(); const it = W.day.items[st.ii]; const k = it.exId + ':' + st.s; W.inputs[k] = Math.max(0, defaultVal(it, st.s) - (it.type === 'time' ? 5 : 1)); document.getElementById('val').textContent = W.inputs[k]; },
    done: () => { const st = cur(); const it = W.day.items[st.ii]; logSet(defaultVal(it, st.s)); },
    skipset: async () => { if (await confirmSkip('¿Saltar esta serie? Quedará como no hecha.', 'Sí, saltar serie')) logSet(0, false); },
    'start-reps': () => { W.timer = { kind: 'reps', start: Date.now(), pausedAt: null }; beep(1100, 160); buzz(80); save(); render(); },
    'end-reps': () => { W.timer = { kind: 'log', secs: elapsed(W.timer) }; beep(880, 150); save(); render(); },
    'log-now': () => { W.timer = { kind: 'log', secs: 0 }; save(); render(); },
    'start-hold': () => { W.timer = { kind: 'prep', end: Date.now() + S().settings.prep * 1000 }; lastBeep = null; save(); render(); },
    'cancel-hold': () => { W.timer = null; save(); render(); },
    'stop-hold': () => { const secs = elapsed(W.timer); beep(880, 150); logSet(secs); },
    feel: el => { W.feeling = +el.dataset.v; const ta = document.getElementById('wo-notes'); if (ta) W.notes = ta.value; save(); render(); },
    save: async () => {
      const ta = document.getElementById('wo-notes');
      if (ta) W.notes = ta.value;
      const st = S();
      const ses = buildSession();
      if (!ses.entries.some(e => e.sets.some(x => x.done)) && !(await App.ask('No has registrado ninguna serie. ¿Guardar igualmente?', 'Guardar'))) return;
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

  return { start, resume, isOpen, onBack, stop };
})();
