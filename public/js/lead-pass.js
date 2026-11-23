/*
 * plaiground · "Pase al plaiground" — formulario de contacto interactivo
 * Se monta en <div id="leadPass"></div>. Bilingüe (sigue el atributo lang del <html>).
 * Envía a POST /api/lead. Newsletter con doble confirmación por email.
 */
(function () {
  'use strict';
  var root = document.getElementById('leadPass'); if (!root) return;
  var H = document.documentElement, L = function () { return H.getAttribute('data-lang') === 'en' || H.lang === 'en' ? 'en' : 'es'; };
  var tr = function (es, en) { return L() === 'en' ? en : es; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var INT = [
    ['ia', 'Estrategia de IA', 'AI strategy', 'M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 2 5.2V14a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4v-1.8A3 3 0 0 1 8 7V6a4 4 0 0 1 4-4zM9 22h6'],
    ['data', 'Datos y dashboards', 'Data & dashboards', 'M4 20V10M10 20V4M16 20v-7M22 20H2'],
    ['growth', 'Growth B2B', 'B2B growth', 'M3 17l6-6 4 4 8-8M15 7h6v6'],
    ['brand', 'Estudio de marca', 'Brand research', 'M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z'],
    ['dp', 'Data plaiground', 'Data plaiground', 'M3 5h18v14H3zM3 10h18M8 15h3'],
    ['curious', 'Solo curioseo', 'Just curious', 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3']
  ];
  var ROLES = [['ceo', 'Dirección', 'Leadership'], ['mkt', 'Marketing', 'Marketing'], ['sales', 'Ventas', 'Sales'], ['product', 'Producto', 'Product'], ['agency', 'Agencia', 'Agency'], ['other', 'Otro', 'Other']];
  var S = { step: 0, interests: [], urgency: 40, name: '', email: '', company: '', role: '', message: '', newsletter: false, privacy: false, sending: false, done: null, err: '', t0: Date.now() };
  var urgencyLabel = function (u) { return u < 25 ? tr('Explorando ideas', 'Exploring ideas') : u < 50 ? tr('Este trimestre', 'This quarter') : u < 75 ? tr('Este mes', 'This month') : tr('¡Lo necesitábamos ayer!', 'We needed it yesterday!'); };
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  var DOMS = ['gmail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es', 'yahoo.com', 'yahoo.es', 'icloud.com', 'live.com', 'msn.com', 'protonmail.com', 'telefonica.net'];
  function lev(a, b) { var m = [], i, j; for (i = 0; i <= a.length; i++) { m[i] = [i]; } for (j = 1; j <= b.length; j++) m[0][j] = j; for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; }
  function suggest(email) { var at = email.lastIndexOf('@'); if (at < 1) return ''; var d = email.slice(at + 1).toLowerCase(); if (DOMS.indexOf(d) >= 0) return ''; var best = '', bd = 3; DOMS.forEach(function (x) { var k = lev(d, x); if (k < bd) { bd = k; best = x; } }); return best && bd <= 2 ? email.slice(0, at + 1) + best : ''; }
  function code() { return S.done ? S.done : 'PLG-' + (S.email ? hash(S.email.toLowerCase()).toString(36).toUpperCase().slice(0, 6) : '······'); }
  function barcode() { var h = hash((S.email || 'plaiground') + S.name), x = 0, out = ''; for (var i = 0; i < 46; i++) { h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; var w = 1 + (h % 3); if (i % 2 === 0) out += '<rect x="' + x + '" y="0" width="' + w + '" height="34" rx=".5"/>'; x += w + 1; } return '<svg viewBox="0 0 ' + x + ' 34" preserveAspectRatio="none" aria-hidden="true">' + out + '</svg>'; }

  var css = document.createElement('style');
  css.textContent = `
#leadPass{--lp-glass:rgba(255,255,255,.06);--lp-line:rgba(236,238,255,.14)}
.lp{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:44px;align-items:center}
@media (max-width:960px){.lp{grid-template-columns:minmax(0,1fr);gap:28px}.lp-tk-wrap{order:-1}}
.lp-form{background:var(--lp-glass);border:1px solid var(--lp-line);border-radius:28px;padding:clamp(20px,3vw,32px);color:#ECEEFF;position:relative}
.lp-prog{display:flex;gap:8px;margin-bottom:22px}
.lp-prog span{flex:1;height:6px;border-radius:99px;background:rgba(236,238,255,.14);overflow:hidden;position:relative}
.lp-prog span i{position:absolute;inset:0;width:0;background:linear-gradient(90deg,#8B8CF8,#FF7A59,#19B5A5);transition:width .5s ease}
.lp-prog span.on i{width:100%}
.lp-kick{font:700 12px var(--body);letter-spacing:.18em;text-transform:uppercase;color:#B8B9FF}
.lp-q{font:800 clamp(24px,2.6vw,32px)/1.08 var(--display);letter-spacing:-.03em;margin:8px 0 6px;color:#fff}
.lp-h{color:#A3A8CC;font-size:15px;margin:0 0 18px}
.lp-chips{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}
.lp-chip{display:flex;align-items:center;gap:10px;text-align:left;border:1.5px solid var(--lp-line);background:rgba(255,255,255,.04);color:#ECEEFF;border-radius:16px;padding:13px 14px;font:600 14.5px var(--body);cursor:pointer;transition:transform .15s,border-color .15s,background .15s;min-height:54px}
.lp-chip svg{width:22px;height:22px;flex:none}
.lp-chip:hover{transform:translateY(-2px);border-color:rgba(236,238,255,.35)}
.lp-chip[aria-pressed="true"]{background:linear-gradient(120deg,rgba(139,140,248,.35),rgba(255,122,89,.28));border-color:#B8B9FF;box-shadow:0 10px 30px rgba(139,140,248,.25)}
.lp-range{margin:8px 0 4px}
.lp-range input{width:100%;appearance:none;-webkit-appearance:none;height:10px;border-radius:99px;background:linear-gradient(90deg,#19B5A5,#8B8CF8 50%,#FF7A59);outline:none}
.lp-range input::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;border-radius:50%;background:#fff;border:4px solid #14162E;box-shadow:0 0 0 3px #B8B9FF;cursor:grab}
.lp-range input::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#fff;border:4px solid #14162E;box-shadow:0 0 0 3px #B8B9FF;cursor:grab}
.lp-range input:focus-visible{box-shadow:0 0 0 3px #8B8CF8}
.lp-rl{display:flex;justify-content:space-between;font-size:12.5px;color:#A3A8CC;margin-top:10px}
.lp-big{font:800 clamp(30px,3.4vw,40px)/1 var(--display);letter-spacing:-.04em;margin:18px 0 0;background:linear-gradient(100deg,#B8B9FF,#FF9B7E 55%,#5FE0CF);-webkit-background-clip:text;background-clip:text;color:transparent}
.lp-f{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:560px){.lp-f{grid-template-columns:1fr}}
.lp-f label{display:block;font:700 12px var(--body);letter-spacing:.08em;text-transform:uppercase;color:#A3A8CC;margin:0 0 6px}
.lp-f input,.lp-msg textarea{width:100%;font:500 16px var(--body);color:#fff;background:rgba(255,255,255,.06);border:1.5px solid var(--lp-line);border-radius:14px;padding:13px 14px}
.lp-f input:focus,.lp-msg textarea:focus{outline:none;border-color:#B8B9FF;background:rgba(255,255,255,.09)}
.lp-f input::placeholder,.lp-msg textarea::placeholder{color:#6f7399}
.lp-roles{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.lp-roles button{border:1.5px solid var(--lp-line);background:transparent;color:#ECEEFF;font:600 13.5px var(--body);padding:8px 13px;border-radius:999px;cursor:pointer}
.lp-roles button[aria-pressed="true"]{background:#ECEEFF;color:#14162E;border-color:#ECEEFF}
.lp-msg textarea{min-height:110px;resize:vertical}
.lp-tog{display:flex;gap:12px;align-items:flex-start;margin-top:14px;font-size:14px;color:#C9CCEA;cursor:pointer}
.lp-tog input{position:absolute;opacity:0;pointer-events:none}
.lp-tog .sw{flex:none;width:46px;height:26px;border-radius:99px;background:rgba(236,238,255,.18);position:relative;transition:background .2s;margin-top:1px}
.lp-tog .sw::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}
.lp-tog input:checked+.sw{background:#5F58EC}.lp-tog input:checked+.sw::after{transform:translateX(20px)}
.lp-tog input:focus-visible+.sw{box-shadow:0 0 0 3px #8B8CF8}
.lp-tog a{color:#B8B9FF}
.lp-nav{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:24px}
.lp-nav .bk{background:none;border:0;color:#A3A8CC;font:600 15px var(--body);cursor:pointer;padding:12px 6px}
.lp-nav .nx{border:0;border-radius:999px;padding:15px 26px;font:700 16px var(--body);cursor:pointer;color:#fff;background:linear-gradient(100deg,#4338CA,#7C5CFF 50%,#FF7A59);box-shadow:0 14px 34px rgba(124,92,255,.4);transition:transform .15s}
.lp-nav .nx:hover{transform:translateY(-2px)}.lp-nav .nx[disabled]{opacity:.5;cursor:wait}
.lp-err{color:#FF9B7E;font-size:14px;min-height:20px;margin-top:10px}
.lp-sug{background:none;border:0;padding:0;color:#FFB8A6;font:inherit;text-align:left;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.lp-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
/* ticket */
.lp-tk-wrap{perspective:1200px;display:flex;justify-content:center}
.lp-tk{width:min(100%,430px);border-radius:28px;position:relative;transform-style:preserve-3d;transition:transform .2s ease-out;color:#fff;
 background:radial-gradient(120% 80% at 0% 0%,rgba(255,255,255,.28),transparent 50%),linear-gradient(135deg,#3b2fc0 0%,#7c4ddb 32%,#e2667a 64%,#f0a35d 82%,#1fb3a4 100%);
 box-shadow:0 40px 80px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.25);overflow:hidden}
.lp-tk::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,0) 0 18px,rgba(255,255,255,.07) 18px 20px);mix-blend-mode:overlay;pointer-events:none}
.lp-tk .shine{position:absolute;inset:-40%;background:radial-gradient(closest-side,rgba(255,255,255,.45),transparent 70%);opacity:.0;transition:opacity .3s;pointer-events:none;mix-blend-mode:soft-light}
.lp-tk:hover .shine{opacity:1}
.lp-tk .top{padding:24px 26px 18px;position:relative}
.lp-tk .brand{display:flex;justify-content:space-between;align-items:center;font:700 12px var(--body);letter-spacing:.2em;text-transform:uppercase;opacity:.9}
.lp-tk .brand b{font:800 20px var(--display);letter-spacing:-.04em;text-transform:none}
.lp-tk .who{font:800 clamp(28px,3vw,36px)/1.02 var(--display);letter-spacing:-.04em;margin:22px 0 4px;min-height:1.05em;word-break:break-word}
.lp-tk .ph{opacity:.45}
.lp-tk .team{font-size:15px;opacity:.9;min-height:1.4em}
.lp-tk .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px}
.lp-tk .lbl{font:700 10.5px var(--body);letter-spacing:.18em;text-transform:uppercase;opacity:.75}
.lp-tk .val{font:700 15px var(--body);margin-top:4px;line-height:1.3;min-height:1.3em}
.lp-tk .meter{height:6px;border-radius:99px;background:rgba(255,255,255,.25);margin-top:8px;overflow:hidden}
.lp-tk .meter i{display:block;height:100%;background:#fff;border-radius:99px;transition:width .3s}
.lp-tk .perf{position:relative;height:0;border-top:2px dashed rgba(255,255,255,.45);margin:0 18px}
.lp-tk .perf::before,.lp-tk .perf::after{content:"";position:absolute;top:-14px;width:28px;height:28px;border-radius:50%;background:var(--lp-bg,#14162E)}
.lp-tk .perf::before{left:-32px}.lp-tk .perf::after{right:-32px}
.lp-tk .stub{padding:18px 26px 22px;display:flex;align-items:center;gap:16px}
.lp-tk .stub svg{height:34px;flex:1;fill:#fff;opacity:.9}
.lp-tk .code{font:800 18px var(--display);letter-spacing:.04em;white-space:nowrap}
.lp-tk .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.lp-tk .tags span{font-size:11.5px;font-weight:700;background:rgba(255,255,255,.2);border-radius:999px;padding:4px 9px}
.lp-stamp{position:absolute;right:18px;top:92px;transform:rotate(-14deg) scale(2.4);opacity:0;border:4px solid #fff;color:#fff;border-radius:14px;padding:6px 14px;font:800 22px var(--display);letter-spacing:.08em;text-transform:uppercase;transition:transform .45s cubic-bezier(.2,1.6,.4,1),opacity .2s;background:rgba(20,22,46,.18)}
.lp-tk.issued .lp-stamp{transform:rotate(-14deg) scale(1);opacity:1}
.lp-done{color:#ECEEFF}
.lp-done h3{font:800 clamp(28px,3vw,38px)/1.05 var(--display);letter-spacing:-.035em;color:#fff;margin:8px 0 10px}
.lp-done p{color:#C9CCEA;margin:0 0 18px}
.lp-links{display:grid;gap:10px}
.lp-links a{display:flex;justify-content:space-between;align-items:center;gap:10px;text-decoration:none;color:#fff;background:rgba(255,255,255,.06);border:1px solid var(--lp-line);border-radius:16px;padding:14px 16px;font-weight:600;transition:transform .15s,background .15s}
.lp-links a:hover{transform:translateX(4px);background:rgba(255,255,255,.1)}
.lp-links a small{display:block;color:#A3A8CC;font-weight:500;font-size:13px}
.lp-confetti{position:fixed;inset:0;pointer-events:none;z-index:999}
@media (prefers-reduced-motion:reduce){.lp-tk,.lp-chip,.lp-stamp,.lp-prog span i{transition:none!important}}
`;
  document.head.appendChild(css);

  var ICON = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; };
  var STEPS = 4;
  function stepHtml() {
    var s = S.step;
    if (s === 0) return '<div class="lp-kick">' + tr('Paso 1 de 4', 'Step 1 of 4') + '</div><h3 class="lp-q" id="lp-q">' + tr('¿Qué quieres desbloquear?', 'What do you want to unlock?') + '</h3><p class="lp-h">' + tr('Elige una o varias. Tu pase se va armando a la derecha.', 'Pick one or more. Your pass builds itself as you go.') + '</p>' +
      '<div class="lp-chips" role="group" aria-labelledby="lp-q">' + INT.map(function (i) { return '<button type="button" class="lp-chip" data-i="' + i[0] + '" aria-pressed="' + (S.interests.indexOf(i[0]) >= 0) + '">' + ICON(i[3]) + '<span>' + tr(i[1], i[2]) + '</span></button>'; }).join('') + '</div>';
    if (s === 1) return '<div class="lp-kick">' + tr('Paso 2 de 4', 'Step 2 of 4') + '</div><h3 class="lp-q">' + tr('¿Para cuándo lo necesitas?', 'How soon do you need it?') + '</h3><p class="lp-h">' + tr('Arrastra. Sin juicios: explorar también cuenta.', 'Drag it. No judgement: exploring counts too.') + '</p>' +
      '<div class="lp-range"><input type="range" min="0" max="100" step="1" id="lp-u" value="' + S.urgency + '" aria-label="' + tr('Urgencia', 'Urgency') + '" aria-valuetext="' + esc(urgencyLabel(S.urgency)) + '"><div class="lp-rl"><span>' + tr('Sin prisa', 'No rush') + '</span><span>' + tr('Urgente', 'Urgent') + '</span></div></div><div class="lp-big" id="lp-ul" aria-live="polite">' + esc(urgencyLabel(S.urgency)) + '</div>';
    if (s === 2) return '<div class="lp-kick">' + tr('Paso 3 de 4', 'Step 3 of 4') + '</div><h3 class="lp-q">' + tr('¿Quién juega?', 'Who’s playing?') + '</h3><p class="lp-h">' + tr('Para poner tu nombre en el pase y poder escribirte.', 'So I can put your name on the pass and write back.') + '</p>' +
      '<div class="lp-f"><div><label for="lp-n">' + tr('Nombre', 'Name') + ' *</label><input id="lp-n" autocomplete="name" maxlength="80" value="' + esc(S.name) + '" placeholder="' + tr('Ada Lovelace', 'Ada Lovelace') + '"></div><div><label for="lp-e">Email *</label><input id="lp-e" type="email" autocomplete="email" maxlength="254" value="' + esc(S.email) + '" placeholder="' + tr('tu@empresa.com', 'you@company.com') + '"></div>' +
      '<div><label for="lp-c">' + tr('Empresa', 'Company') + '</label><input id="lp-c" autocomplete="organization" maxlength="100" value="' + esc(S.company) + '" placeholder="' + tr('Opcional', 'Optional') + '"></div><div><label id="lp-rl">' + tr('Tu rol', 'Your role') + '</label><div class="lp-roles" role="group" aria-labelledby="lp-rl">' + ROLES.map(function (r) { return '<button type="button" data-r="' + r[0] + '" aria-pressed="' + (S.role === r[0]) + '">' + tr(r[1], r[2]) + '</button>'; }).join('') + '</div></div></div>';
    return '<div class="lp-kick">' + tr('Paso 4 de 4', 'Step 4 of 4') + '</div><h3 class="lp-q">' + tr('¿Algo más que deba saber?', 'Anything else I should know?') + '</h3><p class="lp-h">' + tr('Cuéntame el reto en dos líneas (opcional).', 'Tell me the challenge in two lines (optional).') + '</p>' +
      '<div class="lp-msg"><textarea id="lp-m" maxlength="1000" placeholder="' + tr('Queremos entender qué canales funcionan de verdad…', 'We want to understand which channels really work…') + '">' + esc(S.message) + '</textarea></div>' +
      '<label class="lp-tog"><input type="checkbox" id="lp-nl"' + (S.newsletter ? ' checked' : '') + '><span class="sw"></span><span>' + tr('Quiero recibir la <b>newsletter mensual</b> del plaiground: experimentos de marketing con IA y proyectos nuevos. Te pediré que lo confirmes por email y podrás darte de baja cuando quieras.', 'I want the <b>monthly plaiground newsletter</b>: AI marketing experiments and new projects. I’ll ask you to confirm by email and you can unsubscribe anytime.') + '</span></label>' +
      '<label class="lp-tog"><input type="checkbox" id="lp-pv"' + (S.privacy ? ' checked' : '') + '><span class="sw"></span><span>' + tr('He leído la <a href="/legal/privacidad/" target="_blank" rel="noopener">política de privacidad</a> y acepto que se usen mis datos para responder a mi solicitud. *', 'I’ve read the <a href="/legal/privacidad/" target="_blank" rel="noopener">privacy policy</a> and agree to my data being used to answer my request. *') + '</span></label>' +
      '<div class="lp-hp" aria-hidden="true"><label>Website<input id="lp-w" tabindex="-1" autocomplete="off"></label></div>';
  }
  function ticketHtml() {
    var ints = S.interests.map(function (k) { var i = INT.filter(function (x) { return x[0] === k; })[0]; return tr(i[1], i[2]); });
    var role = ROLES.filter(function (r) { return r[0] === S.role; })[0];
    return '<div class="lp-tk' + (S.done ? ' issued' : '') + '" id="lp-tk" aria-label="' + tr('Vista previa de tu pase', 'Preview of your pass') + '"><span class="shine"></span><div class="top"><div class="brand"><b>plaiground</b><span>' + tr('Pase', 'Pass') + ' · 2026</span></div>' +
      '<div class="who">' + (S.name ? esc(S.name) : '<span class="ph">' + tr('Tu nombre', 'Your name') + '</span>') + '</div><div class="team">' + (S.company ? esc(S.company) : '') + (role ? (S.company ? ' · ' : '') + tr(role[1], role[2]) : '') + '</div>' +
      '<div class="grid"><div style="grid-column:1/-1"><div class="lbl">' + tr('Misión', 'Mission') + '</div><div class="tags">' + (ints.length ? ints.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') : '<span style="opacity:.6">' + tr('Elige tu reto', 'Pick your challenge') + '</span>') + '</div></div>' +
      '<div><div class="lbl">' + tr('Prioridad', 'Priority') + '</div><div class="val">' + esc(urgencyLabel(S.urgency)) + '</div><div class="meter"><i style="width:' + S.urgency + '%"></i></div></div>' +
      '<div><div class="lbl">' + tr('Acceso', 'Access') + '</div><div class="val">' + (S.newsletter ? tr('Todo incluido + newsletter', 'All-access + newsletter') : tr('Todo incluido', 'All-access')) + '</div></div></div>' +
      '<div class="lp-stamp">' + tr('Emitido', 'Issued') + ' ✓</div></div><div class="perf"></div><div class="stub">' + barcode() + '<div><div class="lbl">Nº</div><div class="code">' + esc(code()) + '</div></div></div></div>';
  }
  function doneHtml() {
    return '<div class="lp-done"><div class="lp-kick">' + tr('Pase emitido', 'Pass issued') + ' · ' + esc(S.done) + '</div><h3>' + tr('¡Ya estás dentro, ', 'You’re in, ') + esc((S.name || '').split(' ')[0]) + '!</h3><p>' + tr('Te he enviado tu pase a ', 'I’ve sent your pass to ') + '<b>' + esc(S.email) + '</b>' + (S.newsletter ? tr('. Confirma ahí la newsletter con un clic.', '. Confirm the newsletter there with one click.') : '.') + ' ' + tr('Te escribo en menos de 48 h laborables. Mientras tanto:', 'I’ll write back within 48 working hours. Meanwhile:') + '</p>' +
      '<div class="lp-links"><a href="/barometer/"><span>Franchise Brand Barometer<small>' + tr('¿Qué saga es la marca más fuerte?', 'Which saga is the strongest brand?') + '</small></span>→</a><a href="/data/"><span>Data plaiground<small>' + tr('Tu Excel convertido en un dashboard interactivo', 'Your Excel turned into an interactive dashboard') + '</small></span>→</a><a href="/cv/"><span>Olivero Fest CV<small>' + tr('Una carrera contada como un festival', 'A career told as a festival') + '</small></span>→</a></div></div>';
  }
  function render() {
    root.innerHTML = '<div class="lp"><div class="lp-form">' + (S.done ? doneHtml() : '<div class="lp-prog" aria-hidden="true">' + [0, 1, 2, 3].map(function (i) { return '<span class="' + (i <= S.step ? 'on' : '') + '"><i></i></span>'; }).join('') + '</div><form id="lp-form" novalidate>' + stepHtml() + '<div class="lp-err" id="lp-err" role="alert">' + (S.sug && S.step === 2 ? '<button type="button" id="lp-sug" class="lp-sug">' + esc(S.err) + '</button>' : esc(S.err)) + '</div><div class="lp-nav">' + (S.step ? '<button type="button" class="bk" id="lp-bk">← ' + tr('Atrás', 'Back') + '</button>' : '<span></span>') + '<button type="submit" class="nx" id="lp-nx"' + (S.sending ? ' disabled' : '') + '>' + (S.step < STEPS - 1 ? tr('Siguiente', 'Next') + ' →' : S.sending ? tr('Emitiendo…', 'Issuing…') : tr('Emitir mi pase', 'Issue my pass') + ' ✦') + '</button></div></form>') + '</div><div class="lp-tk-wrap">' + ticketHtml() + '</div></div>';
    bind();
  }
  function refreshTicket() { var w = root.querySelector('.lp-tk-wrap'); if (w) { w.innerHTML = ticketHtml(); tilt(); } }
  function readFields() {
    var g = function (id) { var e = document.getElementById(id); return e ? e.value : null; };
    if (g('lp-n') !== null) { S.name = g('lp-n').trim(); S.email = g('lp-e').trim(); S.company = g('lp-c').trim(); }
    if (g('lp-m') !== null) { S.message = g('lp-m'); S.newsletter = document.getElementById('lp-nl').checked; S.privacy = document.getElementById('lp-pv').checked; }
  }
  function validate() {
    if (S.step === 0 && !S.interests.length) return tr('Elige al menos una opción para tu misión.', 'Pick at least one option for your mission.');
    if (S.step === 2) { if (S.name.length < 2) return tr('Escribe tu nombre.', 'Enter your name.'); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(S.email)) return tr('Escribe un email válido.', 'Enter a valid email.'); var sg = suggest(S.email); if (sg && S.okEmail !== S.email) { S.sug = sg; S.okEmail = S.email; return tr('¿Querías decir ', 'Did you mean ') + sg + '? ' + tr('Pulsa aquí para corregirlo, o «Siguiente» si está bien.', 'Tap here to fix it, or “Next” if it’s right.'); } }
    if (S.step === 3 && !S.privacy) return tr('Necesito que aceptes la política de privacidad para poder responderte.', 'Please accept the privacy policy so I can reply.');
    return '';
  }
  function bind() {
    var f = document.getElementById('lp-form');
    if (f) f.onsubmit = function (e) { e.preventDefault(); readFields(); S.sug = ''; S.err = validate(); if (S.err) { render(); var fe = root.querySelector('input:not([type=checkbox]),button.lp-chip'); return; } if (S.step < STEPS - 1) { S.step++; render(); focusFirst(); } else submit(); };
    var sb = document.getElementById('lp-sug'); if (sb) sb.onclick = function () { S.email = S.sug; S.okEmail = S.sug; S.sug = ''; S.err = ''; render(); };
    var bk = document.getElementById('lp-bk'); if (bk) bk.onclick = function () { readFields(); S.err = ''; S.step--; render(); focusFirst(); };
    root.querySelectorAll('.lp-chip').forEach(function (b) { b.onclick = function () { var k = b.dataset.i, i = S.interests.indexOf(k); if (i >= 0) S.interests.splice(i, 1); else S.interests.push(k); b.setAttribute('aria-pressed', i < 0); S.err = ''; var er = document.getElementById('lp-err'); if (er) er.textContent = ''; refreshTicket(); }; });
    root.querySelectorAll('.lp-roles button').forEach(function (b) { b.onclick = function () { S.role = S.role === b.dataset.r ? '' : b.dataset.r; root.querySelectorAll('.lp-roles button').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.r === S.role); }); refreshTicket(); }; });
    var u = document.getElementById('lp-u'); if (u) u.oninput = function () { S.urgency = +u.value; var l = urgencyLabel(S.urgency); document.getElementById('lp-ul').textContent = l; u.setAttribute('aria-valuetext', l); refreshTicket(); };
    ['lp-n', 'lp-e', 'lp-c'].forEach(function (id) { var e = document.getElementById(id); if (e) e.oninput = function () { readFields(); refreshTicket(); }; });
    ['lp-nl', 'lp-pv'].forEach(function (id) { var e = document.getElementById(id); if (e) e.onchange = function () { readFields(); refreshTicket(); }; });
    tilt();
  }
  function focusFirst() { var e = root.querySelector('.lp-form input:not([type=checkbox]):not(#lp-w), .lp-form textarea, .lp-chip'); if (e) e.focus({ preventScroll: true }); }
  function tilt() {
    var tk = document.getElementById('lp-tk'); if (!tk || reduce) return;
    var sh = tk.querySelector('.shine');
    tk.onpointermove = function (e) { var r = tk.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; tk.style.transform = 'rotateY(' + (x * 14) + 'deg) rotateX(' + (-y * 12) + 'deg)'; sh.style.transform = 'translate(' + (x * 60) + '%,' + (y * 60) + '%)'; };
    tk.onpointerleave = function () { tk.style.transform = ''; };
  }
  function confetti() {
    if (reduce) return;
    var c = document.createElement('canvas'); c.className = 'lp-confetti'; document.body.appendChild(c);
    var ctx = c.getContext('2d'), W = c.width = innerWidth, Hh = c.height = innerHeight, cols = ['#8B8CF8', '#FF7A59', '#19B5A5', '#E0A100', '#ffffff'];
    var tk = document.getElementById('lp-tk'), r = tk ? tk.getBoundingClientRect() : { left: W / 2, top: Hh / 2, width: 0, height: 0 };
    var ps = Array.from({ length: 140 }, function () { return { x: r.left + r.width / 2, y: r.top + r.height / 3, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, s: 4 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, va: (Math.random() - .5) * .3 }; });
    var t = 0;
    (function frame() { ctx.clearRect(0, 0, W, Hh); ps.forEach(function (p) { p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }); if (++t < 150) requestAnimationFrame(frame); else c.remove(); })();
  }
  function submit() {
    if (S.sending) return; S.sending = true; S.err = ''; render();
    var body = { name: S.name, email: S.email, company: S.company, role: S.role, interests: S.interests, urgency: S.urgency, message: S.message, newsletter: S.newsletter, privacy: S.privacy, lang: L(), website: (document.getElementById('lp-w') || {}).value || '', elapsed: Date.now() - S.t0 };
    fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, d: d }; }); })
      .then(function (res) {
        S.sending = false;
        if (res.ok && res.d.code) { S.done = res.d.code; render(); setTimeout(confetti, 120); return; }
        S.err = res.status === 429 ? tr('Has enviado varios pases seguidos. Espera un rato o escríbeme a matiasjulianolivero@gmail.com.', 'You’ve sent several passes in a row. Wait a bit or email matiasjulianolivero@gmail.com.')
          : res.d.error === 'invalid_email' ? tr('Revisa tu email.', 'Check your email.')
          : tr('No se pudo enviar. Inténtalo de nuevo o escríbeme a matiasjulianolivero@gmail.com.', 'Couldn’t send it. Try again or email matiasjulianolivero@gmail.com.');
        render();
      })
      .catch(function () { S.sending = false; S.err = tr('Sin conexión. Inténtalo de nuevo en un momento.', 'No connection. Try again in a moment.'); render(); });
  }
  new MutationObserver(function () { readFields(); render(); }).observe(H, { attributes: true, attributeFilter: ['lang', 'data-lang'] });
  render();
})();
