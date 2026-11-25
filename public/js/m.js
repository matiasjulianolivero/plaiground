/* Medición de plaiground.
   - Siempre: recuento agregado y anónimo de visitas y algunos clics (sin cookies ni identificadores).
   - Solo si la persona acepta las cookies analíticas: una cookie propia (plg_vid) con un identificador aleatorio
     para recordar qué páginas visita, cuántas veces y cuánto tiempo. Si deja su email en un formulario,
     el servidor une esa actividad a su ficha de contacto. Ver /legal/cookies/ y /legal/privacidad/. */
(function () {
  'use strict';
  var p = location.pathname;
  if (p.indexOf('/admin') === 0 || navigator.webdriver) return;
  function send(o) {
    try {
      var body = JSON.stringify(o);
      if (navigator.sendBeacon && navigator.sendBeacon('/api/m', new Blob([body], { type: 'text/plain' }))) return;
      fetch('/api/m', { method: 'POST', body: body, keepalive: true, credentials: 'same-origin' }).catch(function () {});
    } catch (e) {}
  }
  window.plgTrack = function (e) { send({ e: e }); };

  // ---- consentimiento analítico ----
  function analyticsOk() {
    try { var c = JSON.parse(localStorage.getItem('plg-consent') || 'null'); return !!(c && c.v === 2 && c.analytics && Date.now() - c.ts < 365 * 864e5); } catch (e) { return false; }
  }
  var hasVid = function () { return /(?:^|;\s*)plg_vid=[a-f0-9]{32}/.test(document.cookie); };
  function setVid(on) {
    if (on && !hasVid()) {
      var a = new Uint8Array(16); crypto.getRandomValues(a);
      var v = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      document.cookie = 'plg_vid=' + v + '; Max-Age=31536000; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    } else if (!on && hasVid()) document.cookie = 'plg_vid=; Max-Age=0; Path=/; SameSite=Lax';
  }
  setVid(analyticsOk());

  var q = location.search;
  var page = p === '/' || p === '/index.html' ? 'home'
    : p.indexOf('/ai-barometer') === 0 ? (/[?&]caso=/.test(q) ? 'caso' : 'aibb')
    : p.indexOf('/data') === 0 ? 'data' : p.indexOf('/cv') === 0 ? 'cv'
    : p.indexOf('/barometer') === 0 ? 'barometer' : p.indexOf('/newsletter') === 0 ? 'newsletter'
    : p.indexOf('/legal') === 0 ? 'legal' : 'otra';
  // Ruta legible para la ficha (sin tokens ni datos de la URL; solo el caso de estudio si lo hay)
  var caso = /[?&]caso=([a-z0-9-]{3,40})/.exec(q);
  var path = (p + (caso ? '?caso=' + caso[1] : '')).slice(0, 120);
  var r = '';
  try { r = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
  var m = /[?&]utm_source=([a-z0-9._-]{1,40})/i.exec(q);
  if (m) { r = m[1].toLowerCase(); if (r.indexOf('.') < 0) r += '.com'; }
  send({ e: 'pv', p: page, r: r, u: path });

  // Tiempo visible en la página (solo se guarda con consentimiento: el servidor lo ignora sin cookie)
  var shown = document.visibilityState === 'visible' ? Date.now() : 0, total = 0;
  function flush() {
    if (shown) { total += Date.now() - shown; shown = 0; }
    if (hasVid() && total > 1500) send({ e: 'pt', u: path, s: Math.round(total / 1000) });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); else shown = Date.now(); });
  addEventListener('pagehide', flush);

  // Si acepta o retira el consentimiento durante la visita
  document.addEventListener('plg:consent', function (ev) {
    var on = !!(ev.detail && ev.detail.analytics), had = hasVid();
    setVid(on);
    if (on && !had) send({ e: 'pv2', u: path });
  });

  document.addEventListener('submit', function (e) { if (e.target && e.target.closest && e.target.closest('.hgo')) send({ e: 'hero' }); }, true);
  document.addEventListener('click', function (e) { var a = e.target && e.target.closest && e.target.closest('.svc-go'); if (a) send({ e: 'svc' }); }, true);
})();
