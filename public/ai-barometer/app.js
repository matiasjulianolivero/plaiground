/* plaiground · AI Brand Barometer (frontend) */
(function () {
  'use strict';
  var H = document.documentElement, $ = function (id) { return document.getElementById(id); };
  var L = function () { return H.getAttribute('data-lang') === 'en' ? 'en' : 'es'; };
  var tr = function (es, en) { return L() === 'en' ? en : es; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dark = function () { return H.getAttribute('data-theme') === 'dark'; };
  var PAL = { light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6'], dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'] };
  var SEQ = ['#e6eefb', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#2a78d6', '#1c5cab', '#104281', '#0d366b'];
  var SEQ_D = ['#1d2448', '#1c2f5e', '#1c3f7d', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#6da7ec', '#9ec5f4'];
  var col = function (i) { return (dark() ? PAL.dark : PAL.light)[i % 6]; };
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
  document.querySelectorAll('.pill button').forEach(function (b) { b.onclick = function () { H.setAttribute('data-lang', b.dataset.l); H.lang = b.dataset.l; try { localStorage.setItem('plg-lang', b.dataset.l); } catch (e) { } rerender(); }; });
  $('themeBtn').onclick = function () { var t = dark() ? 'light' : 'dark'; H.setAttribute('data-theme', t); try { localStorage.setItem('plg-theme', t); } catch (e) { } rerender(); };
  function rerender() { if (S.setup && !S.study && !S.running) renderSetup(); if (S.study) renderResults(); renderHistory(); renderWho(); }
  function renderWho() { var u = S.cfg && S.cfg.user; $('who').innerHTML = u ? '● ' + esc(u.email) : ''; }

  /* ---------- paso 1: web ---------- */
  $('goForm').onsubmit = function (e) {
    e.preventDefault();
    var v = $('url').value.trim();
    if (!/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(v)) { $('goErr').textContent = tr('Escribe la web de tu empresa, por ejemplo tuempresa.com', 'Enter your company website, e.g. yourcompany.com'); return; }
    $('goErr').textContent = ''; var b = $('goBtn'); b.disabled = true;
    S.study = null; $('results').innerHTML = ''; $('run').innerHTML = '';
    $('setup').innerHTML = '<div class="card sec"><b>' + tr('Leyendo tu web y preparando el estudio…', 'Reading your website and preparing the study…') + '</b><div class="bar"><i style="width:35%"></i></div></div>';
    api('/api/aibb/setup', { method: 'POST', body: JSON.stringify({ url: v, lang: L() }) }).then(function (r) {
      b.disabled = false;
      if (!r.ok) { $('setup').innerHTML = ''; $('goErr').textContent = r.d.error === 'user_limit' ? tr('Has llegado al máximo de estudios de hoy. Vuelve mañana.', 'You’ve reached today’s study limit. Come back tomorrow.') : r.d.error === 'global_limit' ? tr('Hoy se ha agotado el cupo gratuito de la beta. Vuelve mañana.', 'Today’s free beta quota is used up. Come back tomorrow.') : r.d.error === 'invalid_url' ? tr('Esa web no parece válida.', 'That website doesn’t look valid.') : tr('No se pudo preparar el estudio. Inténtalo de nuevo.', 'Couldn’t prepare the study. Try again.'); return; }
      S.setup = r.d.setup; S.mode = r.d.mode; S.reason = r.d.reason || ''; S.engines = r.d.engines || [];
      S.sel = {}; S.engines.forEach(function (x) { S.sel[x.id] = x.active; });
      renderSetup(); $('setup').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  /* ---------- paso 2: revisar y lanzar ---------- */
  function renderSetup() {
    var s = S.setup; if (!s) return;
    var live = S.mode === 'live';
    var why = S.reason === 'login' ? tr('Este es un <b>estudio de ejemplo</b> (respuestas simuladas) para que veas cómo funciona. Para preguntar de verdad a las IA y guardar tu histórico, entra con tu email:', 'This is a <b>sample study</b> (simulated answers) so you can see how it works. To actually ask the AIs and keep your history, sign in with your email:')
      : S.reason === 'nokey' ? tr('La conexión con las IA todavía no está activada en esta beta, así que verás un <b>estudio de ejemplo</b> con respuestas simuladas.', 'The connection to the AIs isn’t switched on yet in this beta, so you’ll see a <b>sample study</b> with simulated answers.')
        : S.reason === 'rate_limited' ? tr('Las IA gratuitas están saturadas ahora mismo. Te mostramos un <b>estudio de ejemplo</b>; prueba de nuevo en unos minutos.', 'The free AIs are busy right now. Here’s a <b>sample study</b>; try again in a few minutes.')
          : tr('Te mostramos un <b>estudio de ejemplo</b> con respuestas simuladas.', 'Here’s a <b>sample study</b> with simulated answers.');
    var eng = S.engines.map(function (x) {
      var on = live ? x.active : true;
      return '<label class="' + (on ? '' : 'off') + '"><input type="checkbox" data-e="' + x.id + '"' + (on && (live ? S.sel[x.id] : true) ? ' checked' : '') + (on ? '' : ' disabled') + '> ' + esc(x.name) + (live && !x.active ? ' <small class="prem">Premium</small>' : '') + (!live ? ' <small>' + tr('simulado', 'simulated') + '</small>' : '') + '</label>';
    }).join('');
    $('setup').innerHTML = '<section class="card sec" id="setupCard">' +
      '<div class="banner ' + (live ? 'live' : '') + '"><span class="ic">' + (live ? '🛰️' : '🧪') + '</span><div>' + (live ? tr('<b>Estudio real.</b> Preguntaremos a las IA conectadas y guardaremos el resultado en tu histórico. Revisa los datos antes de lanzarlo.', '<b>Live study.</b> We’ll ask the connected AIs and save the result to your history. Check the details before running it.') : why) +
      (S.reason === 'login' ? '<form class="lform" id="lform"><input class="t" id="lem" type="email" autocomplete="email" placeholder="' + tr('tu@empresa.com', 'you@company.com') + '"><button class="btn" type="submit">' + tr('Recibir enlace de acceso', 'Get sign-in link') + '</button></form><label class="small" style="display:flex;gap:8px;margin-top:8px"><input type="checkbox" id="lacc"> <span>' + tr('Acepto los <a href="/legal/terminos/" target="_blank">términos</a> y la <a href="/legal/privacidad/" target="_blank">política de privacidad</a>.', 'I accept the <a href="/legal/terminos/" target="_blank">terms</a> and the <a href="/legal/privacidad/" target="_blank">privacy policy</a>.') + '</span></label><div class="err" id="lerr"></div>' : '') + '</div></div>' +
      '<h2 style="font-size:30px;margin:24px 0 16px">' + tr('Revisa tu estudio', 'Review your study') + '</h2>' +
      '<div class="grid2"><div><label class="f" for="sb">' + tr('Marca', 'Brand') + '</label><input class="t" id="sb" maxlength="60" value="' + esc(s.brand) + '"></div><div><label class="f" for="sc">' + tr('Categoría', 'Category') + '</label><input class="t" id="sc" maxlength="80" value="' + esc(s.category) + '"></div></div>' +
      '<div class="sec"><label class="f">' + tr('Competidores', 'Competitors') + ' <span style="text-transform:none;letter-spacing:0;font-weight:500">(' + tr('máx. ', 'max ') + (S.cfg ? S.cfg.limits.competitors : 5) + ')</span></label><div class="chips" id="comps">' + s.competitors.map(function (c, i) { return '<span class="chip">' + esc(c) + '<button type="button" data-rc="' + i + '" aria-label="' + tr('Quitar', 'Remove') + ' ' + esc(c) + '">×</button></span>'; }).join('') + (s.competitors.length < 5 ? '<span class="chip add"><input id="addc" maxlength="60" placeholder="+ ' + tr('Añadir competidor', 'Add competitor') + '"></span>' : '') + '</div></div>' +
      '<div class="sec"><label class="f">' + tr('Preguntas que haría un comprador', 'Questions a buyer would ask') + '</label><div class="plist">' + s.prompts.map(function (p, i) { return '<div class="prow"><span class="n">' + (i + 1) + '</span><input class="t" data-p="' + i + '" maxlength="240" value="' + esc(p) + '"><button type="button" data-rp="' + i + '" aria-label="' + tr('Quitar pregunta', 'Remove question') + '">×</button></div>'; }).join('') + '</div>' + (s.prompts.length < 8 ? '<button type="button" class="btn ghost" id="addp" style="margin-top:10px;padding:10px 16px;font-size:14px">+ ' + tr('Añadir pregunta', 'Add question') + '</button>' : '') + '</div>' +
      '<div class="sec"><label class="f">' + tr('Asistentes de IA', 'AI assistants') + '</label><div class="eng">' + eng + '</div></div>' +
      (live && S.engines.some(function (x) { return !x.active; }) ? '<p class="small" style="margin-top:10px">' + tr('ChatGPT, Claude y Perplexity llegarán con el <b>informe Premium</b>. <a href="/#contacto">Quiero que me avisen</a>', 'ChatGPT, Claude and Perplexity will come with the <b>Premium report</b>. <a href="/#contacto">Let me know</a>') + '</p>' : '') +
      '<div class="row"><span class="small">' + (live ? tr('Tarda 1–2 minutos. Las respuestas se guardan tal cual las dan los modelos.', 'Takes 1–2 minutes. Answers are stored exactly as the models give them.') : tr('Las respuestas del modo demo son inventadas y solo sirven para ver el informe.', 'Demo answers are made up and only show what the report looks like.')) + '</span><button class="btn" id="runBtn" type="button">' + (live ? tr('Lanzar estudio', 'Run study') : tr('Ver estudio de ejemplo', 'See sample study')) + ' →</button></div></section>';
    bindSetup();
  }
  function readSetup() {
    var s = S.setup; s.brand = $('sb').value.trim() || s.brand; s.category = $('sc').value.trim();
    document.querySelectorAll('[data-p]').forEach(function (i) { s.prompts[+i.dataset.p] = i.value.trim(); });
    s.prompts = s.prompts.filter(Boolean);
    document.querySelectorAll('[data-e]').forEach(function (c) { S.sel[c.dataset.e] = c.checked; });
  }
  function bindSetup() {
    document.querySelectorAll('[data-rc]').forEach(function (b) { b.onclick = function () { readSetup(); S.setup.competitors.splice(+b.dataset.rc, 1); renderSetup(); }; });
    document.querySelectorAll('[data-rp]').forEach(function (b) { b.onclick = function () { readSetup(); S.setup.prompts.splice(+b.dataset.rp, 1); renderSetup(); }; });
    var ac = $('addc'); if (ac) ac.onkeydown = function (e) { if (e.key === 'Enter' && ac.value.trim()) { e.preventDefault(); readSetup(); S.setup.competitors.push(ac.value.trim()); renderSetup(); var n = $('addc'); if (n) n.focus(); } };
    var ap = $('addp'); if (ap) ap.onclick = function () { readSetup(); S.setup.prompts.push(''); renderSetup(); var all = document.querySelectorAll('[data-p]'); all[all.length - 1].focus(); };
    var lf = $('lform'); if (lf) lf.onsubmit = function (e) {
      e.preventDefault(); var em = $('lem').value.trim(), er = $('lerr');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { er.textContent = tr('Escribe un email válido.', 'Enter a valid email.'); return; }
      if (!$('lacc').checked) { er.textContent = tr('Acepta los términos para continuar.', 'Accept the terms to continue.'); return; }
      try { localStorage.setItem('plg-aibb-url', $('url').value.trim()); } catch (x) { }
      api('/api/auth/request', { method: 'POST', body: JSON.stringify({ email: em, accepted: true, lang: L(), next: '/ai-barometer/' }) }).then(function (r) {
        er.style.color = r.ok ? 'var(--teal)' : ''; er.textContent = r.ok ? tr('¡Listo! Revisa tu email y abre el enlace: volverás aquí con la sesión iniciada.', 'Done! Check your email and open the link: you’ll come back here signed in.') : r.d.error === 'email_not_configured' ? tr('El acceso por email no está disponible ahora mismo.', 'Email sign-in isn’t available right now.') : tr('No se pudo enviar. Inténtalo en unos minutos.', 'Couldn’t send it. Try again in a few minutes.');
      });
    };
    $('runBtn').onclick = function () { readSetup(); if (!S.setup.prompts.length) return; S.mode === 'live' ? runLive() : runDemo(); };
  }

  /* ---------- paso 3: ejecutar ---------- */
  function runDemo() {
    S.running = true; renderRun([], 0, 1);
    api('/api/aibb/finish', { method: 'POST', body: JSON.stringify({ setup: S.setup, demo: true }) }).then(function (r) {
      S.running = false; $('run').innerHTML = '';
      if (!r.ok) { $('goErr').textContent = tr('No se pudo generar el estudio.', 'Couldn’t generate the study.'); return; }
      S.study = r.d.study; $('setup').innerHTML = ''; renderResults(); $('results').scrollIntoView({ behavior: 'smooth' });
    });
  }
  function runLive() {
    var engines = S.engines.filter(function (e) { return e.active && S.sel[e.id]; }).map(function (e) { return e.id; });
    if (!engines.length) return;
    var jobs = []; engines.forEach(function (e) { S.setup.prompts.forEach(function (p) { jobs.push({ engine: e, prompt: p, st: '' }); }); });
    S.running = true; $('setup').innerHTML = ''; renderRun(jobs, 0, jobs.length + 1);
    var answers = [], i = 0;
    (function next() {
      if (i >= jobs.length) return finish();
      var j = jobs[i]; j.st = 'on'; renderRun(jobs, i, jobs.length + 1);
      api('/api/aibb/ask', { method: 'POST', body: JSON.stringify({ setup: S.setup, engine: j.engine, prompt: j.prompt }) }).then(function (r) {
        if (r.ok && r.d.text) { j.st = 'ok'; answers.push({ engine: j.engine, prompt: j.prompt, text: r.d.text }); }
        else { j.st = 'ko'; if (r.status === 429 && (r.d.error === 'global_limit')) { i = jobs.length; return finish(); } }
        i++; renderRun(jobs, i, jobs.length + 1);
        setTimeout(next, 4200); // respeta el límite por minuto de la capa gratuita
      });
    })();
    function finish() {
      if (!answers.length) { S.running = false; $('run').innerHTML = '<div class="card sec"><b>' + tr('Las IA no han respondido ahora mismo (cupo gratuito saturado). Prueba en unos minutos.', 'The AIs didn’t answer right now (free quota busy). Try again in a few minutes.') + '</b></div>'; return; }
      api('/api/aibb/finish', { method: 'POST', body: JSON.stringify({ setup: S.setup, answers: answers }) }).then(function (r) {
        S.running = false; $('run').innerHTML = '';
        if (!r.ok) { $('goErr').textContent = tr('No se pudo calcular el estudio.', 'Couldn’t compute the study.'); return; }
        S.study = r.d.study; renderResults(); loadHistory(); $('results').scrollIntoView({ behavior: 'smooth' });
      });
    }
  }
  function renderRun(jobs, done, total) {
    var p = Math.round(done / total * 100);
    $('run').innerHTML = '<section class="card sec"><div class="runh"><div><div class="eyebrow">' + tr('En marcha', 'Running') + '</div><h2 style="font-size:30px;margin-top:8px">' + tr('Preguntando a las IA…', 'Asking the AIs…') + '</h2></div><b style="font:800 34px var(--display)">' + p + '%</b></div><div class="bar"><i style="width:' + p + '%"></i></div>' +
      (jobs.length ? '<div class="tasks">' + jobs.map(function (j) { return '<div class="task ' + j.st + '"><span class="st">' + (j.st === 'ok' ? '✓' : j.st === 'ko' ? '!' : '') + '</span><span>' + esc(j.prompt) + '</span><span class="e">' + ENG_NAME[j.engine] + '</span></div>'; }).join('') + '</div>' : '') + '</section>';
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
    if (R.sentiment != null) out.push([R.sentiment > .2 ? '💚' : R.sentiment < -.2 ? '⚠️' : '😐', tr('Tono hacia tu marca: <b>' + (R.sentiment > .2 ? 'positivo' : R.sentiment < -.2 ? 'negativo' : 'neutro') + '</b>.', 'Tone towards your brand: <b>' + (R.sentiment > .2 ? 'positive' : R.sentiment < -.2 ? 'negative' : 'neutral') + '</b>.')]);
    return out;
  }
  function ring(v) {
    var r = 46, c = 2 * Math.PI * r;
    return '<svg class="ring" viewBox="0 0 112 112" aria-hidden="true"><circle cx="56" cy="56" r="' + r + '" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="10"/><circle cx="56" cy="56" r="' + r + '" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (c * v / 100) + ' ' + c + '" transform="rotate(-90 56 56)"/><text x="56" y="64" text-anchor="middle" fill="#fff" font-family="Bricolage Grotesque,system-ui" font-weight="800" font-size="30">' + v + '</text></svg>';
  }
  function renderResults() {
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
        return '<tr><th class="p" scope="row">' + esc(p) + '</th>' + B.map(function (b, k) {
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
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' + (st.demo ? '<span class="tag demo">🧪 ' + tr('Ejemplo · datos simulados', 'Sample · simulated data') + '</span>' : '<span class="tag live">🛰️ ' + tr('Estudio real', 'Live study') + '</span>') + '<button class="btn ghost" type="button" id="again" style="padding:11px 16px;font-size:14px">' + tr('Nuevo estudio', 'New study') + '</button></div></div>' +
      (st.demo ? '<div class="banner" style="margin-bottom:16px"><span class="ic">🧪</span><div>' + tr('Estas cifras salen de <b>respuestas inventadas</b> para enseñarte el informe. No describen la visibilidad real de ninguna marca.', 'These figures come from <b>made-up answers</b> to show you the report. They don’t describe any brand’s real visibility.') + '</div></div>' : '') +
      kpis +
      '<div class="g2"><section class="panel"><h3>' + tr('Ranking de visibilidad', 'Visibility ranking') + '</h3><p class="sub">' + tr('% de respuestas en las que aparece cada marca · posición media · cuota de voz', '% of answers mentioning each brand · average position · share of voice') + '</p>' + rank + '</section>' +
      '<section class="panel"><h3>' + tr('Lo que hay que saber', 'What you need to know') + '</h3><p class="sub">' + tr('Lectura automática de los resultados', 'Automatic reading of the results') + '</p>' + ins + '</section></div>' +
      '<section class="panel sec"><h3>' + tr('Posición por pregunta', 'Position by question') + '</h3><p class="sub">' + tr('En qué puesto sale cada marca en cada respuesta (1 = la primera que menciona la IA)', 'Where each brand ranks in each answer (1 = the first one the AI mentions)') + '</p>' + hm + '</section>' +
      '<div class="g2"><section class="panel"><h3>' + tr('Visibilidad por asistente', 'Visibility by assistant') + '</h3><p class="sub">' + tr('% de respuestas de cada IA que mencionan a cada marca', '% of each AI’s answers mentioning each brand') + '</p>' + eh + '</section>' +
      '<section class="panel"><h3>' + tr('Fuentes que cita la IA', 'Sources the AI cites') + '</h3><p class="sub">' + tr('Webs mencionadas como fuente en las respuestas', 'Websites mentioned as sources in the answers') + '</p>' + src + '</section></div>' +
      '<section class="panel sec prem-card" id="premium"><div><span class="tag prem">✦ Premium · ' + tr('próximamente', 'coming soon') + '</span><h3 style="margin-top:12px">' + tr('El informe completo: ChatGPT, Claude y Perplexity', 'The full report: ChatGPT, Claude and Perplexity') + '</h3><p class="sub" style="margin:6px 0 0">' + tr('Este estudio usa Gemini. El informe Premium pregunta también a ChatGPT, Claude y Perplexity, compara los cuatro y sigue tu marca cada mes. Apúntate y te aviso en cuanto esté.', 'This study uses Gemini. The Premium report also asks ChatGPT, Claude and Perplexity, compares all four and tracks your brand every month. Sign up and I’ll let you know as soon as it’s ready.') + '</p></div><a class="btn" href="/#contacto">' + tr('Quiero el Premium', 'I want Premium') + ' →</a></section>' +
      '<section class="panel sec"><h3>' + tr('Lee las respuestas', 'Read the answers') + '</h3><p class="sub">' + tr('Tal cual las dio cada asistente, con las marcas resaltadas', 'Exactly as each assistant gave them, with brands highlighted') + '</p><div class="ex"><div class="exl" id="exl">' + exl + '</div><div class="ans" id="ans"></div></div></section>';
    showAnswer(S.exSel);
    document.querySelectorAll('#exl button').forEach(function (b) { b.onclick = function () { S.exSel = +b.dataset.x; document.querySelectorAll('#exl button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); showAnswer(S.exSel); }; });
    $('again').onclick = function () { S.study = null; S.exSel = 0; $('results').innerHTML = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); $('url').focus(); };
    tips($('results'));
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
    api('/api/aibb/studies').then(function (r) { S.hist = r.ok ? r.d.studies : []; renderHistory(); });
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
    el.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { api('/api/aibb/studies/' + b.dataset.o).then(function (r) { if (r.ok) { S.study = r.d.study; S.exSel = 0; renderResults(); renderHistory(); $('results').scrollIntoView({ behavior: 'smooth' }); } }); }; });
    el.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { if (b.dataset.sure) { api('/api/aibb/studies/' + b.dataset.del, { method: 'DELETE' }).then(loadHistory); } else { b.dataset.sure = 1; b.textContent = tr('¿Seguro?', 'Sure?'); } }; });
    tips(el);
  }

  /* ---------- arranque ---------- */
  api('/api/aibb/config').then(function (r) {
    S.cfg = r.ok ? r.d : { engines: [], live: false, user: null, limits: { competitors: 5, prompts: 8 } };
    renderWho(); loadHistory();
    var saved = null; try { saved = localStorage.getItem('plg-aibb-url'); localStorage.removeItem('plg-aibb-url'); } catch (e) { }
    var q = new URLSearchParams(location.search).get('url');
    if (saved || q) { $('url').value = saved || q; if (S.cfg.user) $('goForm').requestSubmit ? $('goForm').requestSubmit() : $('goBtn').click(); }
  });
})();
