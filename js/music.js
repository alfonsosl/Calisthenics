/*
 * Música con Spotify.
 * Nivel 1 (sin configuración): guardar el enlace de una playlist y abrirla en la app de Spotify.
 *   La música sigue sonando de fondo y los pitidos de la app se oyen por encima.
 * Nivel 2 (opcional, Spotify Premium): controlar la reproducción desde la app con la Web API
 *   oficial (OAuth PKCE, sin servidor). Requiere crear una app gratuita en developer.spotify.com
 *   y pegar su Client ID. Solo funciona en la app publicada (https), no en vistas embebidas.
 */
const Music = (() => {
  const S = () => Store.get();
  const cfg = () => (S().settings.music = S().settings.music || {});
  const { esc } = U;
  const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing';
  const state = { track: null, artist: '', playing: false, err: null };
  let pollId = null;

  /* ---------- Enlace de playlist ---------- */
  function normalizeLink(v) {
    v = (v || '').trim();
    let m = v.match(/^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]+)$/);
    if (m) return `https://open.spotify.com/${m[1]}/${m[2]}`;
    m = v.match(/^https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/);
    if (m) return `https://open.spotify.com/${m[1]}/${m[2]}`;
    return null;
  }
  const link = () => cfg().link || null;

  /* ---------- Conexión (OAuth PKCE) ---------- */
  const connected = () => !!(cfg().clientId && cfg().refresh);
  const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, '');
  function canAuth() {
    let top = true;
    try { top = window.self === window.top; } catch (e) { top = false; }
    return top && (location.protocol === 'https:' || location.hostname === '127.0.0.1') && !!(window.crypto && crypto.subtle);
  }
  function rand(n) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const a = crypto.getRandomValues(new Uint8Array(n));
    return Array.from(a, x => chars[x % chars.length]).join('');
  }
  async function challenge(verifier) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function connect() {
    const c = cfg();
    if (!c.clientId) { App.toast('Pega primero tu Client ID'); return; }
    if (!canAuth()) { App.toast('Abre la app publicada (https) para conectar Spotify'); return; }
    const verifier = rand(64);
    c.pkce = { verifier, state: rand(16) };
    Store.save();
    const q = new URLSearchParams({ client_id: c.clientId, response_type: 'code', redirect_uri: redirectUri(), code_challenge_method: 'S256', code_challenge: await challenge(verifier), scope: SCOPES, state: c.pkce.state });
    location.href = 'https://accounts.spotify.com/authorize?' + q;
  }
  async function tokenRequest(body) {
    const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error_description || j.error || 'token'); e.code = j.error; throw e; }
    return j;
  }
  function storeTokens(j) {
    const c = cfg();
    c.token = j.access_token;
    c.exp = Date.now() + (j.expires_in || 3600) * 1000;
    if (j.refresh_token) c.refresh = j.refresh_token;
    Store.save();
  }
  // Vuelta desde la pantalla de autorización de Spotify (?code=...)
  async function handleRedirect() {
    const q = new URLSearchParams(location.search);
    const code = q.get('code'), st = q.get('state'), err = q.get('error');
    if (!code && !err) return;
    history.replaceState(null, '', location.pathname + location.hash);
    const c = cfg();
    if (err) { App.toast('Conexión con Spotify cancelada'); return; }
    if (!c.pkce || c.pkce.state !== st) { App.toast('La respuesta de Spotify no coincide. Vuelve a intentarlo.'); return; }
    try {
      storeTokens(await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), client_id: c.clientId, code_verifier: c.pkce.verifier }));
      delete c.pkce; Store.save();
      App.toast('Spotify conectado 🎵');
      App.render();
    } catch (e) { App.toast('No se pudo conectar: ' + e.message); }
  }
  async function token() {
    const c = cfg();
    if (c.token && Date.now() < c.exp - 60000) return c.token;
    if (!c.refresh) return null;
    try {
      storeTokens(await tokenRequest({ grant_type: 'refresh_token', refresh_token: c.refresh, client_id: c.clientId }));
      return c.token;
    } catch (e) {
      if (e.code === 'invalid_grant') disconnect(true);
      return null;
    }
  }
  function disconnect(silent) {
    const c = cfg();
    delete c.token; delete c.refresh; delete c.exp;
    Store.save();
    state.track = null; state.playing = false;
    if (!silent) App.toast('Spotify desconectado');
  }

  /* ---------- Control de reproducción ---------- */
  async function api(method, path) {
    const t = await token();
    if (!t) { const e = new Error('auth'); e.status = 401; throw e; }
    const r = await fetch('https://api.spotify.com/v1' + path, { method, headers: { Authorization: 'Bearer ' + t } });
    if (r.status === 204 || r.status === 202) return null;
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      const e = new Error((j.error && j.error.message) || 'HTTP ' + r.status);
      e.status = r.status; e.reason = j.error && j.error.reason;
      throw e;
    }
    return (r.headers.get('content-type') || '').includes('json') ? r.json() : null;
  }
  function errMsg(e) {
    if (e.reason === 'PREMIUM_REQUIRED' || e.status === 403) return 'Controlar la música desde aquí requiere Spotify Premium';
    if (e.reason === 'NO_ACTIVE_DEVICE' || e.status === 404) return 'Abre Spotify y pon algo a sonar una vez';
    if (e.status === 401) return 'Vuelve a conectar Spotify en Perfil';
    if (e.status === 429) return 'Spotify pide esperar unos segundos';
    return 'No se pudo contactar con Spotify';
  }
  async function refreshState() {
    if (!connected()) return;
    try {
      const p = await api('GET', '/me/player');
      state.track = p && p.item ? p.item.name : null;
      state.artist = p && p.item ? (p.item.artists || p.item.show ? (p.item.artists || []).map(a => a.name).join(', ') : '') : '';
      state.playing = !!(p && p.is_playing);
      state.err = null;
    } catch (e) { state.err = errMsg(e); }
    paint();
  }
  async function cmd(method, path, optimistic) {
    if (optimistic != null) { state.playing = optimistic; paint(); }
    try { await api(method, path); } catch (e) { App.toast(errMsg(e)); }
    setTimeout(refreshState, 700);
  }
  const play = () => cmd('PUT', '/me/player/play', true);
  const pause = () => cmd('PUT', '/me/player/pause', false);
  const nextT = () => cmd('POST', '/me/player/next');
  const prevT = () => cmd('POST', '/me/player/previous');
  // Al pulsar «Parar» en el entrenamiento: pausa la música si estaba sonando
  async function pauseForStop() {
    if (!connected() || cfg().pauseOnStop === false || !state.playing) return false;
    await pause();
    return true;
  }
  function startPoll() { stopPoll(); if (connected()) { refreshState(); pollId = setInterval(refreshState, 15000); } }
  function stopPoll() { clearInterval(pollId); pollId = null; }

  /* ---------- Interfaz ---------- */
  function barInner() {
    return `<span class="mu-ico">🎵</span><div class="grow mu-t"><b>${esc(state.track || 'Spotify conectado')}</b><span>${esc(state.err || state.artist || (state.track ? '' : 'Pulsa ▶ para reproducir'))}</span></div>
      <button class="mu-b" data-mu="prev" aria-label="Anterior">⏮</button><button class="mu-b main" data-mu="toggle" aria-label="${state.playing ? 'Pausar música' : 'Reproducir música'}">${state.playing ? '⏸' : '▶'}</button><button class="mu-b" data-mu="next" aria-label="Siguiente">⏭</button>`;
  }
  function paint() { const el = document.getElementById('mu-bar'); if (el) el.innerHTML = barInner(); }
  function barHtml() {
    if (connected()) return `<div class="mu-bar" id="mu-bar">${barInner()}</div>`;
    if (link()) return `<div class="mu-bar"><span class="mu-ico">🎵</span><span class="grow small">Tu playlist</span><a class="btn sm" href="${esc(link())}" target="_blank" rel="noopener">Abrir en Spotify</a></div>`;
    return '';
  }
  function heroLink() {
    if (connected()) return '';
    return link() ? `<a class="btn ghost block" style="margin-top:10px" href="${esc(link())}" target="_blank" rel="noopener">🎵 Abrir mi playlist en Spotify</a>` : '';
  }
  function settingsHtml() {
    const c = cfg();
    const uri = redirectUri();
    return `<div class="card" id="music"><h3>🎵 Música con Spotify</h3>
      <p class="small muted">Guarda tu playlist y ábrela con un toque al entrenar. Spotify sigue sonando de fondo y los pitidos de la app se oyen por encima.</p>
      <label class="field"><span>Enlace de tu playlist</span><input id="mu-link" type="text" inputmode="url" placeholder="https://open.spotify.com/playlist/…" value="${esc(c.link || '')}"></label>
      <p class="tiny muted" style="margin-top:-8px">En Spotify: abre la playlist → ⋯ → Compartir → Copiar enlace.</p>
      <div class="row"><button class="btn primary grow" data-mu="save-link">Guardar</button>${c.link ? `<a class="btn ghost grow" href="${esc(c.link)}" target="_blank" rel="noopener">Probar</a>` : '<a class="btn ghost grow" href="https://open.spotify.com/search/calistenia" target="_blank" rel="noopener">Buscar playlists</a>'}</div>
      <details style="margin-top:12px"><summary>Avanzado: controlar la música desde la app (Premium)</summary>
        ${connected() ? `<p class="small">✅ Conectado. Durante el entrenamiento verás la canción y los botones ⏮ ⏯ ⏭.</p>
          <button class="opt ${c.pauseOnStop === false ? '' : 'on'}" data-mu="toggle-pause"><span class="grow"><b>Pausar la música al pulsar «Parar»</b></span><span class="check">${c.pauseOnStop === false ? '' : '✓'}</span></button>
          <button class="btn danger block" data-mu="disconnect">Desconectar Spotify</button>` : `
          <ol class="small steps">
            <li>Entra en <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a> con tu cuenta de Spotify y pulsa <b>Create app</b>.</li>
            <li>Pon el nombre que quieras. En <b>Redirect URI</b> pega esta dirección:<div class="row" style="margin:6px 0"><code class="url grow">${esc(uri)}</code><button class="btn sm" data-mu="copy-uri">Copiar</button></div></li>
            <li>Marca <b>Web API</b>, acepta las condiciones y guarda.</li>
            <li>Copia el <b>Client ID</b> de tu app y pégalo aquí:</li>
          </ol>
          <label class="field"><span>Client ID</span><input id="mu-client" type="text" autocomplete="off" spellcheck="false" value="${esc(c.clientId || '')}" placeholder="32 caracteres"></label>
          ${canAuth() ? '' : '<p class="small warn">Ahora estás en una vista previa: la conexión solo funciona desde la app publicada o instalada.</p>'}
          <button class="btn primary block" data-mu="connect" ${canAuth() ? '' : 'disabled'}>Conectar con Spotify</button>
          <p class="tiny muted">Necesitas Spotify Premium para controlar la reproducción. El Client ID no es secreto; no se guarda ninguna contraseña.</p>`}
      </details></div>`;
  }

  const actions = {
    toggle: () => (state.playing ? pause() : play()),
    next: nextT, prev: prevT,
    'save-link': () => {
      const v = document.getElementById('mu-link').value;
      if (!v.trim()) { delete cfg().link; Store.save(); App.render(); App.toast('Enlace borrado'); return; }
      const n = normalizeLink(v);
      if (!n) { App.toast('Pega un enlace de Spotify (open.spotify.com/…)'); return; }
      cfg().link = n; Store.save(); App.render(); App.toast('Playlist guardada');
    },
    'copy-uri': () => { try { navigator.clipboard.writeText(redirectUri()).then(() => App.toast('Copiado'), () => App.toast('Mantén pulsada la dirección para copiarla')); } catch (e) { App.toast('Mantén pulsada la dirección para copiarla'); } },
    connect: () => {
      const v = (document.getElementById('mu-client').value || '').trim();
      if (!/^[0-9a-f]{32}$/i.test(v)) { App.toast('El Client ID tiene 32 caracteres (letras y números)'); return; }
      cfg().clientId = v; Store.save();
      connect();
    },
    disconnect: () => { disconnect(); App.render(); },
    'toggle-pause': () => { const c = cfg(); c.pauseOnStop = c.pauseOnStop === false; Store.save(); App.render(); },
  };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-mu]');
    if (!el) return;
    const fn = actions[el.dataset.mu];
    if (fn) { e.preventDefault(); fn(el); }
  });

  return { handleRedirect, barHtml, heroLink, settingsHtml, startPoll, stopPoll, pauseForStop, play, pause, connected, normalizeLink };
})();
window.Music = Music;
