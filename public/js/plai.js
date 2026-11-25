/* Plai, la mascota-agente de plaiground.
   - Primera visita a la home: golpea la pantalla desde dentro, la raja, se avergüenza, la arregla y se va a su esquina.
   - Cuenta una historia que avanza con la navegación: cada sección tiene su mensaje, aparece al llegar, desaparece al salir y no se repite.
   - Vive: pestañea, sigue el cursor con los ojos, se ríe con las cosquillas, piensa cuando el barómetro trabaja y salta cuando tiene algo que contar.
   - La × cierra el bocadillo y silencia los comentarios automáticos; Plai se queda y al pulsarlo abre su menú.
   - Solo en escritorio (pantalla ancha con ratón). Respeta prefers-reduced-motion y no aparece al imprimir. */
(function () {
  'use strict';
  var KEY_INTRO = 'plg-plai-intro', KEY_MUTE = 'plg-plai-mute';
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var put = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } };
  var sget = function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  var sput = function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } };
  var H = document.documentElement, NS = 'http://www.w3.org/2000/svg';
  var PATH = location.pathname, HOME = PATH === '/' || PATH === '/index.html', AIBB = PATH.indexOf('/ai-barometer') === 0, DATA = PATH === '/data/' || PATH === '/data/index.html';
  var CASE = AIBB && /[?&]caso=/.test(location.search);
  var L = function () { return H.getAttribute('data-lang') === 'en' ? 'en' : 'es'; };
  var X = function (o) { return o[L()]; };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = window.matchMedia && matchMedia('(hover: none)').matches;

  // ---------- textos ----------
  var T = {
    ups: { es: '¡Ups! Perdón…', en: 'Oops! Sorry…' },
    fix: { es: 'Tranqui, lo arreglo', en: 'Don’t worry, I’ll fix it' },
    ok: { es: '¡Como nuevo!', en: 'Good as new!' },
    menu: { es: '¿En qué te ayudo?', en: 'How can I help?' },
    close: { es: 'Cerrar el mensaje', en: 'Close the message' },
    mute: { es: 'Que Plai no comente', en: 'Mute Plai’s tips' },
    unmute: { es: 'Que Plai vuelva a comentar', en: 'Turn Plai’s tips back on' },
    back: { es: '¡Bien! Vuelvo a comentar', en: 'Yay! I’m back' },
    tickle: [{ es: '¡Jiji, cosquillas!', en: 'Hehe, that tickles!' }, { es: '¡Ay, para, para!', en: 'Stop, stop!' }, { es: 'Soy muy cosquilloso…', en: 'I’m very ticklish…' }],
    demo: { es: '¡Mira cómo cambian los KPIs y el plan! Mismo dato, otra historia.', en: 'See how the KPIs and the plan change! Same data, a different story.' }
  };
  var ACTIONS = [
    { es: 'Analizar mi marca en la IA', en: 'Analyze my brand in AI', go: 'aibb' },
    { es: 'Convertir mis datos en decisiones', en: 'Turn my data into decisions', href: '/data/' },
    { es: 'Ver el caso McDonald’s', en: 'See the McDonald’s case', href: '/ai-barometer/?caso=mcdonalds-es' },
    { es: 'Hablar con Matías', en: 'Talk to Matías', href: '/#contacto' }
  ];
  // Historia de la home: cada sección suma una idea nueva hasta entender qué es plaiground
  var STORY = HOME ? {
    hero: { es: '¡Hola! Soy Plai y te acompaño por el plaiground. Empieza por lo fácil: escribe tu web arriba y te cuento qué dice la IA de tu marca.', en: 'Hi! I’m Plai and I’ll walk you through the plaiground. Start with the easy part: type your website above and I’ll tell you what AI says about your brand.' },
    'ai-barometer': { es: 'Cada vez más compradores preguntan a ChatGPT o Gemini antes de elegir. Si la IA no te nombra, para ellos no existes. Esto lo mide gratis.', en: 'More and more buyers ask ChatGPT or Gemini before choosing. If AI doesn’t name you, you don’t exist for them. This measures it, free.', a: { es: 'Medir mi marca →', en: 'Measure my brand →', go: 'aibb' } },
    data: { es: 'La otra herramienta: subes un Excel de campañas y no te devuelvo gráficos, te digo qué hacer y por qué.', en: 'The other tool: upload a campaign spreadsheet and I don’t give you charts, I tell you what to do and why.', a: { es: 'Subir mis datos →', en: 'Upload my data →', href: '/data/' } },
    lab: { es: '¿Funciona de verdad? McDonald’s lidera en la IA, pero Goiko le gana cuando se pregunta por precio. Eso no lo ve un informe de SEO.', en: 'Does it really work? McDonald’s leads in AI, but Goiko beats it when people ask about price. No SEO report shows that.', a: { es: 'Ver el caso →', en: 'See the case →', href: '/ai-barometer/?caso=mcdonalds-es' } },
    enfoque: { es: 'Por eso aquí todo se juega: lo que se puede tocar se recuerda, se comparte… y deja datos para decidir mejor.', en: 'That’s why everything here is playable: what you can touch gets remembered, shared… and leaves data for better decisions.' },
    servicios: touch
      ? { es: 'Y si quieres ir más allá de las herramientas, aquí entra Matías: convierte lo que has visto en un plan para tu marca.', en: 'And if you want to go beyond the tools, this is where Matías comes in: he turns what you’ve seen into a plan for your brand.' }
      : { es: 'Y si quieres ir más allá, aquí entra Matías. Pasa el ratón por un servicio y te pongo un ejemplo real.', en: 'And if you want to go further, this is where Matías comes in. Hover over a service and I’ll show you a real example.' },
    metodo: { es: 'Sin humo: primero se mide, después se decide. La IA acelera, pero el criterio lo pone una persona.', en: 'No smoke and mirrors: measure first, then decide. AI speeds things up, but a person brings the judgement.' },
    'sobre-mi': { es: '15 años entre marcas, datos y negocio. Y sí: su CV es un festival de música.', en: '15 years across brands, data and business. And yes: his CV is a music festival.', a: { es: 'Entrar al festival →', en: 'Enter the festival →', href: '/cv/' } },
    contacto: { es: 'Último paso: cuéntale tu reto en cuatro toques. Te responde en menos de 48 h.', en: 'Last step: tell him your challenge in four taps. He replies within 48 h.' }
  } : DATA ? {
    hero: { es: '¡Hola! Soy Plai. Aquí un Excel de campañas se convierte en un informe que dirección entiende. Baja a la demo y juega con ella.', en: 'Hi! I’m Plai. Here a campaign spreadsheet becomes a report leadership understands. Scroll to the demo and play with it.', a: { es: 'Ir a la demo →', en: 'Go to the demo →', href: '#demo' } },
    como: { es: 'No es un generador de gráficos: primero entiendo tu negocio y a quién se lo vas a presentar, y después decido qué contar.', en: 'It’s not a chart generator: first I understand your business and who you’ll present to, then I decide what to tell.' },
    demo: { es: 'Prueba a cambiar el tipo de empresa o el público: el mismo dato se cuenta distinto a dirección que a inversores.', en: 'Try changing the company type or the audience: the same data is told differently to leadership than to investors.' },
    resultado: { es: 'Lo que más gusta a dirección: el plan de acción priorizado por impacto y esfuerzo.', en: 'What leadership likes most: the action plan, prioritised by impact and effort.' },
    'para-quien': { es: '¿Tienes los datos pero no el tiempo? Esto es justo para ti.', en: 'Got the data but not the time? This is exactly for you.' },
    confianza: { es: 'Tranquilidad: tus datos no se usan para entrenar modelos y los archivos se borran después de procesarlos.', en: 'Peace of mind: your data isn’t used to train models and files are deleted after processing.' },
    acceso: { es: 'Entra con tu email, sin contraseña, y en unos minutos lo tienes en pantalla y en tu correo.', en: 'Sign in with your email, no password, and in minutes it’s on screen and in your inbox.' }
  } : {};
  // Ejemplos al pasar por cada servicio (home)
  var SVC = [
    { es: 'Ejemplo GEO: en el caso McDonald’s vimos que se pierde en las preguntas de precio. Saber dónde te pierdes es el primer paso para aparecer.', en: 'GEO example: in the McDonald’s case we saw it drops out on price questions. Knowing where you drop out is step one to showing up.', a: { es: 'Ver el caso →', en: 'See the case →', href: '/ai-barometer/?caso=mcdonalds-es' } },
    { es: 'Ejemplo: «SEO aporta el 22% de las ventas con el 9% de la inversión» y la acción que sale de ahí: mover presupuesto hacia SEO.', en: 'Example: “SEO drives 22% of sales with 9% of the spend” and the action that follows: move budget towards SEO.', a: { es: 'Probar Data →', en: 'Try Data →', href: '/data/' } },
    { es: 'Ejemplo: el Franchise Brand Barometer compara 41 franquicias de cine con un índice propio. Un estudio así se comparte solo.', en: 'Example: the Franchise Brand Barometer compares 41 film franchises with its own index. A study like that shares itself.', a: { es: 'Verlo →', en: 'See it →', href: '/barometer/' } },
    { es: 'Ejemplo: un mapa de dónde la IA le ahorra horas a tu equipo y dónde te trae clientes, con campañas que lo demuestran.', en: 'Example: a map of where AI saves your team hours and where it brings you customers, with campaigns that prove it.', a: { es: 'Contar mi reto →', en: 'Tell my challenge →', href: '#contacto' } }
  ];
  // AI Brand Barometer: lo que está pasando y cada parte del informe
  var AIBB_T = {
    idle: { es: 'Pon tu web arriba: la leo, detecto a tus competidores y pregunto a la IA lo que preguntaría un comprador.', en: 'Enter your website above: I read it, spot your competitors and ask AI what a buyer would ask.' },
    setup: { es: 'Leyendo tu web y buscando a tus competidores…', en: 'Reading your website and finding your competitors…' },
    run: { es: 'Investigando: 10 preguntas de compradores, de «¿qué opciones hay?» a «¿qué problemas tiene?». Si no quieres esperar, déjame tu email arriba y te aviso.', en: 'Investigating: 10 buyer questions, from “what are my options?” to “what problems does it have?”. If you don’t want to wait, leave your email above and I’ll let you know.' },
    top: { es: '¡Listo! Tu puntuación de 0 a 100 mezcla tres cosas: si apareces, en qué puesto y cuánto se habla de ti.', en: 'Done! Your 0–100 score blends three things: whether you appear, in what position and how much you’re talked about.' },
    caseTop: { es: 'Esto es un caso real: McDonald’s en España, con las respuestas reales de Gemini. ¿Probamos luego con tu marca?', en: 'This is a real case: McDonald’s in Spain, with Gemini’s real answers. Shall we try your brand afterwards?', a: { es: 'Analizar mi marca →', en: 'Analyze my brand →', href: '/ai-barometer/' } },
    quad: { es: 'Tu mapa: a la derecha, más visible; arriba, mejor tono. Pasa por cada marca para ver su ficha.', en: 'Your map: further right, more visible; higher up, better tone. Hover each brand to see its card.' },
    funnel: { es: 'Aquí está el «ajá»: en qué momento de la compra te pierdes. Ahí está la oportunidad.', en: 'Here’s the “aha”: at which moment of the purchase you drop out. That’s where the opportunity is.' },
    rep: { es: 'Esto es lo que lee un comprador que duda. Si hay críticas, mejor que las sepas tú primero.', en: 'This is what a hesitant buyer reads. If there are criticisms, better you know them first.' },
    plan: { es: 'Y lo que importa: qué hacer. Si lo necesitas para dirección, arriba tienes el «Resumen para tu CEO».', en: 'And what matters: what to do. If you need it for leadership, the “Summary for your CEO” is at the top.' }
  };
  var DEFAULT = HOME ? STORY.hero : AIBB ? AIBB_T.idle : DATA ? STORY.como : { es: '¿Te ayudo?', en: 'Can I help?' };

  // ---------- estilos ----------
  var css = document.createElement('style');
  css.textContent =
    '#plai-layer{position:fixed;inset:0;width:100vw;height:100vh;z-index:70;pointer-events:none;overflow:visible}' +
    '#plai-layer .pb{pointer-events:auto;cursor:pointer}#plai-layer .pb:focus{outline:none}' +
    '#plai-layer .pg{transform-box:fill-box;transform-origin:center;animation:plaiPulse 2.4s ease-in-out infinite}' +
    '#plai-layer.think .pg{animation-duration:.8s}' +
    '@keyframes plaiPulse{0%,100%{opacity:.15;transform:scale(.8)}50%{opacity:.6;transform:scale(1.25)}}' +
    '@media (prefers-reduced-motion:reduce){#plai-layer .pg{animation:none;opacity:.35}}' +
    '.plai-bub{position:fixed;z-index:71;max-width:270px;padding:12px 14px 12px 16px;border-radius:18px 18px 6px 18px;background:var(--paper,#fff);color:var(--ink,#14162E);border:1px solid var(--line,rgba(20,22,46,.12));box-shadow:0 18px 44px rgba(20,22,46,.18);font:600 14px/1.4 var(--body,system-ui,sans-serif);opacity:0;transform:translateY(6px) scale(.97);transform-origin:100% 100%;transition:opacity .22s,transform .22s;pointer-events:none}' +
    '.plai-bub.show{opacity:1;transform:none;pointer-events:auto}' +
    '.plai-bub a{display:inline-block;margin-top:6px;color:var(--ind,#4338CA);font-weight:800;text-decoration:none}.plai-bub a:hover{text-decoration:underline}' +
    '.plai-bub .x{position:absolute;top:-9px;right:-9px;width:24px;height:24px;border-radius:50%;border:1px solid var(--line,rgba(20,22,46,.12));background:var(--paper,#fff);color:var(--muted,#555A7A);font:700 13px/1 system-ui;cursor:pointer;display:grid;place-items:center}' +
    '.plai-bub.intro{border-radius:18px;text-align:center}.plai-bub.mini{padding:8px 14px;text-align:center}' +
    '.plai-bub b{display:block;font-weight:800;margin-bottom:4px}.plai-bub .pm-tip{font-weight:500;color:var(--muted,#555A7A);font-size:13.5px;margin:2px 0 8px}' +
    '.plai-bub .pm{display:flex;flex-direction:column;gap:2px}.plai-bub .pm a{margin:0;padding:6px 0;border-top:1px solid var(--line,rgba(20,22,46,.1))}' +
    '.plai-bub .pm-mute{display:block;margin-top:6px;background:none;border:0;padding:0;color:var(--muted,#555A7A);font:600 12.5px var(--body,system-ui);cursor:pointer;text-decoration:underline}' +
    '@media print{#plai-layer,.plai-bub{display:none!important}}' +
    '@media (max-width:899px){#plai-layer,.plai-bub{display:none!important}}';
  document.head.appendChild(css);

  // ---------- dibujo (centro en 0,0) ----------
  var EYE = function (cx) { return '<ellipse cx="' + cx + '" cy="-16" rx="14" ry="16" fill="#fff"/>'; };
  var PLAI =
    '<ellipse cx="0" cy="74" rx="58" ry="8" fill="#8A8FB5" opacity=".25"/>' +
    '<line x1="0" y1="-64" x2="8" y2="-98" stroke="#4338CA" stroke-width="6" stroke-linecap="round"/>' +
    '<circle class="pg" cx="10" cy="-104" r="17" fill="none" stroke="#FF7A59" stroke-width="2.5"/>' +
    '<circle cx="10" cy="-104" r="10" fill="#FF7A59"/>' +
    '<path d="M-56 10 Q-74 26 -66 44" fill="none" stroke="#4338CA" stroke-width="13" stroke-linecap="round"/>' +
    '<rect x="-62" y="-64" width="124" height="128" rx="58" fill="#4338CA"/>' +
    '<ellipse cx="0" cy="24" rx="40" ry="30" fill="#8B8CF8" opacity=".55"/>' +
    '<g class="eN"><g class="lid">' + EYE(-22) + EYE(22) + '<g class="pp"><circle cx="-20" cy="-14" r="6.5" fill="#14162E"/><circle cx="24" cy="-14" r="6.5" fill="#14162E"/><circle cx="-18" cy="-17" r="2.2" fill="#fff"/><circle cx="26" cy="-17" r="2.2" fill="#fff"/></g></g></g>' +
    '<g class="eE" opacity="0"><path d="M-34 -22 L-14 -14 L-34 -6" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M34 -22 L14 -14 L34 -6" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>' +
    '<g class="eH" opacity="0"><path d="M-34 -12 Q-22 -26 -10 -12" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M10 -12 Q22 -26 34 -12" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></g>' +
    '<ellipse class="ck" cx="-38" cy="6" rx="8" ry="5" fill="#FF7A59" opacity=".75"/><ellipse class="ck" cx="38" cy="6" rx="8" ry="5" fill="#FF7A59" opacity=".75"/>' +
    '<path class="mS" d="M-12 10 Q0 22 12 10" fill="none" stroke="#14162E" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path class="mW" d="M-14 14 q5 -6 10 0 t10 0 t8 0" fill="none" stroke="#14162E" stroke-width="3.5" stroke-linecap="round" opacity="0"/>' +
    '<path class="mL" d="M-14 8 Q0 30 14 8 Z" fill="#14162E" opacity="0"/>' +
    '<ellipse class="mO" cx="0" cy="15" rx="6" ry="7" fill="#14162E" opacity="0"/>' +
    '<path class="dr" d="M54 -46 q8 12 0 18 q-8 -6 0 -18z" fill="#7CC4F8" opacity="0"/>' +
    '<ellipse cx="-22" cy="66" rx="16" ry="8" fill="#2EC4A0"/><ellipse cx="22" cy="66" rx="16" ry="8" fill="#2EC4A0"/>' +
    '<g class="arm"><path d="M54 -4 Q76 -18 72 -38" fill="none" stroke="#4338CA" stroke-width="13" stroke-linecap="round"/><circle cx="72" cy="-42" r="11" fill="#4338CA"/></g>';
  var CRACKS = ['M0 0 L54 -24 L108 -16 L176 -42 L260 -30', 'M0 0 L38 50 L52 104 L86 184 L100 260', 'M0 0 L-30 -38 L-52 -82 L-44 -126 L-60 -200', 'M0 0 L-52 14 L-114 4 L-182 30 L-260 20',
    'M0 0 L18 -54 L56 -86 L70 -150', 'M0 0 L-18 58 L-64 90 L-110 150', 'M-10 -10 L10 -14 L14 8 L-8 14 Z'];

  var w, h, layer, g, crackG, tirita, spark, bub, done = false, skip = false, busy = false;
  var muted = sget(KEY_MUTE) === '1';
  function el(tag, attrs, html) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; }
  function q(s) { return g.querySelectorAll(s); }
  function setOp(s, v) { q(s).forEach(function (e) { e.setAttribute('opacity', v); }); }
  function place(x, y, s, rot) { g.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + s + ')' + (rot ? ' rotate(' + rot.toFixed(2) + ')' : '')); g._p = [x, y, s]; }
  var tw = function (d, f) { return new Promise(function (r) { if (skip) { f(1); return r(); } var s = performance.now(); (function k(n) { if (skip) { f(1); return r(); } var t = Math.min(1, (n - s) / d); f(t); if (t < 1) requestAnimationFrame(k); else r(); })(s); }); };
  var anim = function (d, f, cb) { var s = performance.now(); (function k(n) { var t = Math.min(1, (n - s) / d); f(t); if (t < 1) requestAnimationFrame(k); else if (cb) cb(); })(s); };
  var sleep = function (ms) { return new Promise(function (r) { if (skip) return r(); var id = setTimeout(r, ms); var c = setInterval(function () { if (skip) { clearTimeout(id); clearInterval(c); r(); } }, 50); setTimeout(function () { clearInterval(c); }, ms + 60); }); };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
  function corner() { var mob = w < 640, s = mob ? .34 : .42; return [w - (mob ? 44 : 64), h - (mob ? 58 : 76), s]; }

  // ---------- expresiones ----------
  var faceNow = 'ok';
  function face(kind) {
    faceNow = kind;
    setOp('.eN', kind === 'ok' || kind === 'think' || kind === 'wow' ? 1 : 0);
    setOp('.eE', kind === 'oops' ? 1 : 0);
    setOp('.eH', kind === 'happy' ? 1 : 0);
    setOp('.mS', kind === 'ok' || kind === 'think' ? 1 : 0);
    setOp('.mW', kind === 'oops' ? 1 : 0);
    setOp('.mL', kind === 'happy' ? 1 : 0);
    setOp('.mO', kind === 'wow' ? 1 : 0);
    setOp('.dr', kind === 'oops' ? 1 : 0);
    setOp('.ck', kind === 'oops' || kind === 'happy' ? 1 : .75);
    if (layer) layer.classList.toggle('think', kind === 'think');
    if (kind === 'think') look(-3, -5);
  }
  function look(dx, dy) { var pp = g && g.querySelector('.pp'); if (pp) pp.setAttribute('transform', 'translate(' + dx.toFixed(1) + ' ' + dy.toFixed(1) + ')'); }
  function lidTo(s) { var lid = g.querySelector('.lid'); if (s >= .999) lid.removeAttribute('transform'); else lid.setAttribute('transform', 'translate(0 -16) scale(1 ' + s.toFixed(3) + ') translate(0 16)'); }
  function blink() {
    if (!done || (faceNow !== 'ok' && faceNow !== 'think')) return schedBlink();
    anim(150, function (t) { lidTo(1 - Math.sin(t * Math.PI) * .92); }, function () {
      lidTo(1);
      if (Math.random() < .25) setTimeout(function () { anim(140, function (t) { lidTo(1 - Math.sin(t * Math.PI) * .92); }, function () { lidTo(1); }); }, 180);
      schedBlink();
    });
  }
  function schedBlink() { setTimeout(blink, 2200 + Math.random() * 3800); }
  // Los ojos siguen al cursor
  var raf = 0;
  function trackEyes(e) {
    if (!done || faceNow === 'think' || raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0; var p = g._p; if (!p) return;
      var dx = e.clientX - p[0], dy = e.clientY - (p[1] - 16 * p[2]), d = Math.sqrt(dx * dx + dy * dy) || 1, m = Math.min(5, d / 40);
      look(dx / d * m, dy / d * m * .8);
    });
  }
  function hop() { if (!done || reduce || busy) return; var p = g._p.slice(); anim(320, function (t) { place(p[0], p[1] - 12 * Math.sin(t * Math.PI), p[2]); }); }
  // Cosquillas al pasar el ratón por encima
  var tickles = 0, tickling = false;
  function tickle() {
    if (!done || tickling || busy) return; tickling = true;
    var prev = faceNow, p = g._p.slice(); face('happy');
    if (!(bub.classList.contains('show') && mode !== 'mini')) mini(X(T.tickle[tickles++ % T.tickle.length]));
    anim(reduce ? 1 : 700, function (t) { place(p[0], p[1] - 3 * Math.abs(Math.sin(t * Math.PI * 4)), p[2], reduce ? 0 : 7 * Math.sin(t * Math.PI * 6) * (1 - t)); }, function () {
      place(p[0], p[1], p[2]); setTimeout(function () { face(prev === 'happy' || prev === 'wow' ? 'ok' : prev); tickling = false; if (mode === 'mini') hideBubble(); }, 650);
    });
  }

  // ---------- bocadillos ----------
  var mode = '', tipKey = '', hideTimer = null;
  function bubble(html, x, y, cls) {
    bub.className = 'plai-bub' + (cls ? ' ' + cls : '');
    bub.innerHTML = html;
    bub.style.right = Math.max(10, w - x) + 'px'; bub.style.bottom = Math.max(10, h - y) + 'px';
    requestAnimationFrame(function () { bub.classList.add('show'); });
  }
  function hideBubble() { bub.classList.remove('show'); mode = ''; tipKey = ''; clearTimeout(hideTimer); }
  function anchor() { var c = corner(); return [c[0] + 10, c[1] - 52 * c[2] - 8]; }
  function mini(text) { var c = anchor(); bubble(text, c[0], c[1], 'mini'); mode = 'mini'; }
  function act(a) {
    hideBubble(); if (window.plgTrack) plgTrack('plai_go');
    if (a.go === 'aibb') {
      var f = document.getElementById('hurl') || document.getElementById('url');
      if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { f.focus({ preventScroll: true }); }, 450); }
      else location.href = '/ai-barometer/' + (L() === 'en' ? '?lang=en' : '');
      return;
    }
    var href = a.href;
    if (href.charAt(0) === '#' || href.indexOf('/#') === 0) { var t = document.querySelector(href.replace('/', '')); if (t && (HOME || href.charAt(0) === '#')) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; } }
    if (L() === 'en' && href.charAt(0) === '/' && href.indexOf('#') < 0) href += (href.indexOf('?') < 0 ? '?' : '&') + 'lang=en';
    location.href = href;
  }
  var closeBtn = function () { return '<button class="x" type="button" aria-label="' + X(T.close) + '">×</button>'; };
  function wire(list, isMenu) {
    var x = bub.querySelector('.x');
    // La × cierra el bocadillo; en una sugerencia, además, Plai deja de comentar solo (sigue ahí para abrir su menú)
    if (x) x.onclick = function (e) { e.stopPropagation(); if (!isMenu) { muted = true; sput(KEY_MUTE, '1'); } hideBubble(); };
    bub.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); act(list[+b.dataset.a]); }; });
    var m = bub.querySelector('.pm-mute'); if (m) m.onclick = function (e) { e.stopPropagation(); muted = !muted; sput(KEY_MUTE, muted ? '1' : '0'); hideBubble(); if (!muted) { face('happy'); mini(X(T.back)); setTimeout(function () { face('ok'); if (mode === 'mini') hideBubble(); }, 1600); } };
  }
  // Sugerencia ligada a una sección (key); se esconde al salir de ella o pasado un rato
  function showTip(t, key, ms) {
    if (!t || busy) return;
    var c = anchor();
    bubble(closeBtn() + X(t) + (t.a ? '<br><a href="#" data-a="0">' + X(t.a) + '</a>' : ''), c[0], c[1]);
    wire(t.a ? [t.a] : [], false); mode = 'tip'; tipKey = key || ''; hop();
    clearTimeout(hideTimer); hideTimer = setTimeout(function () { if (mode === 'tip' && tipKey === key && !bub.matches(':hover')) hideBubble(); }, ms || 14000);
  }
  function showMenu() {
    var c = anchor(), t = current();
    var list = (t && t.a ? [t.a] : []).concat(ACTIONS.filter(function (a) { return !(t && t.a && ((a.go && a.go === t.a.go) || (a.href && t.a.href && a.href.replace('/#', '#') === t.a.href.replace('/#', '#')))); }));
    var lab = function (a) { return X(a).replace(/\s*→$/, ''); };
    bubble(closeBtn() + '<b>' + X(T.menu) + '</b>' + (t ? '<div class="pm-tip">' + X(t) + '</div>' : '') + '<div class="pm">' + list.map(function (a, k) { return '<a href="#" data-a="' + k + '">' + lab(a) + ' →</a>'; }).join('') + '</div><button class="pm-mute" type="button">' + X(muted ? T.unmute : T.mute) + '</button>', c[0], c[1]);
    wire(list, true); mode = 'menu'; clearTimeout(hideTimer); if (window.plgTrack) plgTrack('plai_menu');
    face('wow'); setTimeout(function () { if (faceNow === 'wow') face('ok'); }, 700);
  }

  // ---------- historia según la navegación ----------
  var active = null, seen = {};
  function current() { if (AIBB) return aibbNow(); return (active && STORY[active]) || DEFAULT; }
  function onSection(id) {
    if (id === active) return;
    active = id;
    if (mode === 'tip' && tipKey && tipKey !== id) hideBubble();   // lo anterior ya no es relevante
    clearTimeout(onSection._t);
    onSection._t = setTimeout(function () {
      if (active !== id || muted || !done || mode === 'menu' || seen[id] || !STORY[id]) return;
      seen[id] = 1; showTip(STORY[id], id);
    }, 900);
  }
  function watchStory() {
    var ids = Object.keys(STORY); if (!ids.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) onSection(e.target.getAttribute('data-plai')); }); }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    ids.forEach(function (id) { var n = id === 'hero' ? document.querySelector('.hero') : document.getElementById(id); if (n) { n.setAttribute('data-plai', id); io.observe(n); } });
  }
  // Servicios: un ejemplo real al pasar el ratón por cada uno
  function watchServices() {
    if (!HOME || touch) return;
    document.querySelectorAll('#servicios .svc').forEach(function (card, k) {
      var t0;
      card.addEventListener('mouseenter', function () { clearTimeout(t0); t0 = setTimeout(function () { if (!muted && done && mode !== 'menu' && SVC[k]) { face('wow'); setTimeout(function () { if (faceNow === 'wow') face('ok'); }, 500); showTip(SVC[k], 'servicios', 12000); } }, 450); });
      card.addEventListener('mouseleave', function () { clearTimeout(t0); });
    });
  }
  // Data: reacciona cuando se prueba la demo
  function watchData() {
    if (!DATA) return; var said = false, demo = document.getElementById('demo'); if (!demo) return;
    var react = function () { if (said || muted || !done) return; said = true; face('happy'); setTimeout(function () { face('ok'); }, 900); showTip(T.demo, 'demo', 9000); };
    demo.addEventListener('change', react, true);
    demo.addEventListener('click', function (e) { if (e.target.closest('button,[role="tab"],label')) react(); }, true);
  }
  // AI Brand Barometer: estado del análisis + cada parte del informe
  var aState = '', aSeen = {};
  function aibbNow() {
    var run = document.getElementById('run'), res = document.getElementById('results'), setup = document.getElementById('setup');
    if (run && run.textContent.trim()) return AIBB_T.run;
    if (setup && setup.textContent.trim() && !(res && res.textContent.trim())) return AIBB_T.setup;
    if (res && res.textContent.trim()) return (active && AIBB_T[active]) || (CASE ? AIBB_T.caseTop : AIBB_T.top);
    return AIBB_T.idle;
  }
  function watchAibb() {
    var res = document.getElementById('results');
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; var k = e.target.getAttribute('data-plai'); if (k === active) return; active = k;
        if (mode === 'tip' && tipKey && tipKey !== 'r-' + k && tipKey.indexOf('r-') === 0) hideBubble();
        clearTimeout(watchAibb._s); watchAibb._s = setTimeout(function () { if (active !== k || muted || mode === 'menu' || aSeen[k]) return; aSeen[k] = 1; showTip(AIBB_T[k], 'r-' + k); }, 900);
      });
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 }) : null;
    function tagResults() {
      if (!io || !res) return;
      [['quad', '.quad'], ['funnel', '.hm.fn'], ['rep', '.rep'], ['plan', '#plan']].forEach(function (m) { var n = res.querySelector(m[1]); n = n && (n.closest('section') || n); if (n && !n.getAttribute('data-plai')) { n.setAttribute('data-plai', m[0]); io.observe(n); } });
    }
    var check = function () {
      var run = document.getElementById('run'), setup = document.getElementById('setup');
      var st = run && run.textContent.trim() ? 'run' : res && res.textContent.trim() ? 'res' : setup && setup.textContent.trim() ? 'setup' : 'idle';
      if (st === aState) { if (st === 'res') tagResults(); return; }
      aState = st; face(st === 'run' || st === 'setup' ? 'think' : 'ok');
      if (st === 'res') { tagResults(); active = null; aSeen = {}; if (!muted) { face('happy'); setTimeout(function () { face('ok'); }, 1200); showTip(CASE ? AIBB_T.caseTop : AIBB_T.top, 'r-top'); } return; }
      if (!muted && mode !== 'menu') showTip(AIBB_T[st], 'a-' + st, st === 'run' ? 20000 : 10000);
    };
    ['run', 'results', 'setup'].forEach(function (id) { var n = document.getElementById(id); if (n) new MutationObserver(function () { clearTimeout(watchAibb._t); watchAibb._t = setTimeout(check, 500); }).observe(n, { childList: true }); });
    setTimeout(check, 900);
  }

  // ---------- montaje ----------
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
    g.addEventListener('click', function (e) { if (!done) return; e.stopPropagation(); if (bub.classList.contains('show') && mode === 'menu') hideBubble(); else showMenu(); });
    g.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') tickle(); });
    addEventListener('pointermove', trackEyes, { passive: true });
    addEventListener('resize', function () {
      w = innerWidth; h = innerHeight; layer.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      if (done) { var c = corner(); place(c[0], c[1], c[2]); if (bub.classList.contains('show')) hideBubble(); }
    });
  }

  async function intro() {
    busy = true;
    var mob = w < 640, S = mob ? .95 : 1.25, cx = w / 2, cy = Math.min(h * .55, h - 150 * S);
    var fx = cx + 72 * S, fy = cy - 42 * S, k = Math.max(w, h) / 620;
    crackG.innerHTML = CRACKS.map(function (d) { return '<path pathLength="1" d="' + d + '" transform="translate(' + fx + ' ' + fy + ') scale(' + k + ')" vector-effect="non-scaling-stroke" style="stroke-dasharray:1;stroke-dashoffset:1"/>'; }).join('');
    spark.innerHTML = [[fx + 60, fy - 54, '#F5B544', 1.2], [fx - 50, fy + 40, '#2EC4A0', 1], [fx + 30, fy + 34, '#8B8CF8', .9]].map(function (s) { return '<path d="M0 -12 l4 8 8 4 -8 4 -4 8 -4 -8 -8 -4 8 -4z" fill="' + s[2] + '" transform="translate(' + s[0] + ' ' + s[1] + ') scale(' + s[3] + ')"/>'; }).join('');
    place(cx, cy + 50, S * .3); g.setAttribute('opacity', 0);
    await tw(250, function (t) { g.setAttribute('opacity', t); });
    await tw(850, function (t) { var e = ease(t); place(cx, cy + 50 - 50 * e, S * (.3 + .7 * e)); });
    for (var i = 0; i < 3; i++) {
      await tw(110, function (t) { place(cx, cy, S * (1 + .06 * t)); });
      await tw(140, function (t) { place(cx, cy, S * (1.06 - .06 * t)); });
      if (i < 2) await sleep(170);
    }
    crackG.setAttribute('opacity', 1);
    var paths = crackG.querySelectorAll('path'), shakeEl = document.querySelector('main') || document.body;
    tw(340, function (t) { paths.forEach(function (p) { p.style.strokeDashoffset = 1 - ease(t); }); });
    await tw(340, function (t) { var a = (1 - t) * 7; shakeEl.style.transform = t < 1 ? 'translate(' + (Math.sin(t * 40) * a).toFixed(1) + 'px,' + (Math.cos(t * 36) * a).toFixed(1) + 'px)' : ''; });
    shakeEl.style.transform = '';
    face('oops'); bubble(X(T.ups), cx + 60 * S, cy - 80 * S, 'intro');
    await tw(450, function (t) { place(cx, cy + 6 * t, S * (1 - .04 * t)); });
    await sleep(800);
    hideBubble(); await sleep(120); bubble(X(T.fix), cx + 60 * S, cy - 80 * S, 'intro');
    tirita.setAttribute('opacity', 1);
    await tw(380, function (t) { tirita.setAttribute('transform', 'translate(' + fx + ' ' + fy + ') rotate(-22) scale(' + (ease(t) * k * .9).toFixed(3) + ')'); });
    await sleep(500);
    spark.setAttribute('opacity', 1);
    await tw(520, function (t) { crackG.setAttribute('opacity', 1 - t); tirita.setAttribute('opacity', 1 - t); spark.setAttribute('opacity', t < .5 ? 1 : 2 - 2 * t); });
    face('happy'); hideBubble(); await sleep(100); bubble(X(T.ok), cx + 60 * S, cy - 80 * S, 'intro');
    await sleep(700); hideBubble(); face('ok');
    var c = corner(), from = g._p;
    await tw(750, function (t) { var e = ease(t); place(from[0] + (c[0] - from[0]) * e, from[1] + (c[1] - from[1]) * e, from[2] + (c[2] - from[2]) * e); });
  }
  function finish() {
    skip = true; done = true; busy = false;
    crackG.setAttribute('opacity', 0); tirita.setAttribute('opacity', 0); spark.setAttribute('opacity', 0);
    var mn = document.querySelector('main'); if (mn) mn.style.transform = '';
    face('ok'); g.setAttribute('opacity', 1);
    var c = corner(); place(c[0], c[1], c[2]);
    g.setAttribute('role', 'button'); g.setAttribute('tabindex', '0'); g.setAttribute('aria-label', X(T.menu));
    g.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (bub.classList.contains('show') && mode === 'menu') hideBubble(); else showMenu(); } };
    hideBubble(); schedBlink();
    if (AIBB) { watchAibb(); return; }
    watchStory(); watchServices(); watchData();
  }
  function start() {
    build();
    var first = get(KEY_INTRO) !== '1';
    if (!HOME || !first || reduce) { finish(); return; }
    put(KEY_INTRO, '1');
    var stop = function () { skip = true; };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { addEventListener(ev, stop, { once: true, passive: true }); });
    intro().then(finish, finish);
  }
  // Espera a que el visitante haya respondido al aviso de cookies (si aparece)
  function ready() {
    // Solo en escritorio: pantalla ancha y ratón
    if (!(window.matchMedia && matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches)) return;
    var visible = function () { var cc = document.getElementById('plg-cc'); return !!(cc && cc.querySelector('.cc-box')); };
    if (!visible()) { setTimeout(start, 1600); return; }
    var iv = setInterval(function () { if (!visible()) { clearInterval(iv); setTimeout(start, 900); } }, 400);
  }
  if (document.readyState === 'complete') ready(); else addEventListener('load', ready);
})();
