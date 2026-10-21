/* Estado persistente */
const Store = (() => {
  const KEY = 'calistenia.v1';
  const def = () => ({ profile: null, plan: null, sessions: [], body: [], settings: { sound: true, vibrate: true, auto: true, prep: 5, theme: 'auto' }, active: null });
  let s;
  try { s = { ...def(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { s = def(); }
  s.settings = { ...def().settings, ...(s.settings || {}) };
  return {
    get: () => s,
    save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* almacenamiento no disponible */ } },
    reset() { s = def(); this.save(); },
    replace(obj) { s = { ...def(), ...obj }; s.settings = { ...def().settings, ...(obj.settings || {}) }; this.save(); },
  };
})();

/* Utilidades compartidas */
const U = {
  esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  fmt: sec => { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, '0')}`; },
  todayIdx: () => (new Date().getDay() + 6) % 7,
  dayStart: d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); },
  weekStart: d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime(); },
  dateStr: t => new Date(t).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
  lvlCls: l => (l <= 3 ? 'l1' : l <= 6 ? 'l2' : 'l3'),
  targetText: (it, ex) => (it.type === 'time' ? `${it.target[0]}–${it.target[1]} s` : `${it.target[0]}–${it.target[1]} reps`) + (ex && ex.uni ? ' por lado' : ''),
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
};

const App = (() => {
  const $ = s => document.querySelector(s);
  const S = () => Store.get();
  const { esc } = U;
  let view = 'home';
  let ob = null; // borrador del cuestionario
  let skipPop = false;
  let obStep = 0;
  const ui = { libFam: 'all', libLvl: 'all', libMine: true, progEx: null, openDay: null, sheet: null };

  /* ---------------- Bloques reutilizables ---------------- */
  // Lista numerada de puntos clave; los números coinciden con las marcas de la figura
  function keyList(cues) {
    return `<ol class="keys">${(cues || []).map((c, i) => `<li><span class="kb">${c[0] ? i + 1 : '•'}</span><span>${esc(c[1])}</span></li>`).join('')}</ol>`;
  }
  function safeList(items) {
    return items && items.length ? `<div class="safe"><b>🛡️ Para no lesionarte</b><ul>${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : '';
  }
  function mobRow(id, kind) {
    const m = MOBILITY[id];
    return `<button class="li" data-act="mob" data-id="${id}"><div class="thumb">${Fig.svg(m.fig)}</div><div class="grow"><b>${esc(m.n)}</b><div class="meta">${m.secs} s · ${kind}</div></div><span class="chev">›</span></button>`;
  }
  function mobSheet(id) {
    const m = MOBILITY[id];
    openSheet(`<div class="sheet-head"><div><h2 style="margin-bottom:4px">${esc(m.n)}</h2><span class="badge">${m.secs} segundos</span></div><button class="icon-btn" data-act="close">✕</button></div>
      <div class="fig-hero">${Fig.svg(m.fig, { animate: true, marks: cueMarks(m.cues) })}</div>
      <p>${esc(m.desc)}</p>
      ${m.cues.length ? `<h4>Cómo hacerlo bien</h4>${keyList(m.cues)}` : ''}
      <p class="small muted">Sin rebotes ni dolor: el estiramiento debe notarse como una tensión agradable.</p>`, 'mob');
  }

  /* ---------------- Instalación ---------------- */
  const APP_URL = 'https://alfonsosl.github.io/Calisthenics/';
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (view === 'profile' && !ob) render(); });
  function installCard() {
    let inFrame = false;
    try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (standalone) return '<div class="card"><h3>✅ App instalada</h3><p class="small muted" style="margin:0">Ya la estás usando como aplicación. Ábrela desde su icono.</p></div>';
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);
    const steps = {
      android: ['Abre la dirección de la app en <b>Chrome</b>.', 'Toca el menú <b>⋮</b> (arriba a la derecha).', 'Elige <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.', 'Confirma. El icono aparece con el resto de tus apps.'],
      ios: ['Abre la dirección de la app en <b>Safari</b> (no desde otra app).', 'Toca <b>Compartir</b> (el cuadrado con la flecha hacia arriba).', 'Baja y elige <b>Añadir a pantalla de inicio</b>.', 'Toca <b>Añadir</b>. El icono aparece en tu pantalla.'],
    };
    const block = (k, t) => `<div class="inst"><b>${t}</b><ol>${steps[k].map(s => `<li>${s}</li>`).join('')}</ol></div>`;
    return `<div class="card" id="install"><h3>📲 Instalar en el móvil</h3>
      <p class="small muted">Instalada funciona como una app normal: icono propio, pantalla completa y sin conexión.</p>
      ${installEvt ? '<button class="btn primary block" data-act="install" style="margin-bottom:12px">Instalar ahora</button>' : ''}
      ${inFrame ? `<p class="small">Ahora la estás viendo como vista previa dentro de Claude, y desde aquí no se puede instalar. Abre la dirección propia de la app:</p><div class="row" style="margin-bottom:12px"><code class="url grow">${APP_URL}</code><button class="btn sm" data-act="copy-url">Copiar</button></div>` : ''}
      ${ios ? block('ios', 'iPhone / iPad') : android ? block('android', 'Android') : block('android', 'Android') + block('ios', 'iPhone / iPad')}
      ${ios || android ? `<details><summary>${ios ? 'Instrucciones para Android' : 'Instrucciones para iPhone'}</summary>${ios ? block('android', 'Android') : block('ios', 'iPhone / iPad')}</details>` : ''}
    </div>`;
  }

  /* ---------------- Render principal ---------------- */
  function render() {
    const st = S();
    const app = $('#app');
    if (!st.profile || ob) {
      if (!ob) startOnboarding();
      app.className = 'no-tabs';
      app.innerHTML = renderOnboarding();
      $('#tabbar').innerHTML = '';
    } else {
      app.className = '';
      const V = { home: viewHome, plan: viewPlan, progress: viewProgress, library: viewLibrary, profile: viewProfile }[view] || viewHome;
      app.innerHTML = V();
      $('#tabbar').innerHTML = tabbar();
    }
    Fig.activate(app);
  }

  function tabbar() {
    const I = {
      home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
      plan: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 3.5h6v3H9zM8.5 11h7M8.5 15h5"/>',
      progress: '<path d="M3 20h18M6 20v-7M11 20V8M16 20v-4M20 20V5"/>',
      library: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>',
      profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.4-4 4.4-6 8-6s6.6 2 8 6"/>',
    };
    const tabs = [['home', 'Inicio'], ['plan', 'Rutina'], ['progress', 'Progreso'], ['library', 'Ejercicios'], ['profile', 'Perfil']];
    return `<nav class="tabbar"><div class="in">${tabs.map(([k, n]) => `<button class="tab ${view === k ? 'on' : ''}" data-act="tab" data-v="${k}" aria-label="${n}"><svg class="ti" viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>${n}</button>`).join('')}</div></nav>`;
  }

  function go(v) { view = v; window.scrollTo(0, 0); render(); try { history.replaceState(null, '', '#' + v); } catch (e) { /* noop */ } }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  /* ---------------- Confirmación (sustituye a confirm(), que algunos visores bloquean) ---------------- */
  function ask(msg, ok = 'Aceptar', danger = false) {
    return new Promise(res => {
      const w = document.createElement('div');
      w.className = 'sheet-wrap ask-wrap';
      w.innerHTML = `<div class="sheet" role="alertdialog" aria-modal="true"><div class="grab"></div><p class="ask-msg">${esc(msg)}</p><div class="stack"><button class="btn ${danger ? 'danger' : 'primary'} block" data-ask="1">${esc(ok)}</button><button class="btn ghost block" data-ask="0">Cancelar</button></div></div>`;
      const done = v => { w.remove(); res(v); };
      w.addEventListener('click', e => {
        const b = e.target.closest('[data-ask]');
        if (b) { e.stopPropagation(); done(b.dataset.ask === '1'); } else if (e.target === w) done(false);
      });
      document.body.appendChild(w);
      w.querySelector('[data-ask="1"]').focus();
    });
  }

  /* ---------------- Hoja modal ---------------- */
  function openSheet(html, key) {
    closeSheet(true);
    const w = document.createElement('div');
    w.className = 'sheet-wrap';
    w.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
    w.addEventListener('click', e => { if (e.target === w) closeSheet(); });
    document.body.appendChild(w);
    ui.sheet = key || 'sheet';
    try { history.pushState({ sheet: 1 }, ''); } catch (e) { /* noop */ }
    Fig.activate(w);
  }
  function closeSheet(silent) {
    const w = document.querySelector('.sheet-wrap');
    if (!w) return;
    w.remove();
    ui.sheet = null;
    if (!silent && history.state && history.state.sheet) { skipPop = true; history.back(); }
  }
  function refreshSheet(html) {
    const sh = document.querySelector('.sheet');
    if (sh) { const top = sh.scrollTop; sh.innerHTML = `<div class="grab"></div>${html}`; sh.scrollTop = top; Fig.activate(sh); }
  }

  /* ================= ONBOARDING ================= */
  const OB_DEFAULT = () => ({
    name: '', sex: '', age: 30, weight: 70, height: 170, bodyType: '', activity: 'light', sleep: 7, experience: 'none',
    diet: 'balanced', stress: 'medium', tests: { pushups: '', pullups: '', squats: '', plank: '' },
    goal: 'salud', interests: [], days: [0, 2, 4], minutes: 45, equipment: ['chair', 'door'], limits: [],
  });
  function startOnboarding(step = 0) {
    const p = S().profile;
    ob = p ? JSON.parse(JSON.stringify(p)) : OB_DEFAULT();
    obStep = step;
  }
  const opt = (k, v, ico, title, sub, multi) => {
    const on = multi ? (ob[k] || []).includes(v) : ob[k] === v;
    return `<button class="opt ${on ? 'on' : ''}" data-act="${multi ? 'ob-tog' : 'ob-set'}" data-k="${k}" data-v="${v}"><span class="ico">${ico}</span><span class="grow"><b>${title}</b>${sub ? `<span class="small muted">${sub}</span>` : ''}</span><span class="check">${on ? '✓' : ''}</span></button>`;
  };
  const chip = (k, v, label, multi, num) => {
    const val = num ? +v : v;
    const on = multi ? (ob[k] || []).includes(val) : ob[k] === val;
    return `<button class="chip ${num && multi ? 'day' : ''} ${on ? 'on' : ''}" data-act="${multi ? 'ob-tog' : 'ob-set'}" data-k="${k}" data-v="${v}"${num ? ' data-num="1"' : ''}>${label}</button>`;
  };
  const num = (path, label, min, max, step = 1, suffix = '') => {
    const v = path.split('.').reduce((o, k) => o?.[k], ob);
    return `<label class="field"><span>${label}</span><input type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" data-bind="${path}" value="${v ?? ''}" placeholder="${suffix}"></label>`;
  };
  function bmiHtml() {
    const b = Planner.bmi(ob);
    return b ? `<span class="muted small">IMC</span><b>${b.toFixed(1)}</b><span class="small">${Planner.bmiLabel(b)}</span>` : '<span class="muted small">Introduce peso y altura</span>';
  }

  const OB_STEPS = [
    { id: 'welcome', render: () => `
      <div class="splash"><h1>Calis<br>tenia</h1>${Fig.svg('jumping_jack', { animate: true })}<p class="hand">Entrena donde quieras,<br>con lo que tengas.</p></div>
      <div class="feature-list">
        <div>Rutina a tu medida según tus días libres</div>
        <div>Figuras animadas con la técnica correcta</div>
        <div>Empezar, pausar y parar en cada ejercicio</div>
        <div>Registro de sesiones y subida de nivel</div>
        <div>Tus datos se quedan en tu móvil</div>
      </div>` },
    { id: 'basics', title: 'Datos básicos', valid: () => ob.age >= 12 && ob.age <= 95 && ob.weight >= 30 && ob.weight <= 250 && ob.height >= 120 && ob.height <= 230, render: () => `
      <label class="field"><span>¿Cómo te llamas?</span><input type="text" data-bind="name" value="${esc(ob.name)}" placeholder="Tu nombre (opcional)" maxlength="30"></label>
      <label class="field"><span>Sexo (para estimar el gasto energético)</span></label>
      <div class="chips" style="margin:-8px 0 14px">${chip('sex', 'm', 'Hombre')}${chip('sex', 'f', 'Mujer')}${chip('sex', 'x', 'Prefiero no decirlo')}</div>
      <div class="grid3">${num('age', 'Edad', 12, 95, 1, 'años')}${num('weight', 'Peso (kg)', 30, 250, 0.5, 'kg')}${num('height', 'Altura (cm)', 120, 230, 1, 'cm')}</div>
      <div class="bmi" id="bmi">${bmiHtml()}</div>
      <p class="tiny muted">El IMC es orientativo: no distingue músculo de grasa.</p>` },
    { id: 'body', title: 'Tu fisionomía', render: () => `
      <p class="muted">¿Con qué tipo de cuerpo te identificas más? Ayuda a ajustar volumen y recomendaciones.</p>
      ${opt('bodyType', 'ecto', '🦒', 'Delgado / ectomorfo', 'Te cuesta ganar peso y músculo')}
      ${opt('bodyType', 'meso', '🐆', 'Atlético / mesomorfo', 'Ganas músculo con relativa facilidad')}
      ${opt('bodyType', 'endo', '🐻', 'Robusto / endomorfo', 'Tiendes a acumular grasa con facilidad')}
      ${opt('bodyType', 'unsure', '🤷', 'No lo tengo claro', '')}` },
    { id: 'habits', title: 'Hábitos', render: () => `
      <label class="field"><span>Actividad diaria (sin contar el entrenamiento)</span></label>
      ${opt('activity', 'sedentary', '🪑', 'Sedentaria', 'Trabajo sentado, menos de 5.000 pasos')}
      ${opt('activity', 'light', '🚶', 'Ligera', '5.000-8.000 pasos, algo de movimiento')}
      ${opt('activity', 'moderate', '🚴', 'Moderada', 'De pie gran parte del día o deporte 1-2 días')}
      ${opt('activity', 'active', '🏃', 'Muy activa', 'Trabajo físico o deporte frecuente')}
      <label class="field"><span>Experiencia entrenando fuerza</span></label>
      <div class="chips" style="margin:-8px 0 14px">${chip('experience', 'none', 'Ninguna')}${chip('experience', 'some', 'Menos de 1 año')}${chip('experience', 'regular', '1-2 años')}${chip('experience', 'advanced', 'Más de 2 años')}</div>
      <div class="grid2">${num('sleep', 'Horas de sueño', 3, 12, 0.5, 'h')}<div></div></div>
      <label class="field"><span>Alimentación</span></label>
      <div class="chips" style="margin:-8px 0 14px">${chip('diet', 'balanced', 'Bastante equilibrada')}${chip('diet', 'irregular', 'Irregular / mejorable')}</div>
      <label class="field"><span>Nivel de estrés</span></label>
      <div class="chips" style="margin:-8px 0 14px">${chip('stress', 'low', 'Bajo')}${chip('stress', 'medium', 'Medio')}${chip('stress', 'high', 'Alto')}</div>` },
    { id: 'tests', title: 'Test de nivel', render: () => `
      <p class="muted">Haz cada prueba con buena técnica (o estima si no puedes ahora). Si no puedes ninguna, pon 0.</p>
      <div class="test-row"><div class="thumb">${Fig.svg('pushup')}</div>${num('tests.pushups', 'Flexiones seguidas (máximo)', 0, 150, 1, 'reps')}</div>
      <div class="test-row"><div class="thumb">${Fig.svg('pullup')}</div><div>${num('tests.pullups', 'Dominadas seguidas (máximo)', 0, 50, 1, 'déjalo vacío si no tienes barra')}</div></div>
      <div class="test-row"><div class="thumb">${Fig.svg('squat')}</div>${num('tests.squats', 'Sentadillas seguidas (máx. 60)', 0, 200, 1, 'reps')}</div>
      <div class="test-row"><div class="thumb">${Fig.svg('plank')}</div>${num('tests.plank', 'Plancha frontal (segundos)', 0, 600, 5, 'seg')}</div>` },
    { id: 'goals', title: 'Objetivos', render: () => `
      <label class="field"><span>Objetivo principal</span></label>
      ${Object.entries(Planner.GOALS).map(([k, g]) => opt('goal', k, g.icon, g.n, { salud: 'Moverte mejor y sentirte bien', fuerza: 'Más fuerza en menos repeticiones', hipertrofia: 'Más masa muscular', perder_grasa: 'Fuerza + circuitos metabólicos', resistencia: 'Más repeticiones, menos descanso', habilidades: 'Pino, L-sit, front lever...' }[k])).join('')}
      <label class="field"><span>También me interesa</span></label>
      <div class="chips">${chip('interests', 'habilidades', '🤸 Habilidades', true)}${chip('interests', 'movilidad', '🧘 Movilidad', true)}${chip('interests', 'cardio', '🔥 Cardio extra', true)}</div>` },
    { id: 'days', title: 'Disponibilidad', valid: () => ob.days.length > 0, render: () => `
      <label class="field"><span>¿Qué días quieres entrenar?</span></label>
      <div class="chips" style="margin-bottom:6px">${Planner.DAYS_S.map((d, i) => chip('days', String(i), d, true, true)).join('')}</div>
      <p class="small muted">${ob.days.length} día(s) por semana${ob.days.length >= 5 ? ' · Recomendado al empezar: 3-4' : ''}</p>
      <label class="field"><span>Duración por sesión</span></label>
      <div class="chips">${[20, 30, 45, 60, 90].map(m => chip('minutes', String(m), m + ' min', false, true)).join('')}</div>` },
    { id: 'equipment', title: 'Material disponible', render: () => `
      <p class="muted">Marca lo que tengas. Sin material también se puede entrenar todo el cuerpo: suelo y pared bastan para empezar.</p>
      ${EQUIPMENT.map(e => opt('equipment', e.id, e.icon, e.name, '', true)).join('')}` },
    { id: 'limits', title: 'Lesiones o molestias', render: () => `
      <p class="muted">Adaptaremos los ejercicios para evitar los que suelen agravar estas zonas.</p>
      ${opt('limits', 'wrists', '✋', 'Muñecas', '', true)}${opt('limits', 'shoulders', '🦴', 'Hombros', '', true)}${opt('limits', 'elbows', '💪', 'Codos', '', true)}
      ${opt('limits', 'knees', '🦵', 'Rodillas', '', true)}${opt('limits', 'back', '🔙', 'Zona lumbar', '', true)}
      <p class="tiny muted">Esta app no sustituye el consejo médico. Si tienes dolor persistente, consulta con un profesional sanitario.</p>` },
    { id: 'summary', title: 'Tu plan', render: () => {
      const L = Planner.assess(ob);
      const pv = Planner.generate(ob);
      return `<p class="muted">Este es tu punto de partida. Los niveles se ajustarán solos según tus resultados.</p>
        <div class="card">${levelBars(L)}</div>
        <div class="card"><h3>${esc(pv.split)}</h3>${pv.days.map(d => `<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span><b>${Planner.DAYS[d.weekday]}</b> · ${esc(d.name)}</span><span class="muted">~${Planner.estimateMin(d)} min</span></div>`).join('')}</div>`;
    } },
  ];

  function renderOnboarding() {
    const st = OB_STEPS[obStep];
    const total = OB_STEPS.length - 1;
    const editing = !!S().profile;
    const canNext = !st.valid || st.valid();
    return `
      ${obStep > 0 ? `<div class="top"><button class="icon-btn" data-act="ob-back" aria-label="Atrás">←</button><div class="grow"><div class="small muted">Paso ${obStep} de ${total}</div><h2 style="margin:0">${st.title}</h2></div>${editing ? '<button class="icon-btn" data-act="ob-cancel" aria-label="Cancelar">✕</button>' : ''}</div><div class="ob-progress"><div style="width:${obStep / total * 100}%"></div></div>` : ''}
      ${st.render()}
      <div class="ob-nav">${obStep === 0 ? '<button class="btn primary lg" data-act="ob-next">Empezar</button>' : obStep === total ? `<button class="btn primary lg" data-act="ob-finish">${editing ? 'Guardar y regenerar rutina' : 'Crear mi rutina'}</button>` : `<button class="btn primary lg" data-act="ob-next" ${canNext ? '' : 'disabled'}>Siguiente</button>`}</div>`;
  }

  function finishOnboarding() {
    const st = S();
    const p = ob;
    for (const k of ['age', 'weight', 'height', 'sleep']) p[k] = +p[k] || 0;
    for (const k of ['pushups', 'squats', 'plank']) p.tests[k] = +p.tests[k] || 0;
    p.tests.pullups = p.tests.pullups === '' || p.tests.pullups == null ? null : +p.tests.pullups;
    const first = !st.profile;
    st.profile = p;
    st.plan = Planner.generate(p);
    if (first && p.weight) st.body.push({ date: Date.now(), kg: p.weight });
    Store.save();
    ob = null;
    view = first ? 'home' : 'plan';
    render();
    toast(first ? '¡Rutina creada!' : 'Rutina actualizada');
  }

  /* ================= INICIO ================= */
  function weekStrip() {
    const st = S();
    const ws = U.weekStart(Date.now());
    const today = U.todayIdx();
    const planned = new Set((st.plan?.days || []).map(d => d.weekday));
    return `<div class="week">${Planner.DAYS_S.map((d, i) => {
      const t0 = ws + i * 864e5;
      const done = st.sessions.some(s => s.date >= t0 && s.date < t0 + 864e5);
      return `<div><div class="d">${d}</div><div class="dot ${done ? 'done' : planned.has(i) ? 'plan' : ''} ${i === today ? 'today' : ''}">${done ? '✓' : new Date(t0).getDate()}</div></div>`;
    }).join('')}</div>`;
  }

  function stats() {
    const ss = S().sessions;
    const weekAgo = U.weekStart(Date.now());
    let streak = 0;
    let w = U.weekStart(Date.now());
    const has = t => ss.some(s => s.date >= t && s.date < t + 7 * 864e5);
    if (!has(w)) w -= 7 * 864e5;
    while (has(w)) { streak++; w -= 7 * 864e5; }
    let reps = 0;
    for (const s of ss) for (const e of s.entries) for (const x of e.sets) if (x.done && x.reps) reps += x.reps;
    return { total: ss.length, week: ss.filter(s => s.date >= weekAgo).length, streak, reps, minutes: Math.round(ss.reduce((a, s) => a + (s.duration || 0), 0) / 60) };
  }

  function viewHome() {
    const st = S();
    const p = st.profile, plan = st.plan;
    const today = U.todayIdx();
    const h = new Date().getHours();
    const hello = h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
    const di = plan.days.findIndex(d => d.weekday === today);
    const doneToday = st.sessions.find(s => U.dayStart(s.date) === U.dayStart(Date.now()));
    let hero = '';
    if (st.active) {
      const d = plan.days[st.active.dayIndex];
      hero = `<div class="card hero"><div class="phase">Entrenamiento en curso</div><h2>${esc(d?.name || '')}</h2><p class="muted small">Tienes una sesión a medias.</p><div class="row"><button class="btn primary grow" data-act="resume">Continuar</button><button class="btn ghost" data-act="discard-active">Descartar</button></div></div>`;
    } else if (doneToday) {
      hero = `<div class="card hero"><div class="phase">Hoy</div><h2>✓ Sesión completada</h2><p class="muted">${esc(doneToday.dayName)} · ${U.fmt(doneToday.duration)} · ${doneToday.entries.reduce((a, e) => a + e.sets.filter(x => x.done).length, 0)} series</p><p class="small">Descansa, come bien y duerme. Mañana más.</p></div>`;
    } else if (di >= 0) {
      const d = plan.days[di];
      hero = `<div class="card hero"><div class="phase">Hoy toca</div><h2>${esc(d.name)}</h2><p class="muted small">~${Planner.estimateMin(d)} min en total</p>
        <div class="hero-fig">${Fig.svg(d.items[0].exId, { animate: true })}</div>
        <div class="flow"><span>Calentamiento<br><b>${Planner.mobMin(d.warmup)} min</b></span><span>${d.items.length} ejercicios${d.finisher ? ' + finisher' : ''}<br><b>${Math.max(1, Planner.estimateMin(d) - Planner.mobMin(d.warmup) - Planner.mobMin(d.cooldown))} min</b></span><span>Estiramientos<br><b>${Planner.mobMin(d.cooldown)} min</b></span></div>
        <div class="row wrap" style="gap:6px;margin-bottom:12px">${d.items.map(it => `<span class="badge">${esc(EX[it.exId].n)}</span>`).join('')}</div>
        <button class="btn primary lg block" data-act="start" data-d="${di}">▶ Empezar entrenamiento</button>${window.Music ? Music.heroLink() : ''}</div>`;
    } else {
      const next = plan.days.slice().sort((a, b) => ((a.weekday - today + 7) % 7) - ((b.weekday - today + 7) % 7))[0];
      hero = `<div class="card hero"><div class="phase">Hoy</div><h2>Día de descanso 😌</h2><p class="muted small">Próxima sesión: <b>${Planner.DAYS[next.weekday]}</b> · ${esc(next.name)}</p><p class="small">Caminar, estirar o movilidad suave ayudan a recuperar.</p><button class="btn ghost block" data-act="pick-day">Entrenar igualmente</button></div>`;
    }
    const s = stats();
    const recos = Planner.recommendations(p, plan, st.sessions);
    const lastChanges = (st.sessions[st.sessions.length - 1]?.changes || []).filter(c => !c.applied);
    return `
      <div class="top"><div><div class="small muted">${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>${p.name ? 'Hola, ' + esc(p.name) : hello}</h1><p class="hand" style="margin:4px 0 0">Ven por el sudor, quédate por el progreso.</p></div></div>
      ${hero}
      <div class="card tight">${weekStrip()}</div>
      ${!S().settings.hideInstall && !((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone) ? '<div class="card tight row"><span style="font-size:24px">📲</span><div class="grow small"><b>Instálala en tu móvil</b><div class="muted">Icono propio y uso sin conexión.</div></div><button class="btn sm primary" data-act="go-install">Cómo</button><button class="icon-btn" data-act="hide-install" aria-label="Ocultar">✕</button></div>' : ''}
      <div class="stats"><div class="stat"><b>${s.week}/${plan.days.length}</b><span>Esta semana</span></div><div class="stat"><b>${s.streak}</b><span>Semanas seguidas</span></div><div class="stat"><b>${s.total}</b><span>Sesiones</span></div></div>
      ${lastChanges.length ? `<div class="card"><h3>Progresión sugerida</h3>${lastChanges.map(changeHtml).join('')}<button class="btn primary block sm" data-act="apply-changes">Aplicar cambios</button></div>` : ''}
      <div class="section-title row between"><span>Recomendaciones para ti</span><button class="link small" data-act="all-recos">Ver todas</button></div>
      <div class="card tight">${recos.slice(0, 4).map(recoHtml).join('')}</div>`;
  }
  const recoHtml = r => `<div class="reco"><div class="ico">${r.icon}</div><div><b>${esc(r.title)}</b><p>${esc(r.text)}</p></div></div>`;
  function changeHtml(c) {
    const ico = c.kind === 'up' ? '⬆️' : '⬇️';
    const to = c.to ? ` → <b>${esc(EX[c.to].n)}</b>` : '';
    return `<div class="change"><span>${ico}</span><span class="grow">${esc(c.name)}${to}${c.note ? `<div class="tiny muted">${esc(c.note)}</div>` : ''}${c.kind === 'down' ? '<div class="tiny muted">Dos sesiones por debajo del objetivo: bajamos un nivel para consolidar.</div>' : ''}</span>${c.applied ? '<span class="badge acc">Aplicado</span>' : ''}</div>`;
  }

  function allRecos() {
    const st = S();
    const recos = Planner.recommendations(st.profile, st.plan, st.sessions);
    const cats = [...new Set(recos.map(r => r.cat))];
    openSheet(`<div class="sheet-head"><h2>Recomendaciones</h2><button class="icon-btn" data-act="close">✕</button></div>
      ${cats.map(c => `<div class="section-title">${c}</div><div class="card tight">${recos.filter(r => r.cat === c).map(recoHtml).join('')}</div>`).join('')}
      <p class="tiny muted">Recomendaciones generales basadas en tu perfil. No sustituyen el consejo de un médico, fisioterapeuta o dietista-nutricionista.</p>`);
  }

  function pickDay() {
    const plan = S().plan;
    openSheet(`<div class="sheet-head"><h2>¿Qué sesión quieres hacer?</h2><button class="icon-btn" data-act="close">✕</button></div>
      <div class="list">${plan.days.map((d, i) => `<button class="li" data-act="start" data-d="${i}"><div class="grow"><b>${esc(d.name)}</b><div class="meta">${Planner.DAYS[d.weekday]} · ${d.items.length} ejercicios · ~${Planner.estimateMin(d)} min</div></div><span class="chev">▶</span></button>`).join('')}</div>`);
  }

  /* ================= RUTINA ================= */
  function levelBars(L) {
    const fams = ['push_h', 'push_v', 'dips', 'pull_v', 'pull_h', 'squat', 'hinge', 'core_a'];
    return fams.map(f => `<div class="lvlbar"><span>${FAMILIES[f].name}</span><div class="bar"><div style="width:${L[f] * 10}%;background:${FAMILIES[f].color}"></div></div><b>${L[f]}</b></div>`).join('') + '<p class="tiny muted" style="margin:8px 0 0">Nivel 1-3 principiante · 4-6 intermedio · 7-10 avanzado</p>';
  }

  function itemRow(it, di, ii) {
    const ex = EX[it.exId];
    return `<button class="li" data-act="ex" data-id="${ex.id}" data-d="${di}" data-i="${ii}">
      <div class="thumb">${Fig.svg(ex.id)}</div>
      <div class="grow"><b>${esc(ex.n)}</b> ${it.role === 'skill' ? '<span class="badge l3">Skill</span>' : ''}<div class="meta">${it.sets} × ${U.targetText(it, ex)} · descanso ${it.rest}s</div><span class="badge ${U.lvlCls(ex.lvl)}">Nv ${ex.lvl} · ${LEVEL_NAMES(ex.lvl)}</span></div>
      <span class="chev">›</span></button>`;
  }

  function viewPlan() {
    const st = S();
    const plan = st.plan;
    const order = plan.days.map((d, i) => i);
    return `
      <div class="top"><div><div class="small muted">${plan.days.length} días/semana · ${st.profile.minutes} min</div><h1>Tu rutina</h1></div></div>
      <div class="card"><h3>${esc(plan.split)}</h3><p class="small muted" style="margin:0">Objetivo: ${Planner.GOALS[st.profile.goal].n}. Toca un ejercicio para ver la técnica, su progresión o cambiar de variante.</p></div>
      ${order.map(i => {
        const d = plan.days[i];
        const open = ui.openDay === i || (ui.openDay == null && d.weekday === U.todayIdx());
        return `<div class="card tight">
          <button class="row between" style="width:100%;background:none;border:0;padding:4px;cursor:pointer;text-align:left" data-act="toggle-day" data-d="${i}">
            <div><div class="small muted">${Planner.DAYS[d.weekday]}</div><h3 style="margin:0">${esc(d.name)}</h3><div class="small muted">${d.items.length} ejercicios · ~${Planner.estimateMin(d)} min</div></div><span class="muted">${open ? '▲' : '▼'}</span></button>
          ${open ? `
            <div class="block-title">1 · Calentamiento <span class="muted">~${Planner.mobMin(d.warmup)} min</span></div>
            <div class="list">${d.warmup.map(id => mobRow(id, 'calentamiento')).join('')}</div>
            <div class="block-title">2 · Entrenamiento</div>
            <div class="list">${d.items.map((it, ii) => itemRow(it, i, ii)).join('')}</div>
            ${d.finisher ? `<div class="card tight" style="background:var(--bg2);margin:8px 0"><b>⚡ Finisher</b> <span class="small muted">${d.finisher.rounds} rondas · ${d.finisher.work}s trabajo / ${d.finisher.rest}s descanso</span><div class="small">${d.finisher.ids.map(id => EX[id].n).join(' → ')}</div></div>` : ''}
            <div class="block-title">3 · Estiramientos <span class="muted">~${Planner.mobMin(d.cooldown)} min</span></div>
            <div class="list">${d.cooldown.map(id => mobRow(id, 'estiramiento')).join('')}</div>
            <button class="btn primary block" style="margin-top:10px" data-act="start" data-d="${i}">▶ Empezar esta sesión</button>` : ''}
        </div>`;
      }).join('')}
      <div class="section-title">Tus niveles</div>
      <div class="card">${levelBars(plan.levels)}</div>
      <div class="row"><button class="btn ghost grow" data-act="edit-profile" data-step="6">Cambiar días</button><button class="btn ghost grow" data-act="regen">Regenerar rutina</button></div>`;
  }

  /* -------- Ficha de ejercicio -------- */
  function exerciseSheet(id, di, ii) {
    const st = S();
    const ex = EX[id];
    const p = st.profile;
    const ctx = di != null && ii != null ? { di: +di, ii: +ii } : null;
    const fam = EXERCISES.filter(e => e.fam === ex.fam).sort((a, b) => a.lvl - b.lvl);
    const hist = Planner.entriesFor(st.sessions, id);
    const best = hist.reduce((m, e) => Math.max(m, ...e.sets.filter(x => x.done).map(Planner.setVal)), 0);
    const eqNames = (ex.eq || []).map(r => r.split('|').map(x => EQUIPMENT.find(e => e.id === x)?.name.split(' (')[0]).join(' o ')).join(' + ') || 'Sin material';
    const item = ctx ? st.plan.days[ctx.di].items[ctx.ii] : null;
    const html = `
      <div class="sheet-head"><div><h2 style="margin-bottom:4px">${esc(ex.n)}</h2><span class="badge ${U.lvlCls(ex.lvl)}">Nivel ${ex.lvl} · ${LEVEL_NAMES(ex.lvl)}</span> <span class="badge">${FAMILIES[ex.fam].name}</span></div><button class="icon-btn" data-act="close">✕</button></div>
      <div class="fig-hero">${Fig.svg(id, { animate: true, marks: cueMarks(ex.cues) })}<div class="tiny muted center">${Fig.caption(id) ? esc(Fig.caption(id)) + ' · ' : ''}Los números señalan los puntos clave</div></div>
      ${item && item.exId === id ? `<div class="card tight row between"><span><b>${item.sets} × ${U.targetText(item, ex)}</b></span><span class="muted small">Descanso ${item.rest}s</span></div>` : ''}
      <p>${esc(ex.desc)}</p>
      <p class="small"><b>Músculos:</b> <span class="muted">${esc(ex.musc)}</span><br><b>Material:</b> <span class="muted">${esc(eqNames)}</span></p>
      <h4>Postura correcta</h4>${keyList(ex.cues)}
      ${safeList(ex.safe)}
      <h4>Errores comunes</h4><ul class="cues bad">${ex.err.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      ${hist.length ? `<h4>Tu historial</h4><div class="card tight">${lineChart(hist.slice(-12).map(e => ({ l: new Date(e.date).getDate() + '/' + (new Date(e.date).getMonth() + 1), y: Math.max(...e.sets.filter(x => x.done).map(Planner.setVal)), y2: e.sets.reduce((a, x) => a + (x.done ? Planner.setVal(x) : 0), 0) })))}<div class="legend"><span><i></i>Mejor serie</span><span><i class="b"></i>Total</span></div><p class="small" style="margin:8px 0 0">Récord: <b class="pr">${best} ${ex.type === 'time' ? 's' : 'reps'}</b> · ${hist.length} sesiones</p></div>` : ''}
      <h4>Progresión (${FAMILIES[ex.fam].name})</h4>
      <div class="list ladder">${fam.map(e => {
        const ok = Planner.allowed(e, p);
        const why = !Planner.hasEq(e, p.equipment) ? 'Falta material' : !ok ? 'No recomendado por tus limitaciones' : '';
        return `<div class="li ${e.id === id ? 'cur' : ''} ${ok ? '' : 'locked'}" data-act="ex" data-id="${e.id}" ${ctx ? `data-d="${ctx.di}" data-i="${ctx.ii}" data-preview="1"` : ''}>
          <div class="thumb">${Fig.svg(e.id)}</div><div class="grow"><b>${esc(e.n)}</b><div class="meta">Nivel ${e.lvl}${why ? ' · 🔒 ' + why : ''}</div></div>
          ${ctx && ok && e.id !== item.exId ? `<button class="btn sm primary" data-act="swap" data-id="${e.id}" data-d="${ctx.di}" data-i="${ctx.ii}">Usar</button>` : e.id === item?.exId ? '<span class="badge acc">Actual</span>' : ''}</div>`;
      }).join('')}</div>`;
    if (ui.sheet === 'ex') refreshSheet(html); else openSheet(html, 'ex');
  }

  /* ================= PROGRESO ================= */
  function lineChart(pts) {
    if (!pts.length) return '<p class="muted small">Sin datos todavía.</p>';
    const W = 320, H = 150, pl = 28, pr = 8, pt = 10, pb = 22;
    const ys = pts.flatMap(p => [p.y, p.y2 ?? p.y]);
    let mn = Math.min(...ys), mx = Math.max(...ys);
    if (mn === mx) { mn -= 1; mx += 1; }
    mn = Math.max(0, mn - (mx - mn) * 0.1);
    const X = i => pl + (pts.length === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (pts.length - 1));
    const Y = v => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
    const path = k => pts.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(p[k]).toFixed(1)).join('');
    const ticks = [mn, (mn + mx) / 2, mx];
    const step = Math.ceil(pts.length / 6);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}">${ticks.map(t => `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${pl - 4}" y="${Y(t) + 3}" text-anchor="end">${Math.round(t * 10) / 10}</text>`).join('')}
      ${pts[0].y2 != null ? `<path class="ln2" d="${path('y2')}"/>` : ''}<path class="ln" d="${path('y')}"/>
      ${pts.map((p, i) => `<circle class="pt" cx="${X(i)}" cy="${Y(p.y)}" r="3"/>${i % step === 0 || i === pts.length - 1 ? `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${p.l}</text>` : ''}`).join('')}</svg>`;
  }
  function barChart(vals, labels, target) {
    const W = 320, H = 130, pb = 20, mx = Math.max(target || 0, ...vals, 1);
    const bw = (W - 10) / vals.length;
    const ty = 8 + (1 - target / mx) * (H - pb - 8);
    return `<svg class="chart" style="height:130px" viewBox="0 0 ${W} ${H}">${target ? `<line class="grid" x1="0" x2="${W}" y1="${ty}" y2="${ty}" stroke-dasharray="4 3"/>` : ''}${vals.map((v, i) => { const h = v / mx * (H - pb - 8); return `<rect class="barr" x="${5 + i * bw + 4}" y="${H - pb - h}" width="${bw - 8}" height="${Math.max(h, 1)}" rx="4" opacity="${v ? 1 : .25}"/><text x="${5 + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${labels[i]}</text>`; }).join('')}</svg>`;
  }

  function viewProgress() {
    const st = S();
    const s = stats();
    const ss = st.sessions;
    const weeks = [];
    const w0 = U.weekStart(Date.now());
    for (let i = 9; i >= 0; i--) {
      const t = w0 - i * 7 * 864e5;
      weeks.push({ v: ss.filter(x => x.date >= t && x.date < t + 7 * 864e5).length, l: new Date(t).getDate() + '/' + (new Date(t).getMonth() + 1) });
    }
    const exIds = [...new Set(ss.flatMap(x => x.entries.filter(e => e.sets.some(y => y.done)).map(e => e.exId)))];
    if (!ui.progEx || !exIds.includes(ui.progEx)) ui.progEx = exIds[0] || null;
    const hist = ui.progEx ? Planner.entriesFor(ss, ui.progEx) : [];
    const exP = ui.progEx ? EX[ui.progEx] : null;
    const body = st.body.slice().sort((a, b) => a.date - b.date);
    return `
      <div class="top"><h1>Progreso</h1></div>
      <div class="stats"><div class="stat"><b>${s.total}</b><span>Sesiones</span></div><div class="stat"><b>${s.minutes}</b><span>Minutos</span></div><div class="stat"><b>${s.reps}</b><span>Repeticiones</span></div></div>
      <div class="card"><h3>Sesiones por semana</h3>${barChart(weeks.map(w => w.v), weeks.map(w => w.l), st.plan.days.length)}<p class="tiny muted" style="margin:0">Línea discontinua: objetivo semanal (${st.plan.days.length})</p></div>
      <div class="card"><h3>Evolución por ejercicio</h3>
        ${exIds.length ? `<select data-act="prog-ex">${exIds.map(id => `<option value="${id}" ${id === ui.progEx ? 'selected' : ''}>${esc(EX[id].n)}</option>`).join('')}</select>
        <div style="margin-top:10px">${lineChart(hist.slice(-15).map(e => ({ l: new Date(e.date).getDate() + '/' + (new Date(e.date).getMonth() + 1), y: Math.max(...e.sets.filter(x => x.done).map(Planner.setVal)), y2: e.sets.reduce((a, x) => a + (x.done ? Planner.setVal(x) : 0), 0) })))}</div>
        <div class="legend"><span><i></i>Mejor serie (${exP.type === 'time' ? 's' : 'reps'})</span><span><i class="b"></i>Total sesión</span></div>` : '<p class="muted small">Completa tu primera sesión para ver gráficas de cada ejercicio.</p>'}
      </div>
      <div class="card"><h3>Peso corporal</h3>
        <div class="row"><input type="number" inputmode="decimal" step="0.1" id="bw" placeholder="kg" style="flex:1"><button class="btn primary" data-act="add-weight">Añadir</button></div>
        ${body.length >= 2 ? `<div style="margin-top:10px">${lineChart(body.slice(-20).map(b => ({ l: new Date(b.date).getDate() + '/' + (new Date(b.date).getMonth() + 1), y: b.kg })))}</div>` : ''}
        ${body.length ? `<p class="small muted" style="margin:8px 0 0">Último: <b>${body[body.length - 1].kg} kg</b>${body.length >= 2 ? ` · Cambio total: ${(body[body.length - 1].kg - body[0].kg).toFixed(1)} kg` : ''}</p>` : ''}
      </div>
      <div class="section-title">Historial</div>
      ${ss.length ? `<div class="list">${ss.slice().reverse().map(x => `<button class="li" data-act="session" data-id="${x.id}"><div class="grow"><b>${esc(x.dayName)}</b><div class="meta">${U.dateStr(x.date)} · ${U.fmt(x.duration)} · ${x.entries.reduce((a, e) => a + e.sets.filter(y => y.done).length, 0)} series ${['', '😫', '😓', '🙂', '😀', '🤩'][x.feeling || 0] || ''}</div></div><span class="chev">›</span></button>`).join('')}</div>` : '<div class="card muted small">Aún no hay sesiones registradas.</div>'}`;
  }

  function sessionSheet(id) {
    const s = S().sessions.find(x => x.id === id);
    if (!s) return;
    openSheet(`<div class="sheet-head"><div><h2 style="margin-bottom:2px">${esc(s.dayName)}</h2><div class="small muted">${new Date(s.date).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}</div></div><button class="icon-btn" data-act="close">✕</button></div>
      <div class="stats"><div class="stat"><b>${U.fmt(s.duration)}</b><span>Duración</span></div><div class="stat"><b>${s.entries.reduce((a, e) => a + e.sets.filter(y => y.done).length, 0)}</b><span>Series</span></div><div class="stat"><b>${['–', '😫', '😓', '🙂', '😀', '🤩'][s.feeling || 0]}</b><span>Sensación</span></div></div>
      <div class="list">${s.entries.map(e => { const ex = EX[e.exId]; return `<div class="li"><div class="thumb">${Fig.svg(e.exId)}</div><div class="grow"><b>${esc(ex.n)}</b><div class="meta">Objetivo ${e.target[0]}–${e.target[1]}${ex.type === 'time' ? ' s' : ''}</div><div>${e.sets.map(x => x.done ? `<span class="badge acc">${Planner.setVal(x)}${ex.type === 'time' ? 's' : ''}</span>` : '<span class="badge">–</span>').join(' ')}</div></div></div>`; }).join('')}</div>
      ${s.finisher ? '<p class="small" style="margin-top:10px">⚡ Finisher completado</p>' : ''}
      ${s.changes?.length ? `<h4 style="margin-top:14px">Cambios de nivel</h4>${s.changes.map(changeHtml).join('')}` : ''}
      ${s.notes ? `<h4 style="margin-top:14px">Notas</h4><p class="muted">${esc(s.notes)}</p>` : ''}
      <button class="btn danger block" style="margin-top:14px" data-act="del-session" data-id="${s.id}">Eliminar sesión</button>`);
  }

  /* ================= BIBLIOTECA ================= */
  function viewLibrary() {
    const p = S().profile;
    let list = EXERCISES.slice();
    if (ui.libFam !== 'all') list = list.filter(e => e.fam === ui.libFam);
    if (ui.libLvl !== 'all') list = list.filter(e => LEVEL_NAMES(e.lvl) === ui.libLvl);
    if (ui.libMine) list = list.filter(e => Planner.hasEq(e, p.equipment));
    list.sort((a, b) => (a.fam === b.fam ? a.lvl - b.lvl : Object.keys(FAMILIES).indexOf(a.fam) - Object.keys(FAMILIES).indexOf(b.fam)));
    const c = (k, v, l) => `<button class="chip ${ui[k] === v ? 'on' : ''}" data-act="lib" data-k="${k}" data-v="${v}">${l}</button>`;
    return `
      <div class="top"><div><div class="small muted">${EXERCISES.length} ejercicios</div><h1>Ejercicios</h1></div></div>
      <div class="chips" style="margin-bottom:10px">${c('libFam', 'all', 'Todos')}${Object.entries(FAMILIES).map(([k, f]) => c('libFam', k, f.short)).join('')}</div>
      <div class="chips" style="margin-bottom:10px">${c('libLvl', 'all', 'Todos los niveles')}${['Principiante', 'Intermedio', 'Avanzado'].map(l => c('libLvl', l, l)).join('')}</div>
      <div class="chips" style="margin-bottom:14px"><button class="chip ${ui.libMine ? 'on' : ''}" data-act="lib-mine">🎒 Solo con mi material</button></div>
      ${list.length ? `<div class="exgrid">${list.map(e => `<button class="excard" data-act="ex" data-id="${e.id}">${Fig.svg(e.id)}<b>${esc(e.n)}</b><span class="meta">${FAMILIES[e.fam].short}</span><span><span class="badge ${U.lvlCls(e.lvl)}">Nivel ${e.lvl}</span></span></button>`).join('')}</div>` : '<div class="card muted">No hay ejercicios con estos filtros.</div>'}`;
  }

  /* ================= PERFIL ================= */
  function viewProfile() {
    const st = S();
    const p = st.profile, set = st.settings;
    const b = Planner.bmi(p);
    const E = Planner.energy(p);
    const tog = (k, l, sub) => `<button class="opt ${set[k] ? 'on' : ''}" data-act="setting" data-k="${k}"><span class="grow"><b>${l}</b>${sub ? `<span class="small muted">${sub}</span>` : ''}</span><span class="check">${set[k] ? '✓' : ''}</span></button>`;
    const row = (l, v, step) => `<button class="li" data-act="edit-profile" data-step="${step}"><span class="grow">${l}</span><span class="muted small" style="text-align:right">${v}</span><span class="chev">›</span></button>`;
    const lbl = { sedentary: 'Sedentaria', light: 'Ligera', moderate: 'Moderada', active: 'Muy activa' };
    return `
      <div class="top"><h1>Perfil</h1></div>
      <div class="card hero"><h2>${esc(p.name || 'Atleta')}</h2><p class="muted small" style="margin:0">${p.age} años · ${p.weight} kg · ${p.height} cm · IMC ${b ? b.toFixed(1) : '–'} (${Planner.bmiLabel(b)})</p>${E ? `<p class="small" style="margin:6px 0 0">Gasto estimado ${E.tdee} kcal/día · Proteína ${E.prot[0]}–${E.prot[1]} g</p>` : ''}</div>
      <div class="list" style="margin-bottom:14px">
        ${row('Datos básicos', `${p.weight} kg · ${p.height} cm`, 1)}
        ${row('Fisionomía', { ecto: 'Ectomorfo', meso: 'Mesomorfo', endo: 'Endomorfo', unsure: 'Sin definir' }[p.bodyType] || '–', 2)}
        ${row('Hábitos', `${lbl[p.activity] || ''} · ${p.sleep} h sueño`, 3)}
        ${row('Test de nivel', `${p.tests.pushups} flex · ${p.tests.pullups ?? '–'} dom`, 4)}
        ${row('Objetivo', Planner.GOALS[p.goal].n, 5)}
        ${row('Días y duración', `${p.days.map(d => Planner.DAYS_S[d]).join(' ')} · ${p.minutes} min`, 6)}
        ${row('Material', p.equipment.length ? p.equipment.length + ' elementos' : 'Ninguno', 7)}
        ${row('Limitaciones', p.limits.length ? p.limits.length + ' zonas' : 'Ninguna', 8)}
      </div>
      <div class="section-title">Entrenamiento</div>
      ${tog('auto', 'Progresión automática', 'Sube o baja de variante según tus resultados')}
      ${tog('autoStart', 'Empezar los ejercicios solos', 'Si está desactivado, cada ejercicio espera a que pulses «Empezar»')}
      ${tog('sound', 'Sonidos', 'Pitidos en la cuenta atrás')}
      ${tog('vibrate', 'Vibración', 'Al terminar descansos e intervalos')}
      <label class="field"><span>Cuenta atrás antes de ejercicios por tiempo</span><select data-act="prep">${[3, 5, 10].map(v => `<option value="${v}" ${set.prep === v ? 'selected' : ''}>${v} segundos</option>`).join('')}</select></label>
      <label class="field"><span>Tema</span><select data-act="theme">${[['auto', 'Automático'], ['dark', 'Oscuro'], ['light', 'Claro']].map(([v, l]) => `<option value="${v}" ${set.theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="section-title">Música</div>
      ${window.Music ? Music.settingsHtml() : ''}
      <div class="section-title">Instalación</div>
      ${installCard()}
      <div class="section-title">Datos</div>
      <div class="row" style="margin-bottom:10px"><button class="btn ghost grow" data-act="export">⬇️ Exportar copia</button><label class="btn ghost grow" style="cursor:pointer">⬆️ Importar<input type="file" accept="application/json" id="importFile" hidden></label></div>
      <button class="btn danger block" data-act="reset">Borrar todos los datos</button>
      <p class="tiny muted center" style="margin-top:20px">Tus datos se guardan solo en este dispositivo. Haz una copia de seguridad de vez en cuando.<br>Esta app no sustituye el consejo médico.</p>`;
  }

  let themeSet = false;
  function applyTheme() {
    const t = S().settings.theme;
    // En 'auto' no se toca el atributo para respetar el tema del sistema o del visor
    if (t === 'auto') { if (themeSet) document.documentElement.removeAttribute('data-theme'); themeSet = false; } else { document.documentElement.dataset.theme = t; themeSet = true; }
  }

  /* ================= EVENTOS ================= */
  function setPath(obj, path, val) {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }

  const actions = {
    tab: el => go(el.dataset.v),
    mob: el => mobSheet(el.dataset.id),
    install: async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { /* noop */ } installEvt = null; render(); },
    'copy-url': () => { try { navigator.clipboard.writeText(APP_URL).then(() => toast('Dirección copiada'), () => toast('Mantén pulsada la dirección para copiarla')); } catch (e) { toast('Mantén pulsada la dirección para copiarla'); } },
    'go-install': () => { go('profile'); setTimeout(() => { const el = document.getElementById('install'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 50); },
    'hide-install': () => { S().settings.hideInstall = true; Store.save(); render(); },
    close: () => closeSheet(),
    'ob-next': () => { if (obStep < OB_STEPS.length - 1) { obStep++; window.scrollTo(0, 0); render(); } },
    'ob-back': () => { if (obStep > 0) { obStep--; render(); } },
    'ob-cancel': () => { ob = null; render(); },
    'ob-finish': async () => {
      if (S().profile && S().sessions.length && !(await ask('Se regenerará la rutina con tus nuevos datos. Tu historial se conserva.', 'Regenerar rutina'))) return;
      finishOnboarding();
    },
    'ob-set': el => { const v = el.dataset.num ? +el.dataset.v : el.dataset.v; ob[el.dataset.k] = v; render(); },
    'ob-tog': el => {
      const k = el.dataset.k, v = el.dataset.num ? +el.dataset.v : el.dataset.v;
      const arr = ob[k] || (ob[k] = []);
      const i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1); else arr.push(v);
      render();
    },
    start: el => { closeSheet(true); Workout.start(+el.dataset.d); },
    resume: () => Workout.resume(),
    'discard-active': async () => { if (await ask('¿Descartar la sesión en curso? Se perderá lo registrado.', 'Descartar', true)) { S().active = null; Store.save(); render(); } },
    'pick-day': pickDay,
    'all-recos': allRecos,
    'apply-changes': () => {
      const st = S();
      const last = st.sessions[st.sessions.length - 1];
      for (const c of last.changes || []) {
        if (c.applied) continue;
        for (const d of st.plan.days) d.items.forEach((it, k) => {
          if (it.exId !== c.exId) return;
          if (c.to) d.items[k] = { ...Planner.prescribe(EX[c.to], st.profile, it.role), sets: it.sets };
          else if (c.kind === 'up') it.target = it.type === 'time' ? [it.target[0] + 5, it.target[1] + 5] : [it.target[0] + 2, it.target[1] + 2];
        });
        c.applied = true;
      }
      Store.save(); render(); toast('Rutina actualizada');
    },
    'toggle-day': el => { const d = +el.dataset.d; const open = ui.openDay === d || (ui.openDay == null && S().plan.days[d].weekday === U.todayIdx()); ui.openDay = open ? -1 : d; render(); },
    ex: (el, e) => { if (e.target.closest('[data-act="swap"]')) return; exerciseSheet(el.dataset.id, el.dataset.d, el.dataset.i); },
    swap: el => {
      const st = S();
      Planner.swapExercise(st.plan, +el.dataset.d, +el.dataset.i, el.dataset.id, st.profile);
      Store.save();
      exerciseSheet(el.dataset.id, el.dataset.d, el.dataset.i);
      render();
      toast('Variante cambiada');
    },
    regen: async () => {
      if (!(await ask('Se creará una rutina nueva a partir de tu perfil y tus niveles actuales. Los cambios manuales de variantes se perderán.', 'Regenerar rutina'))) return;
      const st = S();
      st.plan = Planner.generate(st.profile);
      Store.save(); render(); toast('Rutina regenerada');
    },
    'edit-profile': el => { startOnboarding(+el.dataset.step || 1); render(); window.scrollTo(0, 0); },
    session: el => sessionSheet(el.dataset.id),
    'del-session': async el => {
      if (!(await ask('¿Eliminar esta sesión del historial?', 'Eliminar', true))) return;
      const st = S();
      st.sessions = st.sessions.filter(s => s.id !== el.dataset.id);
      Store.save(); closeSheet(); render();
    },
    'add-weight': () => {
      const v = parseFloat(($('#bw').value || '').replace(',', '.'));
      if (!(v > 25 && v < 300)) { toast('Introduce un peso válido'); return; }
      const st = S();
      st.body.push({ date: Date.now(), kg: v });
      st.profile.weight = v;
      Store.save(); render(); toast('Peso registrado');
    },
    lib: el => { ui[el.dataset.k] = el.dataset.v; render(); },
    'lib-mine': () => { ui.libMine = !ui.libMine; render(); },
    setting: el => { const st = S(); st.settings[el.dataset.k] = !st.settings[el.dataset.k]; Store.save(); render(); },
    export: () => {
      const json = JSON.stringify(S(), null, 2);
      openSheet(`<div class="sheet-head"><h2>Copia de seguridad</h2><button class="icon-btn" data-act="close">✕</button></div>
        <p class="small muted">Guarda este texto en un archivo .json o en tus notas. Para restaurarlo, usa «Importar» en el perfil.</p>
        <textarea id="exportTxt" readonly class="mono">${esc(json)}</textarea>
        <div class="row" style="margin-top:10px"><button class="btn primary grow" data-act="copy-export">Copiar</button><button class="btn ghost grow" data-act="download-export">Descargar .json</button></div>`);
    },
    'copy-export': () => {
      const ta = $('#exportTxt');
      const fallback = () => { ta.focus(); ta.select(); try { document.execCommand('copy'); toast('Copiado'); } catch (e) { toast('Selecciona el texto y cópialo'); } };
      try { navigator.clipboard.writeText(ta.value).then(() => toast('Copiado'), fallback); } catch (e) { fallback(); }
    },
    'download-export': () => {
      const blob = new Blob([JSON.stringify(S(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `calistenia-copia-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    reset: async () => {
      if (!(await ask('Se borrarán perfil, rutina e historial de este dispositivo. No se puede deshacer.', 'Borrar todo', true))) return;
      Store.reset(); ob = null; view = 'home'; render();
    },
  };

  function bind() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (!el || el.tagName === 'SELECT') return;
      const fn = actions[el.dataset.act];
      if (fn) { e.preventDefault(); fn(el, e); }
    });
    document.addEventListener('input', e => {
      const el = e.target;
      if (el.dataset.bind && ob) {
        const v = el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value;
        setPath(ob, el.dataset.bind, v);
        if (el.dataset.bind === 'weight' || el.dataset.bind === 'height') { const b = $('#bmi'); if (b) b.innerHTML = bmiHtml(); }
        const nx = document.querySelector('[data-act="ob-next"]');
        const st = OB_STEPS[obStep];
        if (nx && st.valid) nx.disabled = !st.valid();
      }
    });
    document.addEventListener('change', e => {
      const el = e.target;
      const st = S();
      if (el.dataset.act === 'prog-ex') { ui.progEx = el.value; render(); }
      if (el.dataset.act === 'prep') { st.settings.prep = +el.value; Store.save(); }
      if (el.dataset.act === 'theme') { st.settings.theme = el.value; Store.save(); applyTheme(); }
      if (el.id === 'importFile' && el.files[0]) {
        const r = new FileReader();
        r.onload = () => {
          try {
            const data = JSON.parse(r.result);
            if (!data.profile || !data.plan) throw new Error('formato');
            Store.replace(data); applyTheme(); render(); toast('Copia importada');
          } catch (err) { toast('Archivo no válido'); }
        };
        r.readAsText(el.files[0]);
      }
    });
    window.addEventListener('popstate', () => {
      if (skipPop) { skipPop = false; return; }
      if (Workout.isOpen()) { Workout.onBack(); return; }
      if (ui.sheet) closeSheet(true);
    });
  }

  function init() {
    applyTheme();
    bind();
    if (S().plan && S().profile && Planner.refreshMobility(S().plan, S().profile)) Store.save();
    if (window.Music) Music.handleRedirect();
    const h = location.hash.slice(1);
    if (['home', 'plan', 'progress', 'library', 'profile'].includes(h)) view = h;
    render();
    if (S().active && S().profile) setTimeout(() => toast('Tienes un entrenamiento a medias'), 400);
  }

  return { init, render, go, toast, ask, openSheet, closeSheet, exerciseSheet, changeHtml, keyList, safeList };
})();
