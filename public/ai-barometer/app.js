/* plaiground · AI Brand Barometer (frontend) */
(function () {
  'use strict';
  var H = document.documentElement, $ = function (id) { return document.getElementById(id); };
  var L = function () { return H.getAttribute('data-lang') === 'en' ? 'en' : 'es'; };
  var tr = function (es, en) { return L() === 'en' ? en : es; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dark = function () { return H.getAttribute('data-theme') === 'dark'; };
  var PAL = { light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'], dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767'] };
  var SEQ = ['#e6eefb', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#2a78d6', '#1c5cab', '#104281', '#0d366b'];
  var SEQ_D = ['#1d2448', '#1c2f5e', '#1c3f7d', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#6da7ec', '#9ec5f4'];
  var MAXC = function () { return (S.cfg && S.cfg.limits && S.cfg.limits.competitors) || 7; };
  var col = function (i) { return (dark() ? PAL.dark : PAL.light)[i % 8]; };
  var seq = function (t) { var r = dark() ? SEQ_D : SEQ; return r[Math.max(0, Math.min(8, Math.round(t * 8)))]; };
  var inkOn = function (t) { return dark() ? (t > .55 ? '#0B0D1F' : '#ECEEFF') : (t > .45 ? '#fff' : '#14162E'); };
  var pct = function (x) { return x == null ? '—' : Math.round(x * 100) + '%'; };
  var num = function (x, d) { return x == null ? '—' : (L() === 'es' ? x.toFixed(d).replace('.', ',') : x.toFixed(d)); };
  var ENG_NAME = { gemini: 'Gemini', chatgpt: 'ChatGPT', claude: 'Claude', perplexity: 'Perplexity' };
  var S = { cfg: null, setup: null, mode: 'demo', reason: '', engines: [], sel: {}, study: null, hist: [], exSel: 0 };

  function api(path, opt) {
    opt = opt || {}; opt.credentials = 'same-origin'; opt.headers = Object.assign({ 'content-type': 'application/json' }, opt.headers || {});
    return fetch(path, opt).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, d: d }; }); }).catch(function () { return { ok: false, status: 0, d: { error: 'network' } }; });
  }

  /* ---------- cabecera ---------- */
  document.querySelectorAll('.pill button').forEach(function (b) { b.onclick = function () { H.setAttribute('data-lang', b.dataset.l); H.lang = b.dataset.l; try { localStorage.setItem('plg-lang', b.dataset.l); } catch (e) { } (function(l){try{var u=new URL(location.href);if(l==='en')u.searchParams.set('lang','en');else u.searchParams.delete('lang');history.replaceState(history.state,'',u.pathname+u.search+u.hash)}catch(e){}})(b.dataset.l); rerender(); }; });
  $('themeBtn').onclick = function () { var t = dark() ? 'light' : 'dark'; H.setAttribute('data-theme', t); try { localStorage.setItem('plg-theme', t); } catch (e) { } rerender(); };
  function ph() { $('url').placeholder = tr('tuempresa.com', 'yourcompany.com'); }
  ph();
  function rerender() { ph(); if (S.setup && !S.study && !S.running) renderSetup(); if (S.study) renderResults(); renderHistory(); renderWho(); }
  function renderWho() {
    var u = S.cfg && S.cfg.user, w = $('who');
    if (S.viewer) { w.innerHTML = ''; return; }
    if (!u) {
      w.innerHTML = '<button type="button" class="ubtn" id="ubtn" aria-haspopup="true" aria-expanded="false" style="padding:8px 14px">' + tr('Entrar', 'Sign in') + '</button>' +
        '<div class="umenu" role="dialog" aria-label="' + tr('Entrar', 'Sign in') + '"><div class="em"><b style="color:var(--ink)">' + tr('Entra para ver tu histórico', 'Sign in to see your history') + '</b><br>' + tr('Te enviamos un enlace al email, sin contraseña.', 'We email you a link, no password.') + '</div>' +
        '<form id="hform" style="padding:4px 8px 8px"><input class="t" id="hem" type="email" autocomplete="email" placeholder="' + tr('tu@empresa.com', 'you@company.com') + '" style="margin-bottom:8px"><label class="small" style="display:flex;gap:8px;margin-bottom:10px"><input type="checkbox" id="hacc"> <span>' + tr('Acepto los <a href="/legal/terminos/" target="_blank">términos</a> y la <a href="/legal/privacidad/" target="_blank">privacidad</a>.', 'I accept the <a href="/legal/terminos/" target="_blank">terms</a> and <a href="/legal/privacidad/" target="_blank">privacy</a>.') + '</span></label><button class="btn" type="submit" style="width:100%;justify-content:center;padding:12px">' + tr('Enviar enlace', 'Send link') + '</button><div class="err" id="herr" style="font-size:13.5px"></div></form></div>';
      $('ubtn').onclick = function (e) { e.stopPropagation(); var o = !w.classList.contains('open'); w.classList.toggle('open', o); this.setAttribute('aria-expanded', o); if (o) setTimeout(function () { $('hem').focus(); }, 50); };
      $('hform').onsubmit = function (e) {
        e.preventDefault(); var em = $('hem').value.trim(), er = $('herr');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { er.textContent = tr('Escribe un email válido.', 'Enter a valid email.'); return; }
        if (!$('hacc').checked) { er.textContent = tr('Acepta los términos para continuar.', 'Accept the terms to continue.'); return; }
        api('/api/auth/request', { method: 'POST', body: JSON.stringify({ email: em, accepted: true, lang: L(), next: '/ai-barometer/' }) }).then(function (r) {
          er.style.color = r.ok ? 'var(--teal)' : ''; er.textContent = r.ok ? tr('¡Listo! Abre el enlace que te hemos enviado a ' + em + '.', 'Done! Open the link we sent to ' + em + '.') : r.d.error === 'too_many_requests' ? tr('Demasiados intentos. Espera unos minutos.', 'Too many attempts. Wait a few minutes.') : tr('No se pudo enviar. Inténtalo de nuevo.', 'Couldn’t send it. Try again.');
        });
      };
      return;
    }
    w.innerHTML = '<button type="button" class="ubtn" id="ubtn" aria-haspopup="true" aria-expanded="false" aria-label="' + tr('Tu cuenta', 'Your account') + '"><i>' + esc(u.email[0].toUpperCase()) + '</i><span>' + esc(u.email) + '</span></button>' +
      '<div class="umenu" role="menu"><div class="em">' + tr('Sesión iniciada como', 'Signed in as') + '<br><b style="color:var(--ink)">' + esc(u.email) + '</b></div>' +
      '<button type="button" role="menuitem" id="uHist">' + tr('Mi histórico', 'My history') + '</button><button type="button" role="menuitem" id="uNew">' + tr('Nuevo estudio', 'New study') + '</button><button type="button" role="menuitem" class="out" id="uOut">' + tr('Cerrar sesión', 'Sign out') + '</button></div>';
    var close = function () { w.classList.remove('open'); $('ubtn').setAttribute('aria-expanded', 'false'); };
    $('ubtn').onclick = function (e) { e.stopPropagation(); var o = !w.classList.contains('open'); w.classList.toggle('open', o); this.setAttribute('aria-expanded', o); };
    $('uHist').onclick = function () { close(); if (S.hist.length) $('history').scrollIntoView({ behavior: 'smooth', block: 'start' }); else $('url').focus(); };
    $('uNew').onclick = function () { close(); S.study = null; $('results').innerHTML = ''; $('setup').innerHTML = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); $('url').focus(); };
    $('uOut').onclick = function () {
      close();
      api('/api/auth/logout', { method: 'POST' }).then(function () {
        try { ['plg-aibb-answers', 'plg-aibb-setup', 'plg-aibb-autorun', 'plg-aibb-url'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { }
        S.cfg.user = null; S.hist = []; S.study = null; S.setup = null; S.unlock = null; S.unlockEmail = null;
        $('results').innerHTML = ''; $('setup').innerHTML = ''; $('run').innerHTML = ''; renderHistory(); renderWho();
        $('goErr').style.color = 'var(--teal)'; $('goErr').textContent = tr('Has cerrado sesión.', 'You’ve signed out.');
        setTimeout(function () { $('goErr').textContent = ''; $('goErr').style.color = ''; }, 4000);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    };
  }
  document.addEventListener('click', function (e) { var w = $('who'); if (w && !w.contains(e.target)) w.classList.remove('open'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var w = $('who'); if (w) w.classList.remove('open'); } });

  /* ---------- paso 1: web ---------- */
  $('goForm').onsubmit = function (e) {
    e.preventDefault();
    var v = $('url').value.trim();
    if (!/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(v)) { $('goErr').textContent = tr('Escribe la web de tu empresa, por ejemplo tuempresa.com', 'Enter your company website, e.g. yourcompany.com'); return; }
    $('goErr').textContent = ''; var b = $('goBtn'); b.disabled = true;
    S.study = null; $('results').innerHTML = ''; $('run').innerHTML = '';
    var stopPrep = prepAnim();
    var tries = 0;
    (function doSetup() { api('/api/aibb/setup', { method: 'POST', body: JSON.stringify({ url: v, lang: L() }) }).then(function (r) {
      // Si la IA estaba saturada y no detectó competidores, se reintenta solo una vez antes de pedir la revisión manual
      if (r.ok && r.d.reason === 'auto_failed' && !(r.d.setup && r.d.setup.competitors && r.d.setup.competitors.length) && tries++ < 1) { setTimeout(doSetup, 4000); return; }
      stopPrep(); b.disabled = false;
      if (!r.ok) { $('setup').innerHTML = ''; $('goErr').innerHTML = r.d.error === 'user_limit' ? tr('Has llegado al máximo de estudios gratuitos de hoy desde este dispositivo. Vuelve mañana' + (S.cfg && S.cfg.user ? '.' : ' o <a href="#" id="limitLogin">entra con tu email</a> para ver tus estudios.'), 'You’ve reached today’s free study limit on this device. Come back tomorrow' + (S.cfg && S.cfg.user ? '.' : ' or <a href="#" id="limitLogin">sign in with your email</a> to see your studies.')) : r.d.error === 'global_limit' ? tr('Hoy se ha agotado el cupo gratuito de la beta. Vuelve mañana.', 'Today’s free beta quota is used up. Come back tomorrow.') : r.d.error === 'invalid_url' ? tr('Esa web no parece válida.', 'That website doesn’t look valid.') : tr('No se pudo preparar el estudio. Inténtalo de nuevo.', 'Couldn’t prepare the study. Try again.'); var ll = $('limitLogin'); if (ll) ll.onclick = function (e) { e.preventDefault(); e.stopPropagation(); window.scrollTo({ top: 0, behavior: 'smooth' }); $('who').classList.add('open'); setTimeout(function () { var hh = $('hem'); if (hh) hh.focus(); }, 300); }; return; }
      S.setup = r.d.setup; S.mode = r.d.mode; S.reason = r.d.reason || ''; S.engines = r.d.engines || [];
      S.sel = {}; S.engines.forEach(function (x) { S.sel[x.id] = x.active; });
      // Flujo directo: se analiza todo sin paso intermedio. Solo se pide revisar si no se detectaron competidores.
      if (S.mode === 'demo' || (S.reason === 'auto_failed' && !S.setup.competitors.length)) { renderSetup(); $('setup').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else { S.unlock = null; runLive(); }
    }); })();
  };

  // Tarjeta animada mientras se lee la web y se prepara el estudio (mismo estilo que el progreso del estudio)
  function prepAnim() {
    var steps = [tr('Leyendo tu web', 'Reading your website'), tr('Entendiendo tu marca y tu categoría', 'Understanding your brand and category'), tr('Buscando a tus competidores', 'Finding your competitors'), tr('Preparando las preguntas de tus compradores', 'Preparing your buyers’ questions')];
    var t0 = Date.now(), done = false;
    function draw() {
      if (done) return;
      var el = (Date.now() - t0) / 1000, p = Math.min(94, Math.round(100 * (1 - Math.exp(-el / 5)))), k = Math.min(steps.length - 1, Math.floor(p / 25));
      $('setup').innerHTML = '<section class="card sec"><div class="runh"><div><div class="eyebrow">' + tr('Preparando tu estudio', 'Preparing your study') + '</div><h2 style="font-size:30px;margin-top:8px">' + steps[k] + '…</h2>' + (el > 25 ? '<p style="margin:8px 0 0;color:var(--muted)">' + tr('La IA está muy solicitada ahora mismo. Seguimos intentándolo, puede tardar hasta 2 minutos…', 'The AI is in high demand right now. We’re still trying, it can take up to 2 minutes…') + '</p>' : '') + '</div><b style="font:800 34px var(--display)">' + p + '%</b></div><div class="bar"><i style="width:' + p + '%"></i></div>' +
        '<div class="tasks">' + steps.map(function (x, i) { return '<div class="task ' + (i < k ? 'ok' : i === k ? 'on' : '') + '"><span class="st">' + (i < k ? '✓' : '') + '</span><span>' + x + '</span></div>'; }).join('') + '</div></section>';
      setTimeout(draw, 400);
    }
    draw(); setTimeout(function () { $('setup').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
    return function () { done = true; };
  }

  /* ---------- paso 2: revisar y lanzar ---------- */
  function renderSetup() {
    var s = S.setup; if (!s) return;
    var gate = S.mode === 'login', live = S.mode === 'live' || gate, T = (S.cfg && S.cfg.teaser) || 3;
    var auto = S.reason === 'auto_failed' ? '<div style="margin-top:6px">' + tr('⚠️ No pudimos detectar tus competidores. Añádelos abajo o <a href="#" id="retrySetup">reintenta</a>.', '⚠️ We couldn’t detect your competitors. Add them below or <a href="#" id="retrySetup">try again</a>.') + '</div>' : '';
    var why = gate ? (S.reason === 'auto_failed' ? '' : tr('<b>Tu estudio está listo.</b> Lánzalo y en segundos verás una vista previa gratis.', '<b>Your study is ready.</b> Run it and see a free preview in seconds.'))
      : S.reason === 'user_limit' ? tr('Has llegado al máximo de estudios preparados hoy, así que te mostramos un <b>ejemplo</b>. Vuelve mañana.', 'You’ve hit today’s limit of prepared studies, so here’s a <b>sample</b>. Come back tomorrow.')
      : S.reason === 'login' ? tr('Este es un <b>estudio de ejemplo</b> (respuestas simuladas) para que veas cómo funciona. Para preguntar de verdad a las IA y guardar tu histórico, entra con tu email:', 'This is a <b>sample study</b> (simulated answers) so you can see how it works. To actually ask the AIs and keep your history, sign in with your email:')
      : S.reason === 'nokey' ? tr('La conexión con las IA todavía no está activada en esta beta, así que verás un <b>estudio de ejemplo</b> con respuestas simuladas.', 'The connection to the AIs isn’t switched on yet in this beta, so you’ll see a <b>sample study</b> with simulated answers.')
        : S.reason === 'rate_limited' ? tr('Las IA gratuitas están saturadas ahora mismo. Te mostramos un <b>estudio de ejemplo</b>; prueba de nuevo en unos minutos.', 'The free AIs are busy right now. Here’s a <b>sample study</b>; try again in a few minutes.')
          : tr('Te mostramos un <b>estudio de ejemplo</b> con respuestas simuladas.', 'Here’s a <b>sample study</b> with simulated answers.');
    var eng = S.engines.map(function (x) {
      var on = live ? x.active : true;
      return '<label class="' + (on ? '' : 'off') + '"><input type="checkbox" data-e="' + x.id + '"' + (on && (live ? S.sel[x.id] : true) ? ' checked' : '') + (on ? '' : ' disabled') + '> ' + esc(x.name) + (live && !x.active ? ' <small class="prem">Premium</small>' : '') + (!live ? ' <small>' + tr('simulado', 'simulated') + '</small>' : '') + '</label>';
    }).join('');
    $('setup').innerHTML = '<section class="card sec" id="setupCard">' +
      '<div class="banner ' + (live ? 'live' : '') + '"><span class="ic">' + (gate ? '🔑' : live ? '🛰️' : '🧪') + '</span><div>' + (gate ? why + auto : live ? auto + tr('<b>Estudio real.</b> Preguntaremos a las IA conectadas y guardaremos el resultado en tu histórico. Revisa los datos antes de lanzarlo.', '<b>Live study.</b> We’ll ask the connected AIs and save the result to your history. Check the details before running it.') : why) +
      (!gate && S.reason === 'login' ? '<form class="lform" id="lform"><input class="t" id="lem" type="email" autocomplete="email" placeholder="' + tr('tu@empresa.com', 'you@company.com') + '"><button class="btn" type="submit">' + tr('Recibir enlace de acceso', 'Get sign-in link') + '</button></form><label class="small" style="display:flex;gap:8px;margin-top:8px"><input type="checkbox" id="lacc"> <span>' + tr('Acepto los <a href="/legal/terminos/" target="_blank">términos</a> y la <a href="/legal/privacidad/" target="_blank">política de privacidad</a>.', 'I accept the <a href="/legal/terminos/" target="_blank">terms</a> and the <a href="/legal/privacidad/" target="_blank">privacy policy</a>.') + '</span></label><div class="err" id="lerr"></div>' : '') + '</div></div>' +
      '<h2 style="font-size:30px;margin:24px 0 16px">' + tr('Revisa tu estudio', 'Review your study') + '</h2>' +
      '<div class="grid2"><div><label class="f" for="sb">' + tr('Marca', 'Brand') + '</label><input class="t" id="sb" maxlength="60" value="' + esc(s.brand) + '"></div><div><label class="f" for="sc">' + tr('Categoría', 'Category') + '</label><input class="t" id="sc" maxlength="80" value="' + esc(s.category) + '"></div></div>' +
      '<div class="sec"><label class="f">' + tr('Competidores', 'Competitors') + ' <span style="text-transform:none;letter-spacing:0;font-weight:500">(' + s.competitors.length + ' · ' + tr('hasta ', 'up to ') + MAXC() + tr(' gratis', ' free') + ')</span></label><div class="chips" id="comps">' + s.competitors.map(function (c, i) { return '<span class="chip">' + esc(c) + '<button type="button" data-rc="' + i + '" aria-label="' + tr('Quitar', 'Remove') + ' ' + esc(c) + '">×</button></span>'; }).join('') + (s.competitors.length < MAXC() ? '<span class="chip add"><input id="addc" maxlength="60" placeholder="+ ' + tr('Añadir competidor', 'Add competitor') + '"></span>' : '<a class="chip prem-chip" href="/#contacto">✦ ' + tr('Más competidores con Premium', 'More competitors with Premium') + '</a>') + '</div></div>' +
      '<div class="sec"><label class="f">' + tr('Preguntas que haría un comprador', 'Questions a buyer would ask') + '</label><div class="plist">' + s.prompts.map(function (p, i) { return '<div class="prow"><span class="n">' + (i + 1) + '</span><input class="t" data-p="' + i + '" maxlength="240" value="' + esc(p) + '"><button type="button" data-rp="' + i + '" aria-label="' + tr('Quitar pregunta', 'Remove question') + '">×</button></div>'; }).join('') + '</div>' + (s.prompts.length < 10 ? '<button type="button" class="btn ghost" id="addp" style="margin-top:10px;padding:10px 16px;font-size:14px">+ ' + tr('Añadir pregunta', 'Add question') + '</button>' : '') + '</div>' +
      '<div class="sec"><label class="f">' + tr('Asistentes de IA', 'AI assistants') + '</label><div class="eng">' + eng + '</div></div>' +
      (live && S.engines.some(function (x) { return !x.active; }) ? '<p class="small" style="margin-top:10px">' + tr('ChatGPT, Claude y Perplexity llegarán con el <b>informe Premium</b>. <a href="/#contacto">Quiero que me avisen</a>', 'ChatGPT, Claude and Perplexity will come with the <b>Premium report</b>. <a href="/#contacto">Let me know</a>') + '</p>' : '') +
      '<div class="row"><span class="small">' + (gate ? tr('Gratis · resultados en unos segundos · sin registro para la vista previa', 'Free · results in seconds · no sign-up for the preview') : live ? tr('Tarda 1–2 minutos. Las respuestas se guardan tal cual las dan los modelos.', 'Takes 1–2 minutes. Answers are stored exactly as the models give them.') : tr('Las respuestas del modo demo son inventadas y solo sirven para ver el informe.', 'Demo answers are made up and only show what the report looks like.')) + '</span><button class="btn" id="runBtn" type="button">' + (gate ? tr('Analizar ahora', 'Analyze now') : live ? tr('Lanzar estudio', 'Run study') : tr('Ver estudio de ejemplo', 'See sample study')) + ' →</button></div></section>';
    bindSetup();
  }
  function readSetup() {
    var s = S.setup; s.brand = $('sb').value.trim() || s.brand; s.category = $('sc').value.trim();
    document.querySelectorAll('[data-p]').forEach(function (i) { s.prompts[+i.dataset.p] = i.value.trim(); });
    var stg = s.stages || []; s.stages = s.prompts.map(function (p, i) { return p ? (stg[i] || null) : '\u0000'; }).filter(function (x) { return x !== '\u0000'; });
    s.prompts = s.prompts.filter(Boolean);
    document.querySelectorAll('[data-e]').forEach(function (c) { S.sel[c.dataset.e] = c.checked; });
  }
  function bindSetup() {
    document.querySelectorAll('[data-rc]').forEach(function (b) { b.onclick = function () { readSetup(); S.setup.competitors.splice(+b.dataset.rc, 1); renderSetup(); }; });
    document.querySelectorAll('[data-rp]').forEach(function (b) { b.onclick = function () { readSetup(); S.setup.prompts.splice(+b.dataset.rp, 1); if (S.setup.stages) S.setup.stages.splice(+b.dataset.rp, 1); renderSetup(); }; });
    var ac = $('addc'); if (ac) ac.onkeydown = function (e) { if (e.key === 'Enter' && ac.value.trim()) { e.preventDefault(); readSetup(); S.setup.competitors.push(ac.value.trim()); renderSetup(); var n = $('addc'); if (n) n.focus(); } };
    var ap = $('addp'); if (ap) ap.onclick = function () { readSetup(); S.setup.prompts.push(''); renderSetup(); var all = document.querySelectorAll('[data-p]'); all[all.length - 1].focus(); };
    bindLogin();
    var rs = $('retrySetup'); if (rs) rs.onclick = function (e) { e.preventDefault(); $('goForm').requestSubmit ? $('goForm').requestSubmit() : $('goBtn').click(); };
    $('runBtn').onclick = function () { readSetup(); if (!S.setup.prompts.length) return; if (S.reason === 'auto_failed' && !S.setup.competitors.length) { var ac2 = $('addc'); if (ac2) { ac2.focus(); ac2.placeholder = tr('+ Añade al menos un competidor', '+ Add at least one competitor'); } return; } S.mode === 'demo' ? runDemo() : runLive(); };
    var dl = $('demoLink'); if (dl) dl.onclick = function (e) { e.preventDefault(); readSetup(); runDemo(); };
  }

  function loginFormHtml() {
    return '<form class="lform" id="lform"><input class="t" id="lem" type="email" autocomplete="email" placeholder="' + tr('tu@empresa.com', 'you@company.com') + '"><button class="btn" type="submit">' + tr('Desbloquear informe', 'Unlock report') + '</button></form><label class="small" style="display:flex;gap:8px;margin-top:8px;text-align:left"><input type="checkbox" id="lacc"> <span>' + tr('Acepto los <a href="/legal/terminos/" target="_blank">términos</a> y la <a href="/legal/privacidad/" target="_blank">política de privacidad</a>.', 'I accept the <a href="/legal/terminos/" target="_blank">terms</a> and the <a href="/legal/privacidad/" target="_blank">privacy policy</a>.') + '</span></label><div class="err" id="lerr"></div>';
  }
  function bindLogin() {
    var lf = $('lform'); if (!lf) return;
    lf.onsubmit = function (e) {
      e.preventDefault(); var em = $('lem').value.trim(), er = $('lerr');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { er.textContent = tr('Escribe un email válido.', 'Enter a valid email.'); return; }
      if (!$('lacc').checked) { er.textContent = tr('Acepta los términos para continuar.', 'Accept the terms to continue.'); return; }
      if ($('sb')) readSetup();
      try { localStorage.setItem('plg-aibb-url', $('url').value.trim() || (S.setup && S.setup.domain) || ''); if (S.setup) localStorage.setItem('plg-aibb-setup', JSON.stringify(S.setup)); localStorage.setItem('plg-aibb-autorun', '1'); } catch (x) { }
      var b = lf.querySelector('button'); b.disabled = true;
      if ((S.study && S.study.partial) || (S.limitHit === 'teaser_limit' && S.setup)) {
        api('/api/aibb/unlock', { method: 'POST', body: JSON.stringify({ email: em, accepted: true, lang: L() }) }).then(function (r) {
          b.disabled = false;
          if (!r.ok) { er.textContent = r.d.error === 'too_many_requests' ? tr('Demasiados intentos. Espera unos minutos.', 'Too many attempts. Wait a few minutes.') : r.d.error === 'invalid_email' ? tr('Revisa tu email.', 'Check your email.') : tr('No se pudo desbloquear. Inténtalo de nuevo.', 'Couldn’t unlock. Try again.'); return; }
          try { localStorage.removeItem('plg-aibb-setup'); localStorage.removeItem('plg-aibb-autorun'); localStorage.removeItem('plg-aibb-url'); } catch (x) { }
          S.unlock = r.d.unlock; S.unlockEmail = em; S.limitHit = null; runLive();
        });
        return;
      }
      api('/api/auth/request', { method: 'POST', body: JSON.stringify({ email: em, accepted: true, lang: L(), next: '/ai-barometer/' }) }).then(function (r) {
        b.disabled = false; er.style.color = r.ok ? 'var(--teal)' : '';
        er.textContent = r.ok ? tr('¡Listo! Te hemos enviado un enlace a ' + em + '. Ábrelo y verás aquí tu informe completo.', 'Done! We’ve sent a link to ' + em + '. Open it and your full report will be here.') : r.d.error === 'too_many_requests' ? tr('Demasiados intentos. Espera unos minutos.', 'Too many attempts. Wait a few minutes.') : r.d.error === 'email_not_configured' ? tr('El acceso por email no está disponible ahora mismo.', 'Email sign-in isn’t available right now.') : tr('No se pudo enviar. Inténtalo en unos minutos.', 'Couldn’t send it. Try again in a few minutes.');
      });
    };
  }

  /* ---------- paso 3: ejecutar ---------- */
  function runDemo() {
    S.running = true; $('setup').innerHTML = ''; renderRun([], 0, 1); $('run').scrollIntoView({ behavior: 'smooth', block: 'start' });
    api('/api/aibb/finish', { method: 'POST', body: JSON.stringify({ setup: S.setup, demo: true }) }).then(function (r) {
      S.running = false; $('run').innerHTML = '';
      if (!r.ok) { $('goErr').textContent = tr('No se pudo generar el estudio.', 'Couldn’t generate the study.'); return; }
      S.study = r.d.study; $('setup').innerHTML = ''; renderResults(); $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  // Respuestas ya obtenidas (vista previa + preparación en segundo plano), para no repetirlas tras entrar con el email
  var sig = function (st) { return st.domain + '|' + st.prompts.join('|'); };
  function cacheGet() { try { var c = JSON.parse(localStorage.getItem('plg-aibb-answers') || 'null'); return c && S.setup && c.sig === sig(S.setup) ? c.answers : []; } catch (e) { return []; } }
  function cachePut(list) { try { localStorage.setItem('plg-aibb-answers', JSON.stringify({ sig: sig(S.setup), answers: list, ts: Date.now() })); } catch (e) { } }
  function prefetch(engine) {
    var have = cacheGet(), todo = S.setup.prompts.filter(function (p) { return !have.some(function (a) { return a.prompt === p && a.engine === engine; }); });
    var k = 0, total = S.setup.prompts.length;
    var show = function () { var el = $('preProg'); if (el) { var n = cacheGet().length; el.innerHTML = n >= total ? '✓ ' + tr('Tu informe completo ya está listo: entra con tu email y lo verás al instante.', 'Your full report is ready: sign in with your email and you’ll see it instantly.') : '⏳ ' + tr('Ya estamos preparando tu informe completo (' + n + ' de ' + total + ' preguntas)…', 'We’re already preparing your full report (' + n + ' of ' + total + ' questions)…'); } };
    show();
    (function step() {
      if (k >= todo.length || S.cfg.user) return show();
      setTimeout(function () {
        api('/api/aibb/ask', { method: 'POST', body: JSON.stringify({ setup: S.setup, engine: engine, prompt: todo[k] }) }).then(function (r) {
          if (r.ok && r.d.text) { var c = cacheGet(); c.push({ engine: engine, prompt: todo[k], text: r.d.text }); cachePut(c); k++; show(); step(); }
          else if (r.status !== 429) { k++; step(); } else show();
        });
      }, 4200);
    })();
  }
  function runLive(teaser) {
    var engines = S.engines.filter(function (e) { return e.active && (teaser || S.sel[e.id]); }).map(function (e) { return e.id; });
    if (teaser) engines = engines.slice(0, 1);
    if (!engines.length) return;
    var ps = teaser ? S.setup.prompts.slice(0, (S.cfg && S.cfg.teaser) || 3) : S.setup.prompts;
    var cached = cacheGet(), answers = [];
    var jobs = []; engines.forEach(function (e) { ps.forEach(function (p) { var hit = cached.filter(function (a) { return a.prompt === p && a.engine === e; })[0]; if (hit) answers.push(hit); else jobs.push({ engine: e, prompt: p, st: '' }); }); });
    S.running = true; $('setup').innerHTML = '';
    var hw = $('how'); if (hw) hw.hidden = true; // los pasos 01/02/03 solo tienen sentido antes del primer estudio
    if (!jobs.length) {
      // Todas las respuestas ya están calculadas (desbloqueo con email): no se muestra una barra desde 0%, se abre el informe en el sitio
      var lb = document.querySelector('#lform button'); if (lb) { lb.disabled = true; lb.textContent = tr('Abriendo tu informe completo…', 'Opening your full report…'); }
    } else { $('results').innerHTML = ''; renderRun(jobs, 0, jobs.length + 1); $('run').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    // Cola de trabajo: si una pregunta falla (IA saturada), se reintenta una vez al final sin cambiar el orden en pantalla.
    var queue = jobs.map(function (x, k) { return k; }), done = 0, fails = 0;
    S.bgJob = null; if (jobs.length > 2) { bgBox(); $('bgbox').scrollIntoView({ behavior: 'smooth', block: 'start' }); } else removeBg();
    (function next() {
      if (S.bgJob) return; // el estudio sigue en el servidor (avísame por email)
      if (!queue.length) return finish();
      var j = jobs[queue.shift()]; j.st = 'on'; renderRun(jobs, done, jobs.length + 1);
      api('/api/aibb/ask', { method: 'POST', body: JSON.stringify({ setup: S.setup, engine: j.engine, prompt: j.prompt, unlock: teaser ? undefined : S.unlock }) }).then(function (r) {
        if (S.bgJob) return;
        if (r.ok && r.d.text) { j.st = 'ok'; answers.push({ engine: j.engine, prompt: j.prompt, text: r.d.text }); if (teaser || !(S.cfg && S.cfg.user)) cachePut(answers.slice()); }
        else { j.st = 'ko'; if (r.status === 429 && (r.d.error === 'global_limit' || r.d.error === 'teaser_limit')) { S.limitHit = r.d.error; queue = []; return finish(); } if (!j.retried) { j.retried = true; j.st = 'wait'; queue.push(jobs.indexOf(j)); }
          // Si las 3 primeras preguntas fallan sin ninguna respuesta, la IA gratuita está caída: se para y se avisa en vez de esperar minutos
          if (++fails >= 3 && !answers.length) { S.running = false; return busyCard(teaser); } }
        if (j.st !== 'wait') done++; renderRun(jobs, done, jobs.length + 1);
        setTimeout(next, queue.length ? 4200 : 0); // respeta el límite por minuto de la capa gratuita
      });
    })();
    // Caja "puede tardar unos minutos · te avisamos por email": crea un trabajo en el servidor que sigue aunque se cierre la página
    function bgBox() {
      var bx = $('bgbox'); if (!bx) { bx = document.createElement('div'); bx.id = 'bgbox'; $('run').insertAdjacentElement('beforebegin', bx); }
      var logged = S.cfg && S.cfg.user;
      bx.innerHTML = '<section class="card sec" style="margin-bottom:14px"><div class="eyebrow">⏱️ ' + tr('Puede tardar unos minutos', 'This can take a few minutes') + '</div><p style="margin:8px 0 14px;color:var(--muted)">' +
        (logged ? tr('Si no quieres esperar, te enviamos un email a <b>' + esc(S.cfg.user.email) + '</b> cuando el informe esté listo y puedes cerrar esta página. O espera aquí el progreso.', 'If you don’t want to wait, we’ll email <b>' + esc(S.cfg.user.email) + '</b> when the report is ready and you can close this page. Or wait here.') + '</p><button class="btn" id="bgGo">' + tr('Avísame por email', 'Email me when ready') + '</button>'
          : tr('Déjanos tu email y te avisamos cuando el informe completo esté listo: puedes cerrar esta página. O espera aquí el progreso.', 'Leave your email and we’ll let you know when the full report is ready: you can close this page. Or wait here.') + '</p><form class="lform" id="bgForm"><input class="t" id="bgEm" type="email" autocomplete="email" placeholder="' + tr('tu@empresa.com', 'you@company.com') + '"><button class="btn" type="submit" id="bgGo">' + tr('Avísame por email', 'Email me when ready') + '</button></form><label class="small" style="display:flex;gap:8px;margin-top:8px"><input type="checkbox" id="bgAcc"> <span>' + tr('Acepto los <a href="/legal/terminos/" target="_blank">términos</a> y la <a href="/legal/privacidad/" target="_blank">política de privacidad</a>.', 'I accept the <a href="/legal/terminos/" target="_blank">terms</a> and the <a href="/legal/privacidad/" target="_blank">privacy policy</a>.') + '</span></label>') +
        '<div class="err" id="bgErr"></div></section>';
      function go(e) {
        if (e) e.preventDefault();
        var er = $('bgErr'), em = logged ? '' : ($('bgEm').value || '').trim();
        if (!logged && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { er.textContent = tr('Escribe un email válido.', 'Enter a valid email.'); return; }
        if (!logged && !$('bgAcc').checked) { er.textContent = tr('Acepta los términos para continuar.', 'Accept the terms to continue.'); return; }
        $('bgGo').disabled = true; er.textContent = '';
        api('/api/aibb/notify', { method: 'POST', body: JSON.stringify({ setup: S.setup, answers: answers, engines: engines, email: em, accepted: true, lang: L() }) }).then(function (r) {
          if (!r.ok) { $('bgGo').disabled = false; er.textContent = r.d.error === 'too_many_requests' ? tr('Demasiados intentos. Espera unos minutos.', 'Too many attempts. Wait a few minutes.') : tr('No se pudo activar el aviso. Inténtalo de nuevo.', 'Couldn’t set up the email. Try again.'); return; }
          S.bgJob = r.d.job; if (r.d.unlock) { S.unlock = r.d.unlock; S.unlockEmail = r.d.email; }
          bx.innerHTML = '<section class="card sec" style="margin-bottom:14px"><div class="eyebrow">✉️ ' + tr('Te avisamos por email', 'We’ll email you') + '</div><p style="margin:8px 0 0">' + tr('Listo: te enviaremos el informe completo a <b>' + esc(r.d.email) + '</b> en cuanto termine. Ya puedes cerrar esta página, o seguir aquí: se abrirá solo.', 'Done: we’ll send the full report to <b>' + esc(r.d.email) + '</b> as soon as it’s finished. You can close this page now, or stay here: it will open by itself.') + '</p></section>';
          pollJob();
        });
      }
      var f = $('bgForm'); if (f) f.onsubmit = go; else $('bgGo').onclick = go;
    }
    function pollJob() {
      if (!S.bgJob) return;
      api('/api/aibb/job/' + S.bgJob).then(function (r) {
        if (!r.ok) return setTimeout(pollJob, 8000);
        var d = r.d;
        jobs.forEach(function (x, k) { x.st = k < d.done ? 'ok' : k === d.done && d.status === 'running' ? 'on' : x.st === 'ok' ? 'ok' : ''; });
        renderRun(jobs, Math.min(d.done, jobs.length), jobs.length + 1);
        if (d.status === 'done' && d.study) { S.bgJob = null; S.running = false; removeBg(); $('run').innerHTML = ''; S.study = d.study; renderResults(); loadHistory(); $('results').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        if (d.status === 'failed') { S.bgJob = null; S.running = false; removeBg(); return busyCard(teaser); }
        setTimeout(pollJob, 4000);
      });
    }
    function busyCard(t) {
      $('run').innerHTML = '<section class="card sec"><div class="eyebrow">' + tr('IA saturada', 'AI overloaded') + '</div><h2 style="font-size:28px;margin-top:8px">' + tr('La IA gratuita está saturada ahora mismo', 'The free AI is overloaded right now') + '</h2><p style="color:var(--muted);margin:10px 0 18px">' + tr('Google Gemini no está respondiendo por exceso de demanda. No es un problema de tu web. Prueba de nuevo en un rato: tu estudio está preparado.', 'Google Gemini isn’t answering due to high demand. It’s not a problem with your website. Try again in a while: your study is ready to go.') + '</p><button class="btn" id="busyRetry">' + tr('Reintentar ahora', 'Try again now') + '</button></section>';
      removeBg(); var br = $('busyRetry'); if (br) br.onclick = function () { runLive(t); };
    }
    function finish() {
      removeBg();
      if (!answers.length) { S.running = false; $('run').innerHTML = '<div class="card sec"><b>' + (S.limitHit === 'teaser_limit' ? tr('Ya has usado las vistas previas gratuitas de hoy. Entra con tu email para ver el informe completo:', 'You’ve used today’s free previews. Sign in with your email to see the full report:') + '</b>' + loginFormHtml() : tr('Las IA no han respondido ahora mismo (cupo gratuito saturado). Prueba en unos minutos.', 'The AIs didn’t answer right now (free quota busy). Try again in a few minutes.') + '</b>') + '</div>'; bindLogin(); return; }
      api('/api/aibb/finish', { method: 'POST', body: JSON.stringify({ setup: S.setup, answers: answers, unlock: teaser ? undefined : S.unlock }) }).then(function (r) {
        S.running = false; $('run').innerHTML = '';
        if (!r.ok) { $('goErr').textContent = tr('No se pudo calcular el estudio.', 'Couldn’t compute the study.'); return; }
        S.study = r.d.study; renderResults(); loadHistory(); $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (r.d.study.partial) { var pp = $('preProg'); if (pp && cacheGet().length >= S.setup.prompts.length) pp.innerHTML = '✓ ' + tr('Tu informe completo ya está listo: deja tu email y se abre al instante.', 'Your full report is ready: leave your email and it opens instantly.'); else if (pp) prefetch(engines[0]); } else { try { localStorage.removeItem('plg-aibb-answers'); } catch (e) { } }
      });
    }
  }
  function removeBg() { var bx = $('bgbox'); if (bx) bx.remove(); }
  function renderRun(jobs, done, total) {
    var p = Math.round(done / total * 100);
    $('run').innerHTML = '<section class="card sec"><div class="runh"><div><div class="eyebrow">' + tr('En marcha', 'Running') + '</div><h2 style="font-size:30px;margin-top:8px">' + tr('Analizando tu marca en la IA…', 'Analyzing your brand in AI…') + '</h2></div><b style="font:800 34px var(--display)">' + p + '%</b></div><div class="bar"><i style="width:' + p + '%"></i></div>' +
      (jobs.length ? '<div class="tasks">' + jobs.map(function (j) { return '<div class="task ' + j.st + '"><span class="st">' + (j.st === 'ok' ? '✓' : j.st === 'ko' ? '!' : j.st === 'wait' ? '↻' : '') + '</span><span>' + esc(j.prompt) + '</span><span class="e">' + ENG_NAME[j.engine] + '</span></div>'; }).join('') + '</div>' : '') + '</section>';
  }

  /* ---------- resultados ---------- */
  function insights(st) {
    var R = st.result, b = R.brands, me = b[0], out = [];
    var leader = b.slice().sort(function (x, y) { return y.visibility - x.visibility; })[0];
    if (me.visibility === 0) out.push(['🚨', tr('<b>' + esc(me.name) + ' no aparece en ninguna respuesta.</b> Para estas preguntas, la IA no te tiene en su radar.', '<b>' + esc(me.name) + ' doesn’t appear in any answer.</b> For these questions, AI doesn’t have you on its radar.')]);
    else if (leader.target) out.push(['🏆', tr('<b>Lideras en visibilidad</b>: apareces en el ' + pct(me.visibility) + ' de las respuestas, más que cualquier competidor.', '<b>You lead on visibility</b>: you appear in ' + pct(me.visibility) + ' of answers, more than any competitor.')]);
    else out.push(['📉', tr('<b>' + esc(leader.name) + ' te supera</b>: aparece en el ' + pct(leader.visibility) + ' de las respuestas frente a tu ' + pct(me.visibility) + '.', '<b>' + esc(leader.name) + ' beats you</b>: it appears in ' + pct(leader.visibility) + ' of answers vs. your ' + pct(me.visibility) + '.')]);
    if (me.avgPos) out.push(['🎯', tr('Cuando apareces, lo haces de media en la <b>posición ' + num(me.avgPos, 1) + '</b>' + (me.top1 > 0 ? ' y eres la primera opción en el ' + pct(me.top1) + ' de las respuestas.' : ', pero nunca como primera opción.'), 'When you appear, you’re on average in <b>position ' + num(me.avgPos, 1) + '</b>' + (me.top1 > 0 ? ' and the first option in ' + pct(me.top1) + ' of answers.' : ', but never as the first option.'))]);
    var miss = R.rows.filter(function (r) { return r.pos[0] == null; }).map(function (r) { return r.prompt; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    if (miss.length && me.visibility > 0) out.push(['🕳️', tr('Huecos: no sales en <b>' + miss.length + ' pregunta' + (miss.length > 1 ? 's' : '') + '</b>, por ejemplo «' + esc(miss[0]) + '».', 'Gaps: you don’t show up in <b>' + miss.length + ' question' + (miss.length > 1 ? 's' : '') + '</b>, e.g. “' + esc(miss[0]) + '”.')]);
    out.push(R.ownCited > 0 ? ['🔗', tr('Tu web aparece como fuente en el <b>' + pct(R.ownCited) + '</b> de las respuestas.', 'Your website appears as a source in <b>' + pct(R.ownCited) + '</b> of answers.')] : ['🔗', tr('<b>Tu web no aparece como fuente.</b> ' + (R.sources[0] ? 'La más citada es ' + esc(R.sources[0].domain) + ': ahí es donde conviene estar.' : ''), '<b>Your website isn’t cited as a source.</b> ' + (R.sources[0] ? 'The most cited is ' + esc(R.sources[0].domain) + ': that’s where you want to be.' : ''))]);
    var F = !st.partial && funnelInfo(st);
    if (F && F.worst.vis[0] < F.best.vis[0]) out.push(['🧭', tr('En el recorrido del comprador <b>flojeas en ' + stgName(F.worst.stage).toLowerCase() + '</b> (' + pct(F.worst.vis[0]) + ' de presencia).', 'In the buyer journey <b>you’re weakest at ' + stgName(F.worst.stage).toLowerCase() + '</b> (' + pct(F.worst.vis[0]) + ' presence).')]);
    if (!st.partial && (R.cons || []).length) out.push(['🗣️', tr('Crítica que más repite la IA: <b>«' + esc(R.cons[0]) + '»</b>.', 'Criticism AI repeats most: <b>“' + esc(R.cons[0]) + '”</b>.')]);
    if (R.sentiment != null && !st.partial) out.push([R.sentiment > .2 ? '💚' : R.sentiment < -.2 ? '⚠️' : '😐', tr('Tono hacia tu marca: <b>' + (R.sentiment > .2 ? 'positivo' : R.sentiment < -.2 ? 'negativo' : 'neutro') + '</b>.', 'Tone towards your brand: <b>' + (R.sentiment > .2 ? 'positive' : R.sentiment < -.2 ? 'negative' : 'neutral') + '</b>.')]);
    return out;
  }
  function ring(v) {
    var r = 46, c = 2 * Math.PI * r;
    return '<svg class="ring" viewBox="0 0 112 112" aria-hidden="true"><circle cx="56" cy="56" r="' + r + '" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="10"/><circle cx="56" cy="56" r="' + r + '" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (c * v / 100) + ' ' + c + '" transform="rotate(-90 56 56)"/><text x="56" y="64" text-anchor="middle" fill="#fff" font-family="Bricolage Grotesque,system-ui" font-weight="800" font-size="30">' + v + '</text></svg>';
  }
  function renderResults() {
    var hw0 = $('how'); if (hw0) hw0.hidden = true;
    var st = S.study; if (!st) return;
    var R = st.result, B = R.brands, s = st.setup, me = B[0];
    var engs = (R.byEngine || []).map(function (e) { return e.engine; });
    var d = new Date(st.created_at);
    var kpis = '<div class="kpis"><div class="kpi score">' + ring(R.score) + '<div><div class="l">AI Visibility Score</div><div class="d">' + tr('0–100 · combina visibilidad, posición y cuota de voz', '0–100 · blends visibility, position and share of voice') + '</div><div class="d" style="margin-top:6px;font-weight:700;color:#fff">' + tr('Puesto ', 'Rank ') + R.rank + tr(' de ', ' of ') + B.length + '</div></div></div>' +
      kpi(tr('Visibilidad', 'Visibility'), pct(me.visibility), tr('de las respuestas te mencionan', 'of answers mention you')) +
      kpi(tr('Posición media', 'Avg. position'), me.avgPos ? '#' + num(me.avgPos, 1) : '—', tr('cuando apareces (1 = primera)', 'when you appear (1 = first)')) +
      kpi(tr('Cuota de voz', 'Share of voice'), pct(me.sov), tr('de todas las menciones de marca', 'of all brand mentions')) +
      kpi(tr('Tu web como fuente', 'Your site as source'), pct(R.ownCited), tr('de las respuestas la citan', 'of answers cite it')) + '</div>';
    var rank = '<div class="rank"><div class="rk hd"><span>' + tr('Marca', 'Brand') + '</span><span>' + tr('Visibilidad', 'Visibility') + '</span><span class="c">' + tr('Pos.', 'Pos.') + '</span><span class="c sov">SoV</span></div>' +
      B.map(function (b, i) { return { b: b, i: i }; }).sort(function (x, y) { return y.b.visibility - x.b.visibility || (x.b.avgPos || 99) - (y.b.avgPos || 99); }).map(function (o) {
        return '<div class="rk' + (o.b.target ? ' me' : '') + '"><span class="nm"><i class="dot" style="background:' + col(o.i) + '"></i>' + esc(o.b.name) + '</span><span class="tr" data-tip="' + esc(o.b.name) + ' · ' + pct(o.b.visibility) + '"><i style="width:' + Math.max(2, o.b.visibility * 100) + '%;background:' + col(o.i) + '"></i><b>' + pct(o.b.visibility) + '</b></span><span class="c">' + (o.b.avgPos ? num(o.b.avgPos, 1) : '—') + '</span><span class="c sov">' + pct(o.b.sov) + '</span></div>';
      }).join('') + '</div>';
    // mapa de calor pregunta × marca (posición; si hay varios motores, la mejor posición entre ellos)
    var prompts = s.prompts;
    var hm = '<div class="hmwrap"><table class="hm"><thead><tr><th></th>' + B.map(function (b, i) { return '<th><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + col(i) + ';margin-right:5px"></span>' + esc(b.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      prompts.map(function (p) {
        var rows = R.rows.filter(function (r) { return r.prompt === p; });
        var sg = (s.stages && s.stages[prompts.indexOf(p)]) || (rows[0] && rows[0].stage) || '';
        return '<tr data-q="' + esc(p) + '" class="click"><th class="p" scope="row">' + (sg ? '<span class="stg s-' + sg + '">' + stgName(sg) + '</span>' : '') + esc(p) + '</th>' + B.map(function (b, k) {
          var ps = rows.map(function (r) { return r.pos[k]; }).filter(function (x) { return x != null; });
          if (!ps.length) return '<td class="na" data-tip="' + esc(b.name) + ': ' + tr('no aparece', 'not mentioned') + '">—</td>';
          var best = Math.min.apply(null, ps), t = 1 - (best - 1) / Math.max(1, B.length - 1) * .85;
          return '<td style="background:' + seq(t) + ';color:' + inkOn(t) + '" data-tip="' + esc(b.name) + ' · ' + tr('posición ', 'position ') + best + (rows.length > 1 ? ' (' + ps.length + '/' + rows.length + ' ' + tr('asistentes', 'assistants') + ')' : '') + '">' + best + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div><div class="legend"><span><i style="background:' + seq(1) + '"></i>' + tr('1.ª posición', '1st position') + '</span><span><i style="background:' + seq(.3) + '"></i>' + tr('más abajo', 'lower') + '</span><span><i style="background:var(--soft)"></i>' + tr('no aparece', 'not mentioned') + '</span></div>';
    var eh = '<div class="hmwrap"><table class="hm"><thead><tr><th></th>' + B.map(function (b) { return '<th>' + esc(b.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      ['gemini', 'chatgpt', 'claude', 'perplexity'].map(function (e) {
        var row = (R.byEngine || []).filter(function (x) { return x.engine === e; })[0];
        return '<tr><th class="p" scope="row">' + ENG_NAME[e] + '</th>' + B.map(function (b, k) {
          if (!row) return '<td class="na" data-tip="' + ENG_NAME[e] + ': ' + tr('incluido en el informe Premium', 'included in the Premium report') + '">✦</td>';
          var v = row.vis[k]; return '<td style="background:' + seq(v) + ';color:' + inkOn(v) + '" data-tip="' + esc(b.name) + ' · ' + ENG_NAME[e] + ' · ' + pct(v) + '">' + pct(v) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
    var mx = R.sources.length ? R.sources[0].n : 1;
    var src = R.sources.length ? '<div class="src">' + R.sources.map(function (x) { return '<div class="sr' + (x.own ? ' own' : '') + '"><span class="d">' + esc(x.domain) + (x.own ? ' ★' : '') + '</span><span class="tr"><i style="width:' + (x.n / mx * 100) + '%"></i></span><span class="c">' + x.n + '</span></div>'; }).join('') + '</div><div class="legend"><span>★ ' + tr('tu web', 'your website') + '</span></div>' : '<p class="sub">' + tr('Las respuestas no citaron fuentes.', 'The answers didn’t cite sources.') + '</p>';
    var ins = '<ul class="ins">' + insights(st).map(function (x) { return '<li><span class="em">' + x[0] + '</span><span>' + x[1] + '</span></li>'; }).join('') + '</ul>';
    var exl = st.answers.map(function (a, i) { return '<button type="button" data-x="' + i + '" aria-pressed="' + (i === S.exSel) + '"><span class="e">' + ENG_NAME[a.engine] + '</span><span>' + esc(a.prompt) + '</span></button>'; }).join('');
    $('results').innerHTML = '<div class="rhead"><div><div class="eyebrow">' + tr('Resultados', 'Results') + ' · ' + esc(s.domain) + '</div><h2 style="margin-top:10px">' + esc(s.brand) + '</h2><div class="meta">' + esc(s.category) + ' · ' + d.toLocaleDateString(L() === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + st.answers.length + tr(' respuestas analizadas', ' answers analyzed') + '</div></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' + (st.demo ? '<span class="tag demo">🧪 ' + tr('Ejemplo · datos simulados', 'Sample · simulated data') + '</span>' : st.partial ? '<span class="tag live">👀 ' + tr('Vista previa', 'Preview') + '</span>' : '<span class="tag live">🛰️ ' + tr('Estudio real', 'Live study') + '</span>') + (S.viewer ? (S.viewerCase && hasTone(st) ? '<button class="btn ghost" type="button" id="ceoBtn" style="padding:11px 16px;font-size:14px">📋 ' + tr('Resumen para tu CEO', 'Summary for your CEO') + '</button>' : '') + '<a class="btn" href="/ai-barometer/" style="padding:11px 16px;font-size:14px">' + tr('Analiza tu marca gratis', 'Analyze your brand free') + ' →</a>' : (!st.partial && hasTone(st) ? '<button class="btn ghost" type="button" id="ceoBtn" style="padding:11px 16px;font-size:14px">📋 ' + tr('Resumen para tu CEO', 'Summary for your CEO') + '</button>' : '') + (st.id && !st.demo && !st.partial && S.cfg && S.cfg.user ? '<button class="btn" type="button" id="shareBtn" style="padding:11px 16px;font-size:14px">' + tr('Compartir', 'Share') + '</button>' : '') + '<button class="btn ghost" type="button" id="editStudy" style="padding:11px 16px;font-size:14px">' + tr('Editar y repetir', 'Edit and rerun') + '</button><button class="btn ghost" type="button" id="again" style="padding:11px 16px;font-size:14px">' + tr('Nuevo estudio', 'New study') + '</button>') + '</div></div><div id="sharebox"></div>' +
      (S.viewerCase ? '<div class="banner live" style="margin-bottom:16px"><span class="ic">🔬</span><div>' + tr('<b>Caso de estudio de plaiground.</b> Estudio independiente hecho con el AI Brand Barometer el ' + new Date(st.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) + ', con las respuestas reales de ' + [...new Set(st.answers.map(function (a) { return ENG_NAME[a.engine]; }))].join(', ') + '. plaiground no tiene relación con las marcas analizadas; las respuestas de la IA pueden contener errores. <a href="/ai-barometer/">Analiza tu marca gratis →</a>', '<b>plaiground case study.</b> Independent study made with the AI Brand Barometer on ' + new Date(st.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ', using real answers from ' + [...new Set(st.answers.map(function (a) { return ENG_NAME[a.engine]; }))].join(', ') + '. plaiground has no relationship with the brands analysed; AI answers may contain errors. <a href="/ai-barometer/">Analyze your brand free →</a>') + '</div></div>' : '') +
      (S.viewer && !S.viewerCase ? '<div class="banner live" style="margin-bottom:16px"><span class="ic">📤</span><div>' + tr('<b>Informe compartido contigo.</b> Es una copia de solo lectura' + (S.viewerExp ? ', disponible hasta el ' + new Date(S.viewerExp).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : '') + '. ¿Quieres ver cómo sale tu marca? <a href="/ai-barometer/">Haz tu estudio gratis</a>.', '<b>Report shared with you.</b> It’s a read-only copy' + (S.viewerExp ? ', available until ' + new Date(S.viewerExp).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : '') + '. Want to see how your brand does? <a href="/ai-barometer/">Run your free study</a>.') + '</div></div>' : '') +
      (S.unlockEmail && !st.partial && !S.viewer && !(S.cfg && S.cfg.user) ? '<div class="banner live" style="margin-bottom:16px"><span class="ic">📩</span><div>' + tr('<b>¡Informe desbloqueado!</b> Te hemos enviado un email a <b>' + esc(S.unlockEmail) + '</b>: ábrelo para guardar este informe en tu histórico, compararlo cada mes y compartirlo.', '<b>Report unlocked!</b> We’ve emailed <b>' + esc(S.unlockEmail) + '</b>: open it to save this report to your history, compare it monthly and share it.') + '</div></div>' : '') +
      (st.partial ? '<div class="banner live" style="margin-bottom:16px"><span class="ic">👀</span><div>' + tr('<b>Vista previa:</b> resultados con ' + st.answers.length + ' de ' + s.prompts.length + ' preguntas. Desbloquea abajo el informe completo, gratis.', '<b>Preview:</b> results from ' + st.answers.length + ' of ' + s.prompts.length + ' questions. Unlock the full report below, for free.') + '</div></div>' : '') +
      (st.demo ? '<div class="banner" style="margin-bottom:16px"><span class="ic">🧪</span><div>' + tr('Estas cifras salen de <b>respuestas inventadas</b> para enseñarte el informe. No describen la visibilidad real de ninguna marca.', 'These figures come from <b>made-up answers</b> to show you the report. They don’t describe any brand’s real visibility.') + '</div></div>' : '') +
      kpis +
      '<div class="g2"><section class="panel"><h3>' + tr('Ranking de visibilidad', 'Visibility ranking') + '</h3><p class="sub">' + tr('% de respuestas en las que aparece cada marca · posición media · cuota de voz', '% of answers mentioning each brand · average position · share of voice') + '</p>' + rank + '</section>' +
      '<section class="panel"><h3>' + tr('Lo que hay que saber', 'What you need to know') + '</h3><p class="sub">' + tr('Lectura automática de los resultados', 'Automatic reading of the results') + '</p>' + ins + '</section></div>' +
      quadHtml(st) +
      (st.partial ? '<div class="lockwrap"><div class="lockcard card"><div class="eyebrow">🔒 ' + tr('Informe completo', 'Full report') + '</div><h3>' + tr('Desbloquea tu informe completo gratis', 'Unlock your full report for free') + '</h3><p class="sub">' + tr('Las ' + s.prompts.length + ' preguntas, posición pregunta a pregunta, fuentes que cita la IA, el tono hacia tu marca, todas las respuestas y tu histórico mes a mes. Solo tu email, sin contraseña.', 'All ' + s.prompts.length + ' questions, position question by question, the sources AI cites, the tone towards your brand, every answer and your month-by-month history. Just your email, no password.') + '</p>' + loginFormHtml() + '<p class="small" id="preProg" style="margin:10px 0 0"></p></div><div class="locked" aria-hidden="true">' : '') +
      funnelHtml(st) + repHtml(st) +
      '<section class="panel sec"><h3>' + tr('Posición por pregunta', 'Position by question') + '</h3><p class="sub">' + tr('En qué puesto sale cada marca en cada respuesta (1 = la primera que menciona la IA)', 'Where each brand ranks in each answer (1 = the first one the AI mentions)') + '</p>' + hm + '</section>' +
      '<div class="g2"><section class="panel"><h3>' + tr('Visibilidad por asistente', 'Visibility by assistant') + '</h3><p class="sub">' + tr('% de respuestas de cada IA que mencionan a cada marca', '% of each AI’s answers mentioning each brand') + '</p>' + eh + '</section>' +
      '<section class="panel"><h3>' + tr('Fuentes que cita la IA', 'Sources the AI cites') + '</h3><p class="sub">' + tr('Webs mencionadas como fuente en las respuestas', 'Websites mentioned as sources in the answers') + '</p>' + src + '</section></div>' +
      '<section class="panel sec prem-card" id="premium"><div><span class="tag prem">✦ Premium · ' + tr('próximamente', 'coming soon') + '</span><h3 style="margin-top:12px">' + tr('El informe completo: ChatGPT, Claude y Perplexity', 'The full report: ChatGPT, Claude and Perplexity') + '</h3><p class="sub" style="margin:6px 0 0">' + tr('Este estudio usa Gemini. El informe Premium pregunta también a ChatGPT, Claude y Perplexity, compara los cuatro y sigue tu marca cada mes. Apúntate y te aviso en cuanto esté.', 'This study uses Gemini. The Premium report also asks ChatGPT, Claude and Perplexity, compares all four and tracks your brand every month. Sign up and I’ll let you know as soon as it’s ready.') + '</p></div><a class="btn" href="/#contacto">' + tr('Quiero el Premium', 'I want Premium') + ' →</a></section>' +
      '<section class="panel sec"><h3>' + tr('Lee las respuestas', 'Read the answers') + '</h3><p class="sub">' + tr('Tal cual las dio cada asistente, con las marcas resaltadas', 'Exactly as each assistant gave them, with brands highlighted') + '</p><div class="ex"><div class="exl" id="exl">' + exl + '</div><div class="ans" id="ans"></div></div></section>' + planHtml(st) + (st.partial ? '</div></div>' : '');
    showAnswer(S.exSel); bindLogin();
    var cpb = $('copyPlan'); if (cpb) cpb.onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(planText(st)) : Promise.reject()).then(function () { cpb.textContent = tr('Copiado ✓', 'Copied ✓'); setTimeout(function () { cpb.textContent = tr('Copiar plan', 'Copy plan'); }, 1800); }).catch(function () { }); };
    document.querySelectorAll('#exl button').forEach(function (b) { b.onclick = function () { S.exSel = +b.dataset.x; document.querySelectorAll('#exl button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); showAnswer(S.exSel); }; });
    var shb = $('shareBtn'); if (shb) shb.onclick = function () { openShare(st); };
    var ed = $('editStudy'); if (ed) ed.onclick = function () { S.setup = JSON.parse(JSON.stringify(st.setup)); if (st.demo) S.mode = 'demo'; else S.mode = S.cfg && S.cfg.user ? 'live' : 'login'; S.reason = ''; S.engines = (S.cfg && S.cfg.engines) || S.engines; S.sel = {}; S.engines.forEach(function (x) { S.sel[x.id] = x.active; }); S.study = null; $('results').innerHTML = ''; renderSetup(); $('setup').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    if ($('again')) $('again').onclick = function () { S.study = null; S.exSel = 0; $('results').innerHTML = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); $('url').focus(); };
    tips($('results')); bindPhase1(st);
  }

  /* ---------- Fase 1: mapa de posicionamiento, embudo, reputación y resumen para el CEO ---------- */
  function stgName(k) { return ({ descubrimiento: tr('Descubrimiento', 'Discovery'), comparacion: tr('Comparación', 'Comparison'), precio: tr('Precio', 'Price'), confianza: tr('Confianza', 'Trust'), riesgo: tr('Riesgo', 'Risk') })[k] || k; }
  function stgQ(k) { return ({ descubrimiento: tr('«¿Qué opciones hay?»', '“What are my options?”'), comparacion: tr('«¿Cuál de estas elijo?»', '“Which of these should I pick?”'), precio: tr('«¿Cuánto cuesta?»', '“How much is it?”'), confianza: tr('«¿Me puedo fiar?»', '“Can I trust it?”') })[k] || ''; }
  function toneWord(v) { return v == null ? tr('sin datos', 'no data') : v > .2 ? tr('positivo', 'positive') : v < -.2 ? tr('negativo', 'negative') : tr('neutro', 'neutral'); }
  function hasTone(st) { return st.result && st.result.brands.some(function (b) { return b.tone !== undefined; }); }
  function quadInfo(st) {
    var B = st.result.brands, av = B.reduce(function (s, b) { return s + b.visibility; }, 0) / B.length;
    var div = Math.min(.9, Math.max(.1, av)), me = B[0], t = me.tone == null ? 0 : me.tone, hiV = me.visibility >= div, hiT = t >= 0;
    var q = hiV && hiT ? 'lead' : !hiV && hiT ? 'gem' : hiV ? 'crit' : 'inv';
    return { div: div, q: q };
  }
  function quadName(q) { return ({ lead: tr('Líderes recomendados', 'Recommended leaders'), gem: tr('Joyas ocultas', 'Hidden gems'), crit: tr('Conocidos pero criticados', 'Known but criticised'), inv: tr('Invisibles', 'Invisible') })[q]; }
  function quadSvg(st, small) {
    var B = st.result.brands, qi = quadInfo(st);
    var mob = window.innerWidth < 640, W = mob ? 400 : 640, H = mob ? 380 : small ? 340 : 440, L0 = mob ? 30 : 46, R0 = mob ? 10 : 14, T0 = 14, B0 = 46, pw = W - L0 - R0, ph = H - T0 - B0;
    var maxV = Math.max.apply(null, B.map(function (b) { return b.visibility; })), xmax = Math.min(1, Math.max(.4, maxV * 1.15));
    var X = function (v) { return L0 + 16 + Math.min(1, v / xmax) * (pw - 32); }, Y = function (t) { return T0 + 16 + (1 - ((t == null ? 0 : t) + 1) / 2) * (ph - 32); };
    var maxT1 = Math.max(.01, Math.max.apply(null, B.map(function (b) { return b.top1; })));
    var dx = X(qi.div), dy = Y(0);
    var QC = { lead: '#1BAF7A', gem: '#7C5CFF', crit: '#FF7A59', inv: '#8A8FB5' };
    var o = '<svg class="quad" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + tr('Mapa de posicionamiento: visibilidad frente a tono de cada marca', 'Positioning map: visibility vs tone for each brand') + '">' +
      [['gem', L0, T0, dx - L0, dy - T0], ['lead', dx, T0, L0 + pw - dx, dy - T0], ['inv', L0, dy, dx - L0, T0 + ph - dy], ['crit', dx, dy, L0 + pw - dx, T0 + ph - dy]].map(function (q) { return '<rect x="' + q[1] + '" y="' + q[2] + '" width="' + Math.max(0, q[3]) + '" height="' + Math.max(0, q[4]) + '" fill="' + QC[q[0]] + '" fill-opacity="' + (q[0] === qi.q ? .07 : .025) + '"/>'; }).join('');
    [.25, .5, .75, 1].filter(function (v) { return v <= xmax + .001; }).forEach(function (v) { o += '<line x1="' + X(v) + '" x2="' + X(v) + '" y1="' + T0 + '" y2="' + (T0 + ph) + '" class="qgrid"/>'; });
    [-.5, .5].forEach(function (t) { o += '<line x1="' + L0 + '" x2="' + (L0 + pw) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" class="qgrid"/>'; });
    o += '<line x1="' + dx + '" y1="' + T0 + '" x2="' + dx + '" y2="' + (T0 + ph) + '" class="qdiv"/><line x1="' + L0 + '" y1="' + dy + '" x2="' + (L0 + pw) + '" y2="' + dy + '" class="qdiv"/>' +
      [['gem', L0 + 12, T0 + 20, 'start'], ['lead', L0 + pw - 12, T0 + 20, 'end'], ['inv', L0 + 12, T0 + ph - 12, 'start'], ['crit', L0 + pw - 12, T0 + ph - 12, 'end']].map(function (c) { return '<text x="' + c[1] + '" y="' + c[2] + '" text-anchor="' + c[3] + '" class="ql' + (c[0] === qi.q ? ' on' : '') + '">' + quadName(c[0]) + '</text>'; }).join('') +
      [0, .25, .5, .75, 1].filter(function (v) { return v <= xmax + .001; }).map(function (v) { return '<text x="' + X(v) + '" y="' + (T0 + ph + 18) + '" text-anchor="middle" class="qt">' + Math.round(v * 100) + '%</text>'; }).join('') +
      '<text x="' + (L0 + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="qa">' + tr('Visibilidad en IA', 'AI visibility') + ' →</text>' +
      '<text transform="translate(' + (mob ? 11 : 16) + ' ' + (T0 + ph / 2) + ') rotate(-90)" text-anchor="middle" class="qa">' + tr('Tono de la IA', 'AI tone') + ' →</text>';
    var P = B.map(function (b, k) { return { k: k, b: b, cx: X(b.visibility), cy: Y(b.tone), r: (mob ? 6 : 7) + (mob ? 13 : 17) * Math.sqrt(b.top1 / maxT1) }; }).filter(function (p) { return p.k === 0 || p.b.visibility > 0 || p.b.tone != null; });
    P.forEach(function (p, i) { P.slice(0, i).forEach(function (q) { var a = p.cx - q.cx, c = p.cy - q.cy; if (Math.sqrt(a * a + c * c) < Math.max(10, Math.min(p.r, q.r))) p.cx = Math.min(L0 + pw - p.r, p.cx + Math.max(p.r, q.r) * .9); }); });
    // Burbujas planas como en el Franchise Barometer: las grandes debajo, tu marca encima
    P.slice().sort(function (a, c) { return (a.k === 0) - (c.k === 0) || c.r - a.r; }).forEach(function (p) {
      o += '<g class="qb' + (p.k === 0 ? ' me' : '') + '" data-k="' + p.k + '" tabindex="0" role="button" aria-label="' + esc(p.b.name) + '">' +
        (p.k === 0 ? '<circle cx="' + p.cx + '" cy="' + p.cy + '" r="' + (p.r + 4) + '" class="qring"/>' : '') +
        '<circle cx="' + p.cx + '" cy="' + p.cy + '" r="' + p.r + '" fill="' + col(p.k) + '" class="qc"' + (p.b.tone == null ? ' stroke-dasharray="3 3"' : '') + '/></g>';
    });
    // Etiquetas: a la derecha, izquierda, arriba o abajo, donde no choquen con nada
    var boxes = [], hit = function (b) { return boxes.some(function (o2) { return b.x < o2.x + o2.w && b.x + b.w > o2.x && b.y < o2.y + o2.h && b.y + b.h > o2.y; }); };
    var qlb = [[L0 + 8, T0 + 6, 150, 18], [L0 + pw - 158, T0 + 6, 150, 18]].map(function (a) { return { x: a[0], y: a[1], w: a[2], h: a[3] }; }); boxes.push.apply(boxes, qlb);
    P.slice().sort(function (a, c) { return a.k - c.k; }).forEach(function (p) {
      var t = p.b.name, w = t.length * (p.k === 0 ? 7.4 : 6.8) + 4, rr = p.r + (p.k === 0 ? 4 : 0);
      var cand = [[p.cx + rr + 5, p.cy + 4, 'start'], [p.cx - rr - 5, p.cy + 4, 'end'], [p.cx, p.cy - rr - 6, 'middle'], [p.cx, p.cy + rr + 15, 'middle']];
      for (var i = 0; i < cand.length; i++) {
        var c = cand[i], bx = c[2] === 'start' ? c[0] : c[2] === 'end' ? c[0] - w : c[0] - w / 2, bb = { x: bx, y: c[1] - 12, w: w, h: 15 };
        if (bx < L0 + 2 || bx + w > L0 + pw - 2 || hit(bb) || P.some(function (q) { return q !== p && Math.abs(q.cx - (bb.x + w / 2)) < w / 2 + q.r && Math.abs(q.cy - (bb.y + 7)) < 7 + q.r; })) { if (i < cand.length - 1) continue; }
        boxes.push(bb); o += '<text x="' + c[0] + '" y="' + c[1] + '" text-anchor="' + c[2] + '" class="qn' + (p.k === 0 ? ' me' : '') + '" data-k="' + p.k + '">' + esc(t) + '</text>'; break;
      }
    });
    return o + '</svg>';
  }
  function quadHtml(st) {
    if (!hasTone(st)) return '';
    var qi = quadInfo(st), me = st.result.brands[0];
    var msg = ({ lead: tr('La IA te conoce y habla bien de ti. Ahora toca defender la posición y ser la primera opción más veces.', 'AI knows you and speaks well of you. Now defend the position and be the first pick more often.'),
      gem: tr('Cuando la IA habla de ti, habla bien, pero te menciona poco. Tu reto es la visibilidad, no la reputación.', 'When AI talks about you it’s positive, but it rarely mentions you. Your challenge is visibility, not reputation.'),
      crit: tr('La IA te menciona a menudo, pero con un tono poco favorable. Tu reto es la reputación: lo que se dice de ti.', 'AI mentions you often, but not favourably. Your challenge is reputation: what’s said about you.'),
      inv: tr('Para estas preguntas, la IA apenas te menciona y no tiene una opinión clara de ti. Empieza por existir donde se informa la IA.', 'For these questions, AI barely mentions you and has no clear view of you. Start by existing where AI gets its information.') })[qi.q];
    return '<section class="panel sec"><div class="qhead"><div><h3>' + tr('Mapa de posicionamiento', 'Positioning map') + '</h3><p class="sub">' + tr('Cada burbuja es una marca: a la derecha, más visible en la IA; arriba, mejor tono. El tamaño indica cuántas veces es la primera opción.', 'Each bubble is a brand: further right, more visible in AI; higher up, better tone. Size shows how often it is the first pick.') + '</p></div><div class="qbadge"><span>' + tr('Tu cuadrante', 'Your quadrant') + '</span><b>' + quadName(qi.q) + '</b></div></div>' +
      '<div class="qlay"><div class="qwrap" id="qwrap">' + quadSvg(st) + '</div><aside class="qside"><div class="qlist" role="list">' + st.result.brands.map(function (b, k) { return (k && !b.visibility && b.tone == null) ? '' : '<button type="button" class="qrow' + (b.target ? ' me' : '') + '" data-k="' + k + '" role="listitem"><i style="background:' + col(k) + '"></i><span>' + esc(b.name) + '</span><b>' + pct(b.visibility) + '</b></button>'; }).join('') + '</div><div class="qdet" id="qdet"></div></aside></div>' + (function () { var off = st.result.brands.filter(function (b, k) { return k && !b.visibility && b.tone == null; }); return off.length ? '<p class="small" style="margin:6px 0 0">' + tr('Sin presencia en ninguna respuesta (fuera del mapa): ', 'Not in any answer (off the map): ') + off.map(function (b) { return esc(b.name); }).join(', ') + '.</p>' : ''; })() + '<p class="qmsg"><b>' + esc(me.name) + ':</b> ' + msg + ' <span class="small">' + tr('Pasa el ratón o pulsa una marca para ver su ficha.', 'Hover or tap a brand to see its card.') + '</span></p></section>';
  }
  function funnelInfo(st) {
    var S2 = (st.result.byStage || []).filter(function (x) { return x.n; }); if (S2.length < 2) return null;
    var worst = S2.slice().sort(function (a, b) { return a.vis[0] - b.vis[0]; })[0], best = S2.slice().sort(function (a, b) { return b.vis[0] - a.vis[0]; })[0];
    var lk = worst.vis.map(function (v, k) { return [v, k]; }).slice(1).sort(function (a, b) { return b[0] - a[0]; })[0];
    return { stages: S2, worst: worst, best: best, leaderK: lk && lk[0] > worst.vis[0] ? lk[1] : null };
  }
  function funnelHtml(st) {
    var F = funnelInfo(st); if (!F) return '';
    var B = st.result.brands;
    var rows = B.map(function (b, k) { return k; }).sort(function (a, b) { return (b === 0) - (a === 0) || B[b].visibility - B[a].visibility; });
    var t = '<div class="hmwrap"><table class="hm fn"><thead><tr><th></th>' + F.stages.map(function (x) { return '<th><span class="fs">' + stgName(x.stage) + '</span><span class="fq">' + stgQ(x.stage) + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (k) { return '<tr' + (k === 0 ? ' class="me"' : '') + '><th class="p" scope="row"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + col(k) + ';margin-right:6px"></span>' + esc(B[k].name) + '</th>' + F.stages.map(function (x) { var v = x.vis[k]; return v == null ? '<td class="na">—</td>' : '<td style="background:' + seq(v) + ';color:' + inkOn(v) + '" data-tip="' + esc(B[k].name) + ' · ' + stgName(x.stage) + ' · ' + pct(v) + '">' + pct(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    var me = B[0], w = F.worst, d = w.vis[0] < F.best.vis[0]
      ? tr('Te pierdes en la fase de <b>' + stgName(w.stage).toLowerCase() + '</b>: apareces en el ' + pct(w.vis[0]) + ' de las respuestas, frente al ' + pct(F.best.vis[0]) + ' en ' + stgName(F.best.stage).toLowerCase() + '.' + (F.leaderK != null ? ' Ahí la IA recomienda antes a <b>' + esc(B[F.leaderK].name) + '</b> (' + pct(w.vis[F.leaderK]) + ').' : ''), 'You drop out at the <b>' + stgName(w.stage).toLowerCase() + '</b> stage: you appear in ' + pct(w.vis[0]) + ' of answers, vs ' + pct(F.best.vis[0]) + ' in ' + stgName(F.best.stage).toLowerCase() + '.' + (F.leaderK != null ? ' There AI recommends <b>' + esc(B[F.leaderK].name) + '</b> first (' + pct(w.vis[F.leaderK]) + ').' : ''))
      : tr('Tu presencia es pareja en todas las fases del recorrido del comprador.', 'Your presence is even across every stage of the buyer journey.');
    return '<section class="panel sec"><h3>' + tr('Recorrido del comprador', 'Buyer journey') + '</h3><p class="sub">' + tr('En qué momento de la compra te recomienda la IA: % de respuestas de cada fase que mencionan a cada marca', 'At which moment of the purchase AI recommends you: % of answers in each stage that mention each brand') + '</p>' + t + '<p class="qmsg">' + d + '</p></section>';
  }
  function repHtml(st) {
    var R = st.result; if (!R.risk && !(R.cons || []).length && !(R.pros || []).length) return '';
    var rt = R.risk ? R.risk.tone : null, cls = rt == null ? '' : rt > .2 ? 'good' : rt < -.2 ? 'bad' : 'mid';
    var li = function (a, ic) { return (a || []).length ? '<ul class="rl">' + a.map(function (x) { return '<li><span>' + ic + '</span>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="small">' + tr('La IA no destaca nada concreto.', 'AI doesn’t point out anything specific.') + '</p>'; };
    var qs = R.risk ? R.risk.prompts.map(function (p) { var i = -1; st.answers.forEach(function (a, k) { if (i < 0 && a.prompt === p) i = k; }); return i < 0 ? '' : '<button type="button" class="rq" data-goto="' + i + '">«' + esc(p) + '» →</button>'; }).join('') : '';
    return '<section class="panel sec rep"><div class="qhead"><div><h3>' + (R.risk ? tr('Reputación: lo que la IA dice cuando preguntan por tus puntos débiles', 'Reputation: what AI says when asked about your weak spots') : tr('Reputación: lo que la IA dice de ti', 'Reputation: what AI says about you')) + '</h3><p class="sub">' + (R.risk ? tr('Preguntamos a la IA por problemas, quejas y motivos para no elegirte. Es lo que leerá un comprador que duda.', 'We asked AI about problems, complaints and reasons not to choose you. It’s what a hesitant buyer will read.') : tr('Lo que la IA destaca y critica de tu marca cuando le preguntan por ella.', 'What AI highlights and criticises about your brand when asked about it.')) + '</p></div>' +
      (R.risk ? '<div class="qbadge ' + cls + '"><span>' + tr('Tono en esas respuestas', 'Tone in those answers') + '</span><b>' + toneWord(rt) + '</b></div>' : '') + '</div>' +
      '<div class="g2" style="margin-top:6px"><div><h4>' + tr('Críticas y riesgos que repite', 'Criticisms and risks it repeats') + '</h4>' + li(R.cons, '⚠️') + '</div><div><h4>' + tr('Puntos fuertes que destaca', 'Strengths it highlights') + '</h4>' + li(R.pros, '✓') + '</div></div>' +
      (qs ? '<div class="rqs">' + qs + '</div>' : '') + '</section>';
  }
  function ceoRisks(st) {
    var R = st.result, B = R.brands, me = B[0], out = [], F = funnelInfo(st);
    var leader = B.slice(1).sort(function (x, y) { return y.visibility - x.visibility; })[0];
    if (leader && leader.visibility > me.visibility) out.push(tr(esc(leader.name) + ' aparece en el ' + pct(leader.visibility) + ' de las respuestas; nosotros, en el ' + pct(me.visibility) + '.', esc(leader.name) + ' appears in ' + pct(leader.visibility) + ' of answers; we do in ' + pct(me.visibility) + '.'));
    if (F && F.worst.vis[0] < F.best.vis[0]) out.push(tr('Desaparecemos en la fase de ' + stgName(F.worst.stage).toLowerCase() + ' (' + pct(F.worst.vis[0]) + ' de presencia).', 'We disappear at the ' + stgName(F.worst.stage).toLowerCase() + ' stage (' + pct(F.worst.vis[0]) + ' presence).'));
    (R.cons || []).slice(0, 2).forEach(function (c) { out.push(tr('La IA repite: «' + esc(c) + '».', 'AI repeats: “' + esc(c) + '”.')); });
    if (R.ownCited < .3) out.push(tr('Nuestra web casi no se usa como fuente (' + pct(R.ownCited) + ').', 'Our website is barely used as a source (' + pct(R.ownCited) + ').'));
    if (me.visibility === 0) out.unshift(tr('No aparecemos en ninguna respuesta de nuestra categoría.', 'We don’t appear in any answer for our category.'));
    return out.slice(0, 3);
  }
  function ceoHtml(st) {
    var R = st.result, B = R.brands, me = B[0], s = st.setup, P = plan(st), qi = hasTone(st) ? quadInfo(st) : null;
    var acts = P[0].slice(0, 2).concat(P[1].slice(0, 1)).map(function (it) { return '<li><b>' + it.t + '</b><span>' + it.why + '</span></li>'; }).join('');
    var d = new Date(st.created_at).toLocaleDateString(L() === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return '<div class="ceo-card" role="dialog" aria-modal="true" aria-label="' + tr('Resumen para tu CEO', 'Summary for your CEO') + '"><div class="ceo-bar"><span class="eyebrow">' + tr('Resumen ejecutivo', 'Executive summary') + '</span><div class="ceo-act"><button class="btn ghost" type="button" id="ceoPrint">' + tr('Imprimir o guardar PDF', 'Print or save PDF') + '</button>' + (st.id && !st.demo && S.cfg && S.cfg.user ? '<button class="btn ghost" type="button" id="ceoShare">' + tr('Compartir enlace', 'Share link') + '</button>' : '') + '<button class="btn ghost" type="button" id="ceoClose" aria-label="' + tr('Cerrar', 'Close') + '">✕</button></div></div>' +
      '<div class="ceo-body"><div class="ceo-top"><div><div class="small">' + tr('Visibilidad de marca en asistentes de IA', 'Brand visibility in AI assistants') + ' · ' + d + '</div><h2>' + esc(me.name) + '</h2><div class="small">' + esc(s.category) + (s.country ? ' · ' + esc(s.country) : '') + ' · ' + tr('frente a ', 'vs ') + (B.length - 1) + tr(' competidores', ' competitors') + '</div></div>' +
      '<div class="ceo-k"><div><b>' + R.score + '</b><span>AI Visibility Score</span></div><div><b>' + R.rank + '/' + B.length + '</b><span>' + tr('Puesto', 'Rank') + '</span></div><div><b>' + pct(me.visibility) + '</b><span>' + tr('Visibilidad', 'Visibility') + '</span></div><div><b>' + (qi ? quadName(qi.q) : toneWord(R.sentiment)) + '</b><span>' + (qi ? tr('Cuadrante', 'Quadrant') : tr('Tono', 'Tone')) + '</span></div></div></div>' +
      (qi ? '<div class="ceo-map">' + quadSvg(st, true) + '</div>' : '') +
      '<div class="ceo-cols"><div><h4>' + tr('3 riesgos', '3 risks') + '</h4><ol>' + ceoRisks(st).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol></div><div><h4>' + tr('3 acciones', '3 actions') + '</h4><ol class="acts">' + acts + '</ol></div></div>' +
      '<div class="ceo-foot">' + tr('Fuente: respuestas reales de ' + [...new Set(st.answers.map(function (a) { return ENG_NAME[a.engine]; }))].join(', ') + ' a ' + s.prompts.length + ' preguntas de compradores. Resultados orientativos.', 'Source: real answers from ' + [...new Set(st.answers.map(function (a) { return ENG_NAME[a.engine]; }))].join(', ') + ' to ' + s.prompts.length + ' buyer questions. Indicative results.') + ' · plaiground AI Brand Barometer · plaigroundmarketing.com/ai-barometer</div></div></div>';
  }
  function openCeo(st) {
    var o = $('ceo'); if (!o) { o = document.createElement('div'); o.id = 'ceo'; o.className = 'ceo'; document.body.appendChild(o); }
    o.innerHTML = ceoHtml(st); document.body.classList.add('ceo-open'); tips(o);
    var close = function () { document.body.classList.remove('ceo-open'); o.remove(); document.removeEventListener('keydown', esc1); }, esc1 = function (e) { if (e.key === 'Escape') close(); };
    $('ceoClose').onclick = close; o.onclick = function (e) { if (e.target === o) close(); }; document.addEventListener('keydown', esc1);
    $('ceoPrint').onclick = function () { window.print(); };
    var sh = $('ceoShare'); if (sh) sh.onclick = function () { close(); openShare(st); };
    $('ceoClose').focus();
  }
  // Interacción del mapa: ficha flotante al pasar, marca resaltada y ficha completa al pulsar
  function qCard(st, k) {
    var b = st.result.brands[k], me = st.result.brands[0];
    var row = function (l, v) { return '<div><span>' + l + '</span><b>' + v + '</b></div>'; };
    return '<div class="qch"><i style="background:' + col(k) + '"></i><b>' + esc(b.name) + '</b>' + (b.target ? '<span class="you">' + tr('tu marca', 'your brand') + '</span>' : '') + '</div><div class="qcg">' +
      row(tr('Visibilidad', 'Visibility'), pct(b.visibility)) + row(tr('1.ª opción', '1st pick'), pct(b.top1)) + row(tr('Posición media', 'Avg. position'), b.avgPos ? '#' + num(b.avgPos, 1) : '—') + row(tr('Tono', 'Tone'), toneWord(b.tone)) + row(tr('Cuota de voz', 'Share of voice'), pct(b.sov)) + '</div>' +
      (!b.target && me ? '<div class="qvs">' + (b.visibility > me.visibility ? tr('Aparece ' + Math.round((b.visibility - me.visibility) * 100) + ' puntos más que ' + esc(me.name) + '.', 'Appears ' + Math.round((b.visibility - me.visibility) * 100) + ' points more than ' + esc(me.name) + '.') : b.visibility < me.visibility ? tr(esc(me.name) + ' aparece ' + Math.round((me.visibility - b.visibility) * 100) + ' puntos más.', esc(me.name) + ' appears ' + Math.round((me.visibility - b.visibility) * 100) + ' points more.') : tr('Misma visibilidad que ' + esc(me.name) + '.', 'Same visibility as ' + esc(me.name) + '.')) + '</div>' : '');
  }
  function bindQuad(st) {
    var wrap = $('qwrap'); if (!wrap) return;
    var det = $('qdet'), sel = 0;
    var mark = function (k) {
      wrap.querySelectorAll('.qb').forEach(function (g) { g.classList.toggle('on', +g.dataset.k === k); });
      document.querySelectorAll('#results .qrow').forEach(function (r) { r.classList.toggle('on', +r.dataset.k === k); r.setAttribute('aria-pressed', +r.dataset.k === sel); });
      var i = -1; st.result.rows.forEach(function (r) { if (i < 0 && r.pos[k] != null) i = st.answers.findIndex(function (a) { return a.prompt === r.prompt && a.engine === r.engine; }); });
      det.innerHTML = qCard(st, k) + (i >= 0 ? '<button type="button" class="qread">' + tr('Leer sus respuestas', 'Read its answers') + ' →</button>' : '');
      det.style.setProperty('--qc', col(k));
      var rd = det.querySelector('.qread'); if (rd) rd.onclick = function () { gotoAnswer(i); };
    };
    var leave = function () { mark(sel); }, pick = function (k) { sel = k; mark(k); };
    wrap.querySelectorAll('.qb').forEach(function (g) {
      var k = +g.dataset.k;
      g.onmouseenter = function () { mark(k); }; g.onmouseleave = leave; g.onfocus = function () { mark(k); }; g.onblur = leave;
      g.onclick = function () { pick(k); }; g.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(k); } };
    });
    document.querySelectorAll('#results .qrow').forEach(function (r) { var k = +r.dataset.k; r.onmouseenter = function () { mark(k); }; r.onmouseleave = leave; r.onclick = function () { pick(k); }; });
    mark(sel);
  }
  // Ir a una respuesta concreta en "Lee las respuestas"
  function gotoAnswer(i) {
    if (i < 0 || !S.study || !S.study.answers[i]) return;
    S.exSel = i; document.querySelectorAll('#exl button').forEach(function (x) { x.setAttribute('aria-pressed', +x.dataset.x === i); }); showAnswer(i);
    var b = document.querySelector('#exl button[data-x="' + i + '"]'); if (b) b.scrollIntoView({ block: 'nearest' });
    var a = $('ans'); if (a) a.closest('section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function bindPhase1(st) {
    bindQuad(st);
    document.querySelectorAll('#results [data-goto]').forEach(function (b) { b.onclick = function () { gotoAnswer(+b.dataset.goto); }; });
    document.querySelectorAll('#results .hm:not(.fn) tr[data-q]').forEach(function (tr0) { tr0.onclick = function () { gotoAnswer(st.answers.findIndex(function (a) { return a.prompt === tr0.dataset.q; })); }; });
    var cb = $('ceoBtn'); if (cb) cb.onclick = function () { openCeo(st); };
  }

  /* ---------- ¿Y ahora qué? Plan de acción a partir de los resultados ---------- */
  function plan(st) {
    var R = st.result, B = R.brands, me = B[0], s = st.setup;
    var leader = B.slice(1).sort(function (x, y) { return y.visibility - x.visibility; })[0];
    var gaps = []; R.rows.forEach(function (r) { if (r.pos[0] == null && gaps.indexOf(r.prompt) < 0) gaps.push(r.prompt); });
    var ext = R.sources.filter(function (x) { return !x.own; }).slice(0, 3).map(function (x) { return x.domain; });
    var behind = leader && leader.visibility > me.visibility;
    var lowPos = me.avgPos && me.avgPos > 2;
    var noOwn = R.ownCited < 0.3;
    var neg = R.sentiment != null && R.sentiment < -0.1;
    var q = function (t) { return '«' + esc(t) + '»'; };
    var short = [], mid = [], long = [];
    short.push({ hi: noOwn, t: tr('Haz tu web fácil de leer para la IA', 'Make your website easy for AI to read'), why: noOwn ? tr('Tu web solo aparece como fuente en el ' + pct(R.ownCited) + ' de las respuestas.', 'Your website is only cited in ' + pct(R.ownCited) + ' of answers.') : tr('Tu web ya se cita; asegúrate de que lo que la IA lee es correcto.', 'Your site is already cited; make sure what AI reads is right.'),
      s: [tr('Abre tu home con un párrafo claro: qué es ' + esc(s.brand) + ', para quién y en qué se diferencia.', 'Open your homepage with a clear paragraph: what ' + esc(s.brand) + ' is, who it’s for and how it’s different.'), tr('Añade datos estructurados (schema.org: Organization, Product/Service, FAQPage).', 'Add structured data (schema.org: Organization, Product/Service, FAQPage).'), tr('Revisa tu robots.txt para no bloquear a los rastreadores de IA (GPTBot, Google-Extended, ClaudeBot, PerplexityBot) si quieres que te lean.', 'Check your robots.txt doesn’t block AI crawlers (GPTBot, Google-Extended, ClaudeBot, PerplexityBot) if you want them to read you.')] });
    if (gaps.length) short.push({ hi: true, t: tr('Responde a las preguntas donde no sales', 'Answer the questions where you don’t show up'), why: tr('No apareces en ' + gaps.length + ' de ' + s.prompts.length + ' preguntas.', 'You’re missing from ' + gaps.length + ' of ' + s.prompts.length + ' questions.'),
      s: [tr('Crea una página de preguntas frecuentes que responda, con esas mismas palabras, a ' + q(gaps[0]) + (gaps[1] ? ' y ' + q(gaps[1]) : '') + '.', 'Create an FAQ page that answers, in those same words, ' + q(gaps[0]) + (gaps[1] ? ' and ' + q(gaps[1]) : '') + '.'), tr('Incluye datos concretos (precios, casos, cifras): la IA cita lo que puede comprobar.', 'Include concrete facts (prices, cases, figures): AI cites what it can verify.')] });
    short.push({ hi: false, t: tr('Reclama tus fichas oficiales', 'Claim your official profiles'), why: tr('Son fuentes que los asistentes usan para describir marcas.', 'They’re sources assistants use to describe brands.'),
      s: [tr('Verifica tu ficha de empresa en ChatGPT (beta de OpenAI), Google Business Profile y Bing Places.', 'Verify your company profile in ChatGPT (OpenAI beta), Google Business Profile and Bing Places.'), tr('Usa el mismo nombre, descripción y categoría en todas.', 'Use the same name, description and category everywhere.')] });
    if (neg) short.push({ hi: true, t: tr('Corrige lo que la IA dice mal de ti', 'Fix what AI gets wrong about you'), why: tr('El tono hacia tu marca sale negativo.', 'The tone towards your brand comes out negative.'), s: [tr('Lee las respuestas de arriba y apunta cada dato erróneo o queja repetida.', 'Read the answers above and note every wrong fact or repeated complaint.'), tr('Publica en tu web la respuesta o la mejora, con fecha, para que pueda citarse.', 'Publish the answer or improvement on your site, dated, so it can be cited.')] });
    var FI = funnelInfo(st);
    if ((R.cons || []).length) short.push({ hi: R.risk && R.risk.tone != null && R.risk.tone < 0, t: tr('Responde a las críticas que repite la IA', 'Address the criticisms AI repeats'), why: tr('Cuando preguntan por tus puntos débiles, la IA dice: «' + esc(R.cons[0]) + '».', 'When asked about your weak spots, AI says: “' + esc(R.cons[0]) + '”.'),
      s: [tr('Publica una respuesta clara y honesta a esa crítica (FAQ, página de soporte o garantías).', 'Publish a clear, honest answer to that criticism (FAQ, support or guarantees page).'), tr('Si es un problema real, arréglalo y cuéntalo: la IA recoge las noticias y reseñas recientes.', 'If it’s a real problem, fix it and say so: AI picks up recent news and reviews.')] });
    if (FI && FI.worst.vis[0] < FI.best.vis[0]) mid.push({ hi: true, t: tr('Gana la fase de ' + stgName(FI.worst.stage).toLowerCase(), 'Win the ' + stgName(FI.worst.stage).toLowerCase() + ' stage'), why: tr('Es donde más te pierde la IA: ' + pct(FI.worst.vis[0]) + ' de presencia.', 'It’s where AI loses you most: ' + pct(FI.worst.vis[0]) + ' presence.'),
      s: [FI.worst.stage === 'precio' ? tr('Publica precios o rangos claros y comparables; la IA no recomienda lo que no puede explicar.', 'Publish clear, comparable prices or ranges; AI won’t recommend what it can’t explain.') : FI.worst.stage === 'comparacion' ? tr('Crea comparativas honestas frente a tus competidores y tablas de diferencias.', 'Create honest comparisons against competitors and difference tables.') : FI.worst.stage === 'confianza' ? tr('Consigue reseñas recientes y casos de clientes en webs de terceros.', 'Get recent reviews and customer cases on third-party sites.') : tr('Aparece en listados de «mejores opciones» de medios y comparadores de tu sector.', 'Get into “best options” lists in your industry’s media and comparison sites.')] });
    mid.push({ hi: ext.length > 0, t: tr('Entra en las fuentes que cita la IA', 'Get into the sources AI cites'), why: ext.length ? tr('Las más citadas en tu categoría: ' + ext.join(', ') + '.', 'Most cited in your category: ' + ext.join(', ') + '.') : tr('Las respuestas citaron pocas fuentes.', 'The answers cited few sources.'),
      s: [tr('Crea o completa tu perfil en esas webs (reseñas, comparadores, directorios).', 'Create or complete your profile on those sites (reviews, comparison sites, directories).'), tr('Pide a tus clientes reseñas allí: cantidad y actualidad cuentan.', 'Ask your customers for reviews there: volume and recency matter.'), tr('Contacta con los autores de listas tipo «mejores…» para que te incluyan.', 'Reach out to authors of “best…” lists to be included.')] });
    if (behind) mid.push({ hi: true, t: tr('Compite de frente con ' + esc(leader.name), 'Go head to head with ' + esc(leader.name)), why: tr(esc(leader.name) + ' aparece en el ' + pct(leader.visibility) + ' de las respuestas; tú en el ' + pct(me.visibility) + '.', esc(leader.name) + ' appears in ' + pct(leader.visibility) + ' of answers; you in ' + pct(me.visibility) + '.'),
      s: [tr('Publica páginas honestas de comparación: «' + esc(s.brand) + ' vs ' + esc(leader.name) + '» y «Alternativas a ' + esc(leader.name) + '».', 'Publish honest comparison pages: “' + esc(s.brand) + ' vs ' + esc(leader.name) + '” and “' + esc(leader.name) + ' alternatives”.'), tr('Lee en qué respuestas gana y qué argumentos usa la IA para recomendarle.', 'Read which answers it wins and what arguments AI uses to recommend it.')] });
    if (lowPos) mid.push({ hi: true, t: tr('Sube del medio de la lista al podio', 'Move from mid-list to the podium'), why: tr('Cuando apareces, sales de media en la posición ' + num(me.avgPos, 1) + '.', 'When you appear, you’re on average in position ' + num(me.avgPos, 1) + '.'),
      s: [tr('Deja claro en qué caso eres la mejor opción (sector, tamaño de cliente, precio) y repítelo en web, perfiles y prensa.', 'Make it clear in which case you’re the best option (industry, client size, price) and repeat it on your site, profiles and press.'), tr('Consigue casos de éxito con cifras y publícalos.', 'Get success stories with figures and publish them.')] });
    mid.push({ hi: false, t: tr('Un contenido por pregunta clave', 'One piece of content per key question'), why: tr('Cada pregunta del estudio es una búsqueda real de tus compradores.', 'Each question in the study is a real buyer query.'), s: [tr('Publica una guía útil por cada pregunta, con tu punto de vista y datos propios.', 'Publish a useful guide for each question, with your point of view and your own data.'), tr('Enlázalas entre sí y desde la home.', 'Link them to each other and from the homepage.')] });
    long.push({ hi: false, t: tr('Construye autoridad fuera de tu web', 'Build authority outside your website'), why: tr('Los modelos aprenden de lo que se publica sobre ti, no solo de lo que publicas tú.', 'Models learn from what’s published about you, not just what you publish.'),
      s: [tr('Apariciones en prensa y medios del sector, podcasts y eventos.', 'Coverage in press and industry media, podcasts and events.'), tr('Estudios o datos propios que otros quieran citar (como un barómetro anual).', 'Your own studies or data others want to cite (like an annual barometer).'), tr('Entrada en Wikidata y, si eres relevante, Wikipedia, con fuentes independientes.', 'A Wikidata entry and, if notable, Wikipedia, with independent sources.')] });
    long.push({ hi: false, t: tr('Haz que se hable de ti donde preguntan tus clientes', 'Get talked about where your customers ask'), why: tr('Foros y comunidades pesan cada vez más en las respuestas.', 'Forums and communities weigh more and more in answers.'), s: [tr('Participa con ayuda real en Reddit, LinkedIn, YouTube y comunidades de tu sector.', 'Contribute real help on Reddit, LinkedIn, YouTube and your industry communities.'), tr('Anima a clientes contentos a contar su experiencia.', 'Encourage happy customers to share their experience.')] });
    long.push({ hi: false, t: tr('Mide cada mes y ajusta', 'Measure monthly and adjust'), why: tr('Las respuestas de la IA cambian: lo que no se mide, no mejora.', 'AI answers change: what isn’t measured doesn’t improve.'), s: [tr('Repite este estudio cada mes con las mismas preguntas y compara en tu histórico.', 'Repeat this study monthly with the same questions and compare in your history.'), tr('Fija un objetivo: por ejemplo, pasar de ' + R.score + ' a ' + Math.min(100, R.score + 15) + ' puntos en 3 meses.', 'Set a target: e.g. go from ' + R.score + ' to ' + Math.min(100, R.score + 15) + ' points in 3 months.')] });
    var byHi = function (a, b) { return (b.hi ? 1 : 0) - (a.hi ? 1 : 0); };
    return [short.sort(byHi).slice(0, 3), mid.sort(byHi).slice(0, 3), long];
  }
  function planHtml(st) {
    var P = plan(st), cols = [[tr('Corto plazo', 'Short term'), tr('Próximos 30 días', 'Next 30 days'), 'var(--coral)'], [tr('Medio plazo', 'Medium term'), tr('1 a 3 meses', '1 to 3 months'), 'var(--ind2)'], [tr('Largo plazo', 'Long term'), tr('3 a 12 meses', '3 to 12 months'), 'var(--teal)']];
    return '<section class="panel sec plan" id="plan"><div class="plan-h"><div><div class="eyebrow">' + tr('¿Y ahora qué?', 'So what?') + '</div><h3 style="margin-top:8px">' + tr('Tu plan para mejorar en la IA', 'Your plan to improve in AI') + '</h3><p class="sub">' + tr('Recomendaciones prácticas a partir de tus resultados, ordenadas por plazo e impacto.', 'Practical recommendations based on your results, ordered by timeframe and impact.') + '</p></div><button type="button" class="btn ghost" id="copyPlan" style="padding:11px 16px;font-size:14px">' + tr('Copiar plan', 'Copy plan') + '</button></div><div class="plan-g">' +
      P.map(function (items, k) { return '<div class="plan-c" style="--pc:' + cols[k][2] + '"><div class="plan-t"><b>' + cols[k][0] + '</b><span>' + cols[k][1] + '</span></div>' + items.map(function (it) { return '<div class="plan-i">' + (it.hi ? '<span class="plan-hi">' + tr('Prioridad', 'Priority') + '</span>' : '') + '<h4>' + it.t + '</h4><p class="why">' + it.why + '</p><ul>' + it.s.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>'; }).join('') + '</div>'; }).join('') +
      '</div><p class="small" style="margin:14px 0 0">' + tr('¿Quieres que te ayude a ejecutarlo? ', 'Want help putting it into practice? ') + '<a href="/#contacto">' + tr('Hablemos', 'Let’s talk') + ' →</a></p></section>';
  }
  function planText(st) {
    var P = plan(st), n = [tr('CORTO PLAZO (30 días)', 'SHORT TERM (30 days)'), tr('MEDIO PLAZO (1-3 meses)', 'MEDIUM TERM (1-3 months)'), tr('LARGO PLAZO (3-12 meses)', 'LONG TERM (3-12 months)')];
    var strip = function (h) { var d = document.createElement('div'); d.innerHTML = h; return d.textContent; };
    return tr('Plan para mejorar en la IA · ', 'Plan to improve in AI · ') + st.setup.brand + ' (AI Brand Barometer · plaiground)\n\n' + P.map(function (items, k) { return n[k] + '\n' + items.map(function (it) { return '• ' + strip(it.t) + ' — ' + strip(it.why) + '\n' + it.s.map(function (x) { return '   - ' + strip(x); }).join('\n'); }).join('\n') ; }).join('\n\n');
  }
  function openShare(st) {
    var box = $('sharebox'); box.innerHTML = '<div class="card sec sharecard"><b>' + tr('Creando enlace…', 'Creating link…') + '</b></div>';
    api('/api/aibb/studies/' + st.id + '/share', { method: 'POST' }).then(function (r) {
      if (!r.ok) { box.innerHTML = '<div class="card sec sharecard err">' + tr('No se pudo crear el enlace.', 'Couldn’t create the link.') + '</div>'; return; }
      var url = location.origin + '/ai-barometer/?s=' + r.d.share.token, exp = new Date(r.d.share.expires_at).toLocaleDateString(L() === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      var msg = tr('Mira cómo sale ' + st.setup.brand + ' en las respuestas de la IA frente a la competencia: ', 'See how ' + st.setup.brand + ' shows up in AI answers vs. competitors: ');
      box.innerHTML = '<div class="card sec sharecard"><div class="share-h"><div><h3 style="font-size:22px">' + tr('Comparte este informe', 'Share this report') + '</h3><p class="small" style="margin:4px 0 0">' + tr('Cualquiera con el enlace verá una copia de solo lectura hasta el ', 'Anyone with the link sees a read-only copy until ') + exp + tr('. No verá tu email ni tu histórico.', '. They won’t see your email or history.') + '</p></div><button type="button" class="x" id="shClose" aria-label="' + tr('Cerrar', 'Close') + '">×</button></div>' +
        '<div class="share-row"><input class="t" id="shUrl" readonly value="' + esc(url) + '"><button class="btn" type="button" id="shCopy">' + tr('Copiar enlace', 'Copy link') + '</button></div>' +
        '<div class="share-apps">' + (navigator.share ? '<button type="button" class="btn ghost" id="shNative">' + tr('Compartir…', 'Share…') + '</button>' : '') + '<a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(msg + url) + '">WhatsApp</a><a class="btn ghost" href="mailto:?subject=' + encodeURIComponent('AI Brand Barometer · ' + st.setup.brand) + '&body=' + encodeURIComponent(msg + url) + '">Email</a><a class="btn ghost" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url) + '">LinkedIn</a><button type="button" class="linkbtn" id="shRevoke">' + tr('Desactivar enlace', 'Disable link') + '</button></div></div>';
      $('shClose').onclick = function () { box.innerHTML = ''; };
      $('shCopy').onclick = function () { var b = this; $('shUrl').select(); (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { b.textContent = tr('Copiado ✓', 'Copied ✓'); setTimeout(function () { b.textContent = tr('Copiar enlace', 'Copy link'); }, 1800); }).catch(function () { }); };
      var nb = $('shNative'); if (nb) nb.onclick = function () { navigator.share({ title: 'AI Brand Barometer · ' + st.setup.brand, text: msg, url: url }).catch(function () { }); };
      $('shRevoke').onclick = function () { var b = this; if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = tr('¿Seguro? El enlace dejará de funcionar', 'Sure? The link will stop working'); return; } api('/api/aibb/studies/' + st.id + '/share', { method: 'DELETE' }).then(function () { box.innerHTML = '<div class="card sec sharecard">' + tr('Enlace desactivado. Si vuelves a compartir, se creará uno nuevo.', 'Link disabled. Sharing again creates a new one.') + '</div>'; }); };
    });
  }
  function kpi(l, v, d) { return '<div class="kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="d">' + d + '</div></div>'; }
  function showAnswer(i) {
    var st = S.study, a = st.answers[i]; if (!a) { $('ans').textContent = ''; return; }
    var h = esc(a.text).replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/^#{1,4} (.+)$/gm, '<b>$1</b>').replace(/^\s*[-*] /gm, '• ');
    st.result.brands.forEach(function (b, k) {
      var re = new RegExp('(' + esc(b.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      h = h.replace(re, '<mark style="background:' + col(k) + '">$1</mark>');
    });
    $('ans').innerHTML = h;
  }
  function tips(root) {
    var tip = $('tip');
    root.querySelectorAll('[data-tip]').forEach(function (el) {
      el.onmousemove = function (e) { tip.textContent = el.dataset.tip; tip.style.opacity = 1; tip.style.left = Math.min(innerWidth - 270, e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; };
      el.onmouseleave = function () { tip.style.opacity = 0; };
    });
  }

  /* ---------- histórico ---------- */
  function loadHistory() {
    if (!(S.cfg && S.cfg.user)) { S.hist = []; renderHistory(); return; }
    api('/api/aibb/studies').then(function (r) {
      S.hist = r.ok ? r.d.studies : [];
      if (S.openLatest && S.hist.length && !S.study && !S.running) { S.openLatest = false; return api('/api/aibb/studies/' + S.hist[0].id).then(function (x) { if (x.ok) { S.study = x.d.study; S.exSel = 0; renderResults(); renderHistory(); setTimeout(function () { $('results').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 200); } else renderHistory(); }); }
      renderHistory();
    });
  }
  function renderHistory() {
    var el = $('history'); if (!S.hist.length) { el.innerHTML = ''; return; }
    var doms = {}; S.hist.forEach(function (h) { (doms[h.domain] = doms[h.domain] || []).push(h); });
    var dom = S.study && doms[S.study.setup.domain] ? S.study.setup.domain : S.hist[0].domain;
    var pts = doms[dom].slice().sort(function (a, b) { return a.created_at - b.created_at; });
    var W = 760, Hh = 220, pad = 36, n = pts.length;
    var x = function (i) { return n < 2 ? W / 2 : pad + i * (W - pad * 2) / (n - 1); }, y = function (v) { return Hh - 30 - v / 100 * (Hh - 60); };
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i) + ' ' + y(p.score); }).join(' ');
    var grid = [0, 25, 50, 75, 100].map(function (g) { return '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="currentColor" opacity=".08"/><text x="' + (pad - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end" font-size="11" fill="currentColor" opacity=".5">' + g + '</text>'; }).join('');
    var dots = pts.map(function (p, i) { var dd = new Date(p.created_at); return '<circle cx="' + x(i) + '" cy="' + y(p.score) + '" r="6" fill="var(--ind)" stroke="var(--paper)" stroke-width="2" data-tip="' + dd.toLocaleDateString() + ' · Score ' + p.score + ' · ' + tr('visibilidad ', 'visibility ') + pct(p.visibility) + '"/><text x="' + x(i) + '" y="' + (Hh - 8) + '" text-anchor="middle" font-size="11" fill="currentColor" opacity=".6">' + dd.toLocaleDateString(L() === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' }) + '</text>'; }).join('');
    el.innerHTML = '<section class="panel sec hist"><h3>' + tr('Tu histórico', 'Your history') + '</h3><p class="sub">' + tr('Evolución del AI Visibility Score de ', 'AI Visibility Score over time for ') + '<b>' + esc(dom) + '</b>' + (Object.keys(doms).length > 1 ? ' · <select id="hdom">' + Object.keys(doms).map(function (k) { return '<option' + (k === dom ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select>' : '') + '</p>' +
      '<svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="' + tr('Evolución del score', 'Score over time') + '">' + grid + (n > 1 ? '<path d="' + line + '" fill="none" stroke="var(--ind)" stroke-width="2.5"/>' : '') + dots + '</svg>' +
      '<div class="hl">' + S.hist.slice(0, 12).map(function (h) { return '<div class="it"><span class="sc">' + h.score + '</span><span class="sp"><b>' + esc(h.brand) + '</b> · ' + esc(h.domain) + ' · ' + new Date(h.created_at).toLocaleDateString() + '</span><button type="button" data-o="' + h.id + '">' + tr('Abrir', 'Open') + '</button><button type="button" data-del="' + h.id + '">' + tr('Borrar', 'Delete') + '</button></div>'; }).join('') + '</div></section>';
    var hs = $('hdom'); if (hs) hs.onchange = function () { var pick = doms[hs.value][0]; api('/api/aibb/studies/' + pick.id).then(function (r) { if (r.ok) { S.study = r.d.study; renderResults(); renderHistory(); } }); };
    el.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { api('/api/aibb/studies/' + b.dataset.o).then(function (r) { if (r.ok) { S.study = r.d.study; S.exSel = 0; renderResults(); renderHistory(); $('results').scrollIntoView({ behavior: 'smooth', block: 'start' }); } }); }; });
    el.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { if (b.dataset.sure) { api('/api/aibb/studies/' + b.dataset.del, { method: 'DELETE' }).then(loadHistory); } else { b.dataset.sure = 1; b.textContent = tr('¿Seguro?', 'Sure?'); } }; });
    tips(el);
  }

  /* ---------- arranque ---------- */
  // Casos de estudio publicados: copia fija de un estudio real, sin caducidad
  var caso = new URLSearchParams(location.search).get('caso');
  if (caso && /^[a-z0-9-]{3,40}$/.test(caso)) {
    document.body.classList.add('viewing');
    fetch('/ai-barometer/casos/' + caso + '.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (st) {
      if (!st) { document.body.classList.remove('viewing'); $('goErr').textContent = tr('Este caso de estudio no está disponible.', 'This case study isn’t available.'); return; }
      S.viewer = true; S.viewerCase = true; S.study = st; renderResults();
    });
    return;
  }
  var shareTok = new URLSearchParams(location.search).get('s');
  if (shareTok && /^[a-f0-9]{36}$/.test(shareTok)) {
    var mr = document.createElement('meta'); mr.name = 'robots'; mr.content = 'noindex'; document.head.appendChild(mr);
    document.body.classList.add('viewing');
    api('/api/aibb/share/' + shareTok).then(function (r) {
      if (!r.ok) { document.body.classList.remove('viewing'); $('goErr').textContent = tr('Este enlace ya no está disponible. Pide a quien te lo envió que lo comparta de nuevo, o haz tu propio estudio.', 'This link is no longer available. Ask whoever sent it to share it again, or run your own study.'); return; }
      S.viewer = true; S.viewerExp = r.d.expires_at; S.study = r.d.study; renderResults();
    });
    return;
  }
  var tok = new URLSearchParams(location.search).get('login');
  var boot = tok && /^[a-f0-9]{64}$/.test(tok) ? (history.replaceState(null, '', location.pathname), api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token: tok, src: 'aibb' }) }).then(function (r) { if (r.ok) S.openLatest = true; if (!r.ok) $('goErr').textContent = tr('Ese enlace ha caducado o ya se usó. Vuelve a pedirlo desde tu estudio.', 'That link has expired or was already used. Request a new one from your study.'); })) : Promise.resolve();
  boot.then(function () { return api('/api/aibb/config'); }).then(function (r) {
    S.cfg = r.ok ? r.d : { engines: [], live: false, user: null, limits: { competitors: 5, prompts: 8 } };
    renderWho(); loadHistory();
    // Llegada desde el formulario de la home (?url=tuweb.com): se rellena y se lanza el análisis
    var qurl = new URLSearchParams(location.search).get('url');
    if (qurl) { history.replaceState(null, '', location.pathname); $('url').value = qurl.trim().slice(0, 200); setTimeout(function () { var f = $('goForm'); if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable: true })); }, 60); return; }
    var saved = null, ss = null; try { saved = localStorage.getItem('plg-aibb-url'); ss = JSON.parse(localStorage.getItem('plg-aibb-setup') || 'null'); localStorage.removeItem('plg-aibb-url'); localStorage.removeItem('plg-aibb-setup'); } catch (e) { }
    var auto = null; try { auto = localStorage.getItem('plg-aibb-autorun'); localStorage.removeItem('plg-aibb-autorun'); } catch (e) { }
    if (ss && S.cfg.user && S.cfg.live && ss.domain) { $('url').value = saved || ss.domain; S.setup = ss; S.mode = 'live'; S.reason = ''; S.engines = S.cfg.engines; S.sel = {}; S.engines.forEach(function (x) { S.sel[x.id] = x.active; }); renderSetup(); if (auto) { runLive(); return; } setTimeout(function () { $('setup').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300); return; }
    var q = new URLSearchParams(location.search).get('url');
    if (saved || q) { $('url').value = saved || q; if (S.cfg.user) $('goForm').requestSubmit ? $('goForm').requestSubmit() : $('goBtn').click(); }
  });
})();
