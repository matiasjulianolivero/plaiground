/* Plai, la mascota de plaiground.
   Primera visita: golpea la pantalla desde dentro, la raja sin querer, se avergüenza, la arregla con una tirita y se va a una esquina.
   Después: se queda en la esquina con un bocadillo que lleva al AI Brand Barometer.
   Una sola vez por visitante, se salta con cualquier clic/tecla/scroll, sin animación si el sistema pide menos movimiento, y se puede cerrar. */
(function () {
  'use strict';
  var KEY_INTRO = 'plg-plai-intro', KEY_OFF = 'plg-plai-hide';
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var put = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } };
  var sget = function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  var sput = function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } };
  if (sget(KEY_OFF) === '1') return;
  var PATH = location.pathname, HOME = PATH === '/' || PATH === '/index.html', AIBB = PATH.indexOf('/ai-barometer') === 0, DATA = PATH === '/data/' || PATH === '/data/index.html';
  var H = document.documentElement, NS = 'http://www.w3.org/2000/svg';
  var L = function () { return H.getAttribute('data-lang') === 'en' ? 'en' : 'es'; };
  var T = {
    ups: { es: '¡Ups! Perdón…', en: 'Oops! Sorry…' },
    fix: { es: 'Tranqui, lo arreglo', en: 'Don’t worry, I’ll fix it' },
    ok: { es: '¡Como nuevo!', en: 'Good as new!' },
    cta: { es: '¿Qué dice la IA de tu marca?', en: 'What does AI say about your brand?' },
    go: { es: 'Descúbrelo gratis →', en: 'Find out free →' },
    close: { es: 'Cerrar a Plai', en: 'Close Plai' },
    menu: { es: '¿En qué te ayudo?', en: 'How can I help?' }
  };
  // Atajos del menú (al pulsar a Plai)
  var ACTIONS = [
    { es: 'Analizar mi marca en la IA', en: 'Analyze my brand in AI', go: 'aibb' },
    { es: 'Convertir mis datos en decisiones', en: 'Turn my data into decisions', href: '/data/' },
    { es: 'Ver el caso McDonald’s', en: 'See the McDonald’s case', href: '/ai-barometer/?caso=mcdonalds-es' },
    { es: 'Hablar con Matías', en: 'Talk to Matías', href: '/#contacto' }
  ];
  // Sugerencias según la parte de la página que se está viendo
  var TIPS = HOME ? {
    'ai-barometer': { es: 'Estas herramientas son gratis. ¿Probamos con tu web? Tarda unos minutos.', en: 'These tools are free. Shall we try your website? It takes a few minutes.', a: { es: 'Analizar mi marca →', en: 'Analyze my brand →', go: 'aibb' } },
    data: { es: '¿Tienes un Excel o un CSV con datos de marketing? Te lo convierto en un dashboard con plan de acción.', en: 'Got an Excel or CSV with marketing data? I’ll turn it into a dashboard with an action plan.', a: { es: 'Subir mis datos →', en: 'Upload my data →', href: '/data/' } },
    lab: { es: 'Mi favorito: lo que dice la IA de McDonald’s. ¡Goiko le gana en precio!', en: 'My favourite: what AI says about McDonald’s. Goiko beats it on price!', a: { es: 'Ver el caso →', en: 'See the case →', href: '/ai-barometer/?caso=mcdonalds-es' } },
    servicios: { es: '¿No sabes por dónde empezar? Cuéntale tu reto a Matías y te dice qué haría.', en: 'Not sure where to start? Tell Matías your challenge and he’ll tell you what he’d do.', a: { es: 'Contar mi reto →', en: 'Tell my challenge →', href: '#contacto' } },
    'sobre-mi': { es: 'Psst… su CV es un festival de música. En serio.', en: 'Psst… his CV is a music festival. Seriously.', a: { es: 'Entrar al festival →', en: 'Enter the festival →', href: '/cv/' } },
    contacto: { es: 'Cuatro toques y tu pase se arma solo. Matías responde en menos de 48 h.', en: 'Four taps and your pass builds itself. Matías replies within 48 h.' }
  } : DATA ? {
    demo: { es: 'Así queda un dashboard real. Con tus datos, en unos minutos.', en: 'This is what a real dashboard looks like. With your data, in minutes.' },
    acceso: { es: 'Entra con tu email y sube tu Excel, CSV o Google Sheets. Yo me encargo del resto.', en: 'Sign in with your email and upload your Excel, CSV or Google Sheets. I’ll handle the rest.' },
    faq: { es: '¿Dudas con tus datos? Aquí están las respuestas rápidas.', en: 'Questions about your data? Quick answers here.' }
  } : {};
  var PAGE_TIP = HOME ? { es: '¿Qué dice la IA de tu marca? Te lo cuento gratis.', en: 'What does AI say about your brand? I’ll tell you, free.', a: { es: 'Descúbrelo →', en: 'Find out →', go: 'aibb' } }
    : AIBB ? { es: 'Pon tu web arriba y yo investigo qué dice la IA de tu marca.', en: 'Enter your website above and I’ll find out what AI says about your brand.' }
    : DATA ? { es: 'Sube tus datos y te devuelvo decisiones, no solo gráficos.', en: 'Upload your data and I’ll give you decisions, not just charts.' }
    : { es: '¿Te ayudo?', en: 'Can I help?' };
  var tr = function (k) { return T[k][L()]; };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- estilos ----------
  var css = document.createElement('style');
  css.textContent =
    '#plai-layer{position:fixed;inset:0;width:100vw;height:100vh;z-index:70;pointer-events:none;overflow:visible}' +
    '#plai-layer .pb{pointer-events:auto;cursor:pointer}' +
    '#plai-layer .pb:focus{outline:none}' +
    '.plai-bub{position:fixed;z-index:71;max-width:250px;padding:12px 14px 12px 16px;border-radius:18px 18px 6px 18px;background:var(--paper,#fff);color:var(--ink,#14162E);border:1px solid var(--line,rgba(20,22,46,.12));box-shadow:0 18px 44px rgba(20,22,46,.18);font:600 14.5px/1.35 var(--body,system-ui,sans-serif);opacity:0;transform:translateY(6px) scale(.97);transform-origin:100% 100%;transition:opacity .2s,transform .2s;pointer-events:none}' +
    '.plai-bub.show{opacity:1;transform:none;pointer-events:auto}' +
    '.plai-bub a{display:inline-block;margin-top:4px;color:var(--ind,#4338CA);font-weight:800;text-decoration:none}.plai-bub a:hover{text-decoration:underline}' +
    '.plai-bub .x{position:absolute;top:-9px;right:-9px;width:24px;height:24px;border-radius:50%;border:1px solid var(--line,rgba(20,22,46,.12));background:var(--paper,#fff);color:var(--muted,#555A7A);font:700 13px/1 system-ui;cursor:pointer;display:grid;place-items:center}' +
    '.plai-bub.intro{border-radius:18px;text-align:center}' +
    '.plai-bub b{display:block;font-weight:800;margin-bottom:4px}.plai-bub .pm-tip{font-weight:500;color:var(--muted,#555A7A);font-size:13.5px;margin:2px 0 8px}' +
    '.plai-bub .pm{display:flex;flex-direction:column;gap:2px}.plai-bub .pm a{margin:0;padding:6px 0;border-top:1px solid var(--line,rgba(20,22,46,.1))}' +
    '@media print{#plai-layer,.plai-bub{display:none!important}}';
  document.head.appendChild(css);

  // ---------- dibujo de Plai (coordenadas locales: centro en 0,0) ----------
  var PLAI =
    '<ellipse cx="0" cy="74" rx="58" ry="8" fill="#8A8FB5" opacity=".25"/>' +
    '<line x1="0" y1="-64" x2="8" y2="-98" stroke="#4338CA" stroke-width="6" stroke-linecap="round"/>' +
    '<circle class="pg" cx="10" cy="-104" r="17" fill="none" stroke="#FF7A59" stroke-width="2" opacity=".35"/>' +
    '<circle cx="10" cy="-104" r="10" fill="#FF7A59"/>' +
    '<path d="M-56 10 Q-74 26 -66 44" fill="none" stroke="#4338CA" stroke-width="13" stroke-linecap="round"/>' +
    '<rect x="-62" y="-64" width="124" height="128" rx="58" fill="#4338CA"/>' +
    '<ellipse cx="0" cy="24" rx="40" ry="30" fill="#8B8CF8" opacity=".55"/>' +
    '<g class="eN"><ellipse cx="-22" cy="-16" rx="14" ry="16" fill="#fff"/><ellipse cx="22" cy="-16" rx="14" ry="16" fill="#fff"/><circle cx="-19" cy="-14" r="6.5" fill="#14162E"/><circle cx="25" cy="-14" r="6.5" fill="#14162E"/><circle cx="-17" cy="-17" r="2.2" fill="#fff"/><circle cx="27" cy="-17" r="2.2" fill="#fff"/></g>' +
    '<g class="eE" opacity="0"><path d="M-34 -22 L-14 -14 L-34 -6" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M34 -22 L14 -14 L34 -6" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>' +
    '<ellipse class="ck" cx="-38" cy="6" rx="8" ry="5" fill="#FF7A59" opacity=".75"/><ellipse class="ck" cx="38" cy="6" rx="8" ry="5" fill="#FF7A59" opacity=".75"/>' +
    '<path class="mS" d="M-12 10 Q0 22 12 10" fill="none" stroke="#14162E" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path class="mW" d="M-14 14 q5 -6 10 0 t10 0 t8 0" fill="none" stroke="#14162E" stroke-width="3.5" stroke-linecap="round" opacity="0"/>' +
    '<path class="dr" d="M54 -46 q8 12 0 18 q-8 -6 0 -18z" fill="#7CC4F8" opacity="0"/>' +
    '<ellipse cx="-22" cy="66" rx="16" ry="8" fill="#2EC4A0"/><ellipse cx="22" cy="66" rx="16" ry="8" fill="#2EC4A0"/>' +
    '<g class="arm"><path d="M54 -4 Q76 -18 72 -38" fill="none" stroke="#4338CA" stroke-width="13" stroke-linecap="round"/><circle cx="72" cy="-42" r="11" fill="#4338CA"/></g>';
  // Grietas relativas al punto del golpe (se escalan al tamaño de la pantalla)
  var CRACKS = ['M0 0 L54 -24 L108 -16 L176 -42 L260 -30', 'M0 0 L38 50 L52 104 L86 184 L100 260', 'M0 0 L-30 -38 L-52 -82 L-44 -126 L-60 -200', 'M0 0 L-52 14 L-114 4 L-182 30 L-260 20',
    'M0 0 L18 -54 L56 -86 L70 -150', 'M0 0 L-18 58 L-64 90 L-110 150', 'M-10 -10 L10 -14 L14 8 L-8 14 Z'];

  var w, h, layer, g, crackG, tirita, spark, bub, done = false, skip = false;
  function el(tag, attrs, html) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; }
  function q(s) { return g.querySelectorAll(s); }
  function setOp(s, v) { q(s).forEach(function (e) { e.setAttribute('opacity', v); }); }
  function place(x, y, s) { g.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + s + ')'); g._p = [x, y, s]; }
  var tw = function (d, f) { return new Promise(function (r) { if (skip) { f(1); return r(); } var s = performance.now(); (function k(n) { if (skip) { f(1); return r(); } var t = Math.min(1, (n - s) / d); f(t); if (t < 1) requestAnimationFrame(k); else r(); })(s); }); };
  var sleep = function (ms) { return new Promise(function (r) { if (skip) return r(); var id = setTimeout(r, ms); var c = setInterval(function () { if (skip) { clearTimeout(id); clearInterval(c); r(); } }, 50); setTimeout(function () { clearInterval(c); }, ms + 60); }); };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
  function corner() { var mob = w < 640, s = mob ? .34 : .42; return [w - (mob ? 44 : 64), h - (mob ? 58 : 76), s]; }
  function face(kind) { var e = kind === 'oops'; setOp('.eN', e ? 0 : 1); setOp('.eE', e ? 1 : 0); setOp('.mS', e ? 0 : 1); setOp('.mW', e ? 1 : 0); setOp('.dr', e ? 1 : 0); setOp('.ck', e ? 1 : .75); }

  function bubble(html, x, y, intro) {
    bub.className = 'plai-bub' + (intro ? ' intro' : '');
    bub.innerHTML = html;
    bub.style.right = Math.max(10, w - x) + 'px'; bub.style.bottom = Math.max(10, h - y) + 'px';
    requestAnimationFrame(function () { bub.classList.add('show'); });
  }
  function hideBubble() { bub.classList.remove('show'); }
  var lastShow = 0, autoCount = 0, hideTimer = null, mode = '';
  function act(a) {
    hideBubble();
    if (a.go === 'aibb') {
      var f = document.getElementById('hurl') || document.getElementById('url');
      if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { f.focus({ preventScroll: true }); }, 450); }
      else location.href = '/ai-barometer/' + (L() === 'en' ? '?lang=en' : '');
      return;
    }
    var href = a.href;
    if (href.charAt(0) === '#' || href.indexOf('/#') === 0) { var t = document.querySelector(href.replace('/', '')); if (t && HOME) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; } }
    if (L() === 'en' && href.charAt(0) === '/' && href.indexOf('#') < 0) href += (href.indexOf('?') < 0 ? '?' : '&') + 'lang=en';
    location.href = href;
  }
  function closeBtn() { return '<button class="x" type="button" aria-label="' + tr('close') + '">×</button>'; }
  function wire(list) {
    var x = bub.querySelector('.x'); if (x) x.onclick = function (e) { e.stopPropagation(); sput(KEY_OFF, '1'); bub.remove(); layer.remove(); };
    bub.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); act(list[+b.dataset.a]); }; });
  }
  function anchor() { var c = corner(); return [c[0] + 10, c[1] - 52 * c[2] - 8]; }
  // Sugerencia corta (se esconde sola)
  function showTip(t, auto) {
    var c = anchor(), a = t.a ? [t.a] : [];
    bubble(closeBtn() + t[L()] + (t.a ? '<br><a href="#" data-a="0">' + t.a[L()] + '</a>' : ''), c[0], c[1]);
    wire(a); mode = 'tip'; lastShow = Date.now(); hop();
    clearTimeout(hideTimer); hideTimer = setTimeout(function () { if (mode === 'tip' && !bub.matches(':hover')) hideBubble(); }, auto ? 6500 : 9000);
  }
  // Menú al pulsar a Plai: la sugerencia del momento + atajos
  function showMenu() {
    var c = anchor(), t = current();
    // La sugerencia del momento va primero; sin repetir un atajo que lleve al mismo sitio
    var list = (t && t.a ? [t.a] : []).concat(ACTIONS.filter(function (a) { return !(t && t.a && ((a.go && a.go === t.a.go) || (a.href && t.a.href && a.href.replace('/#', '#') === t.a.href.replace('/#', '#')))); }));
    var lab = function (a) { return a[L()].replace(/\s*→$/, ''); };
    bubble(closeBtn() + '<b>' + tr('menu') + '</b>' + (t ? '<div class="pm-tip">' + t[L()] + '</div>' : '') + '<div class="pm">' + list.map(function (a, k) { return '<a href="#" data-a="' + k + '">' + lab(a) + ' →</a>'; }).join('') + '</div>', c[0], c[1]);
    wire(list); mode = 'menu'; clearTimeout(hideTimer);
  }
  function hideBubbleMode() { hideBubble(); mode = ''; }
  function hop() { if (!done || reduce) return; var p = g._p.slice(), s0 = performance.now(); (function k(n) { var t = Math.min(1, (n - s0) / 320); place(p[0], p[1] - 12 * Math.sin(t * Math.PI), p[2]); if (t < 1) requestAnimationFrame(k); })(s0); }
  // Lo que Plai comenta según la sección visible (o el estado del barómetro)
  var visibleSec = null;
  function current() {
    if (AIBB) return aibbTip();
    return (visibleSec && TIPS[visibleSec]) || PAGE_TIP;
  }
  function watchSections() {
    var ids = Object.keys(TIPS); if (!ids.length || !('IntersectionObserver' in window)) return;
    var seen = {}, pend = null;
    // Comenta la sección que está en el centro de la pantalla en ese momento (y no una por la que ya pasó)
    function maybe() {
      pend = null;
      var id = visibleSec; if (!id || !TIPS[id] || seen[id] || autoCount >= 3 || mode === 'menu' || !done) return;
      var wait = 5000 - (Date.now() - lastShow);
      if (wait > 0) { pend = setTimeout(maybe, wait + 200); return; }
      seen[id] = 1; autoCount++; showTip(TIPS[id], true);
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) visibleSec = e.target.id; });
      clearTimeout(pend); pend = setTimeout(maybe, 900);
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    ids.forEach(function (id) { var el2 = document.getElementById(id); if (el2) io.observe(el2); });
  }
  // AI Brand Barometer: reacciona a lo que está pasando
  var aibbState = '';
  function aibbTip() {
    var run = document.getElementById('run'), res = document.getElementById('results'), setup = document.getElementById('setup');
    var caso = /[?&]caso=/.test(location.search);
    if (run && run.textContent.trim()) return { es: 'Investigando… Pregunto a la IA lo que preguntaría un comprador. Puede tardar unos minutos.', en: 'Investigating… I’m asking AI what a buyer would ask. It can take a few minutes.' };
    if (setup && setup.textContent.trim()) return { es: 'Leyendo tu web y buscando a tus competidores…', en: 'Reading your website and finding your competitors…' };
    if (res && res.querySelector('.quad')) return caso
      ? { es: 'Este es el caso McDonald’s. ¿Probamos con tu marca?', en: 'This is the McDonald’s case. Shall we try your brand?', a: { es: 'Analizar mi marca →', en: 'Analyze my brand →', href: '/ai-barometer/' } }
      : { es: '¡Listo! Toca una burbuja del mapa para ver su ficha, y prueba el “Resumen para tu CEO”.', en: 'Done! Tap a bubble on the map to see its card, and try the “Summary for your CEO”.' };
    return PAGE_TIP;
  }
  function watchAibb() {
    var check = function () {
      var t = aibbTip(), k = t.es; if (k === aibbState) return; aibbState = k;
      if (done && mode !== 'menu') showTip(t, true);
    };
    ['run', 'results', 'setup'].forEach(function (id) { var n = document.getElementById(id); if (n) new MutationObserver(function () { clearTimeout(watchAibb._t); watchAibb._t = setTimeout(check, 600); }).observe(n, { childList: true }); });
    setTimeout(check, 1200);
  }
  function build() {
    w = innerWidth; h = innerHeight;
    layer = el('svg', { id: 'plai-layer', viewBox: '0 0 ' + w + ' ' + h, 'aria-hidden': 'true' });
    crackG = el('g', { stroke: '#5A5F86', 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 });
    tirita = el('g', { opacity: 0 }, '<rect x="-52" y="-15" width="104" height="30" rx="15" fill="#FFC2AE"/><rect x="-15" y="-11" width="30" height="22" rx="5" fill="#FF7A59" opacity=".55"/><circle cx="-34" cy="-5" r="2" fill="#E8907A"/><circle cx="-26" cy="5" r="2" fill="#E8907A"/><circle cx="28" cy="-5" r="2" fill="#E8907A"/><circle cx="36" cy="5" r="2" fill="#E8907A"/>');
    spark = el('g', { opacity: 0 });
    g = el('g', { class: 'pb', tabindex: '-1' }, PLAI);
    layer.appendChild(crackG); layer.appendChild(g); layer.appendChild(tirita); layer.appendChild(spark);
    document.body.appendChild(layer);
    bub = document.createElement('div'); bub.className = 'plai-bub'; bub.setAttribute('role', 'status'); document.body.appendChild(bub);
    g.addEventListener('click', function (e) { if (!done) return; e.stopPropagation(); if (bub.classList.contains('show') && mode === 'menu') hideBubbleMode(); else showMenu(); });
    addEventListener('resize', function () {
      w = innerWidth; h = innerHeight; layer.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      if (done) { var c = corner(); place(c[0], c[1], c[2]); if (bub.classList.contains('show')) hideBubbleMode(); }
    });
  }

  async function intro() {
    var mob = w < 640, S = mob ? .95 : 1.25, cx = w / 2, cy = Math.min(h * .55, h - 150 * S);
    var fx = cx + 72 * S, fy = cy - 42 * S, k = Math.max(w, h) / 620;
    // Grietas desde el punto del golpe, a escala de la pantalla
    crackG.innerHTML = CRACKS.map(function (d) { return '<path pathLength="1" d="' + d + '" transform="translate(' + fx + ' ' + fy + ') scale(' + k + ')" vector-effect="non-scaling-stroke" style="stroke-dasharray:1;stroke-dashoffset:1"/>'; }).join('');
    spark.innerHTML = [[fx + 60, fy - 54, '#F5B544', 1.2], [fx - 50, fy + 40, '#2EC4A0', 1], [fx + 30, fy + 34, '#8B8CF8', .9]].map(function (s) { return '<path d="M0 -12 l4 8 8 4 -8 4 -4 8 -4 -8 -8 -4 8 -4z" fill="' + s[2] + '" transform="translate(' + s[0] + ' ' + s[1] + ') scale(' + s[3] + ')"/>'; }).join('');
    place(cx, cy + 50, S * .3); g.setAttribute('opacity', 0);
    await tw(250, function (t) { g.setAttribute('opacity', t); });
    // Se acerca al cristal
    await tw(850, function (t) { var e = ease(t); place(cx, cy + 50 - 50 * e, S * (.3 + .7 * e)); });
    // Toc, toc, toc
    for (var i = 0; i < 3; i++) {
      await tw(110, function (t) { place(cx, cy, S * (1 + .06 * t)); });
      await tw(140, function (t) { place(cx, cy, S * (1.06 - .06 * t)); });
      if (i < 2) await sleep(170);
    }
    // ¡Crac!
    crackG.setAttribute('opacity', 1);
    var paths = crackG.querySelectorAll('path');
    var shakeEl = document.querySelector('main') || document.body;
    tw(340, function (t) { paths.forEach(function (p) { p.style.strokeDashoffset = 1 - ease(t); }); });
    await tw(340, function (t) { var a = (1 - t) * 7; shakeEl.style.transform = t < 1 ? 'translate(' + (Math.sin(t * 40) * a).toFixed(1) + 'px,' + (Math.cos(t * 36) * a).toFixed(1) + 'px)' : ''; });
    shakeEl.style.transform = '';
    // Vergüenza
    face('oops'); bubble(tr('ups'), cx + 60 * S, cy - 80 * S, true);
    await tw(450, function (t) { place(cx, cy + 6 * t, S * (1 - .04 * t)); });
    await sleep(800);
    // La arregla con una tirita
    hideBubble(); await sleep(120); bubble(tr('fix'), cx + 60 * S, cy - 80 * S, true);
    tirita.setAttribute('opacity', 1);
    await tw(380, function (t) { tirita.setAttribute('transform', 'translate(' + fx + ' ' + fy + ') rotate(-22) scale(' + (ease(t) * k * .9).toFixed(3) + ')'); });
    await sleep(500);
    spark.setAttribute('opacity', 1);
    await tw(520, function (t) { crackG.setAttribute('opacity', 1 - t); tirita.setAttribute('opacity', 1 - t); spark.setAttribute('opacity', t < .5 ? 1 : 2 - 2 * t); });
    face('ok'); hideBubble(); await sleep(100); bubble(tr('ok'), cx + 60 * S, cy - 80 * S, true);
    await sleep(700); hideBubble();
    // A su esquina
    var c = corner(), from = g._p;
    await tw(750, function (t) { var e = ease(t); place(from[0] + (c[0] - from[0]) * e, from[1] + (c[1] - from[1]) * e, from[2] + (c[2] - from[2]) * e); });
  }
  function finish() {
    skip = true; done = true;
    crackG.setAttribute('opacity', 0); tirita.setAttribute('opacity', 0); spark.setAttribute('opacity', 0);
    var mn = document.querySelector('main'); if (mn) mn.style.transform = ''; face('ok'); g.setAttribute('opacity', 1);
    var c = corner(); place(c[0], c[1], c[2]);
    g.setAttribute('role', 'button'); g.setAttribute('tabindex', '0'); g.setAttribute('aria-label', tr('cta'));
    g.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (bub.classList.contains('show') && mode === 'menu') hideBubbleMode(); else showMenu(); } };
    g.setAttribute('aria-label', tr('menu'));
    hideBubble();
    if (AIBB) { watchAibb(); return; }
    setTimeout(function () { showTip(current(), false); }, 350);
    watchSections();
  }

  function start() {
    build();
    var first = get(KEY_INTRO) !== '1';
    if (!HOME || !first || reduce) { finish(); return; }
    put(KEY_INTRO, '1');
    var stop = function () { if (!skip) { skip = true; } };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { addEventListener(ev, stop, { once: true, passive: true }); });
    intro().then(finish, finish);
  }
  // Espera a que la página se vea y a que el visitante haya respondido al aviso de cookies (si aparece)
  function ready() {
    var cc = document.getElementById('plg-cc');
    var visible = function () { cc = document.getElementById('plg-cc'); return !!(cc && cc.querySelector('.cc-box')); };
    if (!visible()) { setTimeout(start, 1600); return; }
    var iv = setInterval(function () { if (!visible()) { clearInterval(iv); setTimeout(start, 900); } }, 400);
  }
  if (document.readyState === 'complete') ready(); else addEventListener('load', ready);
})();
