/* Medición propia de plaiground: cuenta visitas y algunos clics de forma agregada.
   Sin cookies, sin identificadores y sin guardar la IP (ver /legal/privacidad/). */
(function () {
  'use strict';
  var p = location.pathname;
  if (p.indexOf('/admin') === 0 || navigator.webdriver) return;
  function send(o) {
    try {
      var body = JSON.stringify(o);
      if (navigator.sendBeacon && navigator.sendBeacon('/api/m', new Blob([body], { type: 'text/plain' }))) return;
      fetch('/api/m', { method: 'POST', body: body, keepalive: true, credentials: 'omit' }).catch(function () {});
    } catch (e) {}
  }
  window.plgTrack = function (e) { send({ e: e }); };
  var q = location.search;
  var page = p === '/' || p === '/index.html' ? 'home'
    : p.indexOf('/ai-barometer') === 0 ? (/[?&]caso=/.test(q) ? 'caso' : 'aibb')
    : p.indexOf('/data') === 0 ? 'data' : p.indexOf('/cv') === 0 ? 'cv'
    : p.indexOf('/barometer') === 0 ? 'barometer' : p.indexOf('/newsletter') === 0 ? 'newsletter'
    : p.indexOf('/legal') === 0 ? 'legal' : 'otra';
  var r = '';
  try { r = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
  var m = /[?&]utm_source=([a-z0-9._-]{1,40})/i.exec(q);
  if (m) { r = m[1].toLowerCase(); if (r.indexOf('.') < 0) r += '.com'; }
  send({ e: 'pv', p: page, r: r });
  document.addEventListener('submit', function (e) { if (e.target && e.target.closest && e.target.closest('.hgo')) send({ e: 'hero' }); }, true);
  document.addEventListener('click', function (e) { var a = e.target && e.target.closest && e.target.closest('.svc-go'); if (a) send({ e: 'svc' }); }, true);
})();
