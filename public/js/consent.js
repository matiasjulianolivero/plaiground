/*
 * plaiground · gestor de consentimiento de cookies
 * ------------------------------------------------
 * - Primera capa con "Aceptar todo", "Rechazar todo" y "Configurar" con el mismo peso visual (criterio AEPD).
 * - Guarda la elección 12 meses en localStorage ("plg-consent") y la vuelve a pedir si cambia CONSENT_VERSION.
 * - Las cookies técnicas no necesitan consentimiento y siempre están activas.
 * - Para añadir en el futuro un script de analítica o marketing SIN que se cargue antes del consentimiento:
 *     <script type="text/plain" data-cookie-category="analytics" data-src="https://..."></script>
 *     <script type="text/plain" data-cookie-category="marketing">/* código inline *\/</script>
 *   Solo se ejecutan cuando la persona acepta esa categoría.
 * - Cualquier enlace o botón con [data-cookie-settings] reabre el panel de configuración.
 * - API: window.plgConsent.get(), .open(), .has('analytics')
 */
(function () {
  'use strict';
  var KEY = 'plg-consent';
  var CONSENT_VERSION = 2; // 2: se añade la cookie analítica propia (plg_vid)
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 12 meses
  var CATEGORIES = ['analytics', 'marketing'];

  var T = {
    es: {
      title: 'Tu privacidad',
      text: 'Usamos almacenamiento técnico imprescindible y, solo si la aceptas, una cookie analítica propia para saber qué páginas visitas y cuánto tiempo. Si además nos dejas tu email, lo unimos para atenderte mejor. Puedes cambiar tu decisión cuando quieras.',
      policy: 'Política de cookies',
      accept: 'Aceptar todo',
      reject: 'Rechazar todo',
      config: 'Configurar',
      save: 'Guardar selección',
      prefsTitle: 'Configuración de cookies',
      nec: 'Técnicas (necesarias)',
      necD: 'Permiten que la web funcione y recuerdan tu idioma, tema y elección de cookies. No se pueden desactivar.',
      always: 'Siempre activas',
      analytics: 'Analíticas',
      analyticsD: 'Cookie propia (plg_vid, 12 meses) que recuerda qué páginas visitas, cuántas veces y cuánto tiempo. Si nos dejas tu email en un formulario, se une a tu ficha de contacto. No se comparte con terceros.',
      marketing: 'Marketing',
      marketingD: 'Servirían para medir campañas o mostrar publicidad. Ahora mismo no usamos ninguna.',
      close: 'Cerrar'
    },
    en: {
      title: 'Your privacy',
      text: 'We use essential technical storage and, only if you accept it, a first-party analytics cookie to see which pages you visit and for how long. If you also leave us your email, we link them to help you better. You can change your choice at any time.',
      policy: 'Cookie policy',
      accept: 'Accept all',
      reject: 'Reject all',
      config: 'Settings',
      save: 'Save choices',
      prefsTitle: 'Cookie settings',
      nec: 'Technical (necessary)',
      necD: 'They make the site work and remember your language, theme and cookie choice. They cannot be turned off.',
      always: 'Always on',
      analytics: 'Analytics',
      analyticsD: 'First-party cookie (plg_vid, 12 months) that remembers which pages you visit, how often and for how long. If you leave your email in a form, it is linked to your contact record. Not shared with third parties.',
      marketing: 'Marketing',
      marketingD: 'Would be used to measure campaigns or show ads. We do not use any right now.',
      close: 'Close'
    }
  };

  function lang() {
    var h = document.documentElement;
    var l = (h.getAttribute('data-lang') || h.lang || navigator.language || 'es').toLowerCase().slice(0, 2);
    return l === 'en' ? 'en' : 'es';
  }
  function t(k) { return T[lang()][k]; }

  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!c || c.v !== CONSENT_VERSION || !c.ts || Date.now() - c.ts > MAX_AGE_MS) return null;
      return c;
    } catch (e) { return null; }
  }
  function write(choice) {
    var c = { v: CONSENT_VERSION, ts: Date.now(), necessary: true };
    CATEGORIES.forEach(function (k) { c[k] = !!choice[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
    current = c;
    activate(c);
    try { document.dispatchEvent(new CustomEvent('plg:consent', { detail: c })); } catch (e) {}
    return c;
  }

  // Ejecuta los scripts bloqueados de las categorías aceptadas
  function activate(c) {
    if (!c) return;
    var blocked = document.querySelectorAll('script[type="text/plain"][data-cookie-category]');
    Array.prototype.forEach.call(blocked, function (old) {
      var cat = old.getAttribute('data-cookie-category');
      if (!c[cat] || old.getAttribute('data-activated')) return;
      var s = document.createElement('script');
      var src = old.getAttribute('data-src');
      if (src) { s.src = src; s.async = true; } else { s.text = old.text; }
      old.setAttribute('data-activated', '1');
      old.parentNode.insertBefore(s, old.nextSibling);
    });
  }

  var css = [
    '#plg-cc,#plg-cc *{box-sizing:border-box}',
    '#plg-cc{position:fixed;z-index:2147483000;left:16px;right:16px;bottom:16px;display:flex;justify-content:center;pointer-events:none;font:15px/1.5 "DM Sans",system-ui,-apple-system,"Segoe UI",sans-serif}',
    '#plg-cc .cc-box{pointer-events:auto;width:100%;max-width:720px;background:#14162E;color:#ECEEFF;border-radius:22px;padding:22px 24px;box-shadow:0 24px 60px rgba(0,0,0,.35);border:1px solid rgba(236,238,255,.12)}',
    '#plg-cc h2{font:800 18px/1.2 "Bricolage Grotesque","DM Sans",system-ui,sans-serif;margin:0 0 8px;letter-spacing:-.02em;color:#fff}',
    '#plg-cc p{margin:0 0 16px;color:#C9CCEA;font-size:14px}',
    '#plg-cc a{color:#B8B9FF;text-decoration:underline}',
    '#plg-cc .cc-btns{display:flex;flex-wrap:wrap;gap:10px}',
    '#plg-cc button{font:600 14px "DM Sans",system-ui,sans-serif;border-radius:999px;padding:11px 18px;cursor:pointer;border:1.5px solid #ECEEFF;flex:1 1 150px;min-height:44px}',
    '#plg-cc .cc-acc,#plg-cc .cc-rej{background:#ECEEFF;color:#14162E}',
    '#plg-cc .cc-cfg,#plg-cc .cc-save{background:transparent;color:#ECEEFF}',
    '#plg-cc button:focus-visible{outline:3px solid #8B8CF8;outline-offset:2px}',
    '#plg-cc .cc-cat{border-top:1px solid rgba(236,238,255,.12);padding:12px 0;display:flex;gap:16px;align-items:flex-start;justify-content:space-between}',
    '#plg-cc .cc-cat b{display:block;color:#fff;font-size:14px}',
    '#plg-cc .cc-cat small{display:block;color:#A3A8CC;font-size:13px;margin-top:2px}',
    '#plg-cc .cc-always{font-size:12px;color:#19B5A5;font-weight:700;white-space:nowrap;padding-top:2px}',
    '#plg-cc input[type=checkbox]{appearance:none;-webkit-appearance:none;flex:none;width:44px;height:26px;border-radius:999px;background:#3A3E6E;position:relative;cursor:pointer;margin:0;transition:background .2s}',
    '#plg-cc input[type=checkbox]::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}',
    '#plg-cc input[type=checkbox]:checked{background:#5F58EC}',
    '#plg-cc input[type=checkbox]:checked::after{transform:translateX(18px)}',
    '#plg-cc input[type=checkbox]:focus-visible{outline:3px solid #8B8CF8;outline-offset:2px}',
    '#plg-cc .cc-x{float:right;flex:none;min-height:0;width:34px;height:34px;padding:0;border:1px solid rgba(236,238,255,.25);background:transparent;color:#ECEEFF;font-size:18px;line-height:1}',
    '@media (max-width:520px){#plg-cc{left:8px;right:8px;bottom:8px}#plg-cc .cc-box{padding:18px}}',
    '@media (prefers-reduced-motion:no-preference){#plg-cc .cc-box{animation:plgccin .35s ease-out}}',
    '@keyframes plgccin{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}'
  ].join('');

  var root = null, mode = null, current = read();

  function ensureRoot() {
    if (root) return root;
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    root = document.createElement('div');
    root.id = 'plg-cc';
    document.body.appendChild(root);
    return root;
  }

  function render() {
    if (!mode) return;
    ensureRoot();
    var c = current || {};
    var html;
    if (mode === 'banner') {
      html = '<div class="cc-box" role="dialog" aria-live="polite" aria-labelledby="plg-cc-t" aria-describedby="plg-cc-d">' +
        '<h2 id="plg-cc-t">' + t('title') + '</h2>' +
        '<p id="plg-cc-d">' + t('text') + ' <a href="/legal/cookies/">' + t('policy') + '</a>.</p>' +
        '<div class="cc-btns">' +
        '<button type="button" class="cc-rej" data-a="reject">' + t('reject') + '</button>' +
        '<button type="button" class="cc-acc" data-a="accept">' + t('accept') + '</button>' +
        '<button type="button" class="cc-cfg" data-a="config">' + t('config') + '</button>' +
        '</div></div>';
    } else {
      html = '<div class="cc-box" role="dialog" aria-modal="false" aria-labelledby="plg-cc-t">' +
        '<button type="button" class="cc-x" data-a="close" aria-label="' + t('close') + '">×</button>' +
        '<h2 id="plg-cc-t">' + t('prefsTitle') + '</h2>' +
        '<p>' + t('text') + ' <a href="/legal/cookies/">' + t('policy') + '</a>.</p>' +
        '<div class="cc-cat"><div><b>' + t('nec') + '</b><small>' + t('necD') + '</small></div><span class="cc-always">' + t('always') + '</span></div>' +
        CATEGORIES.map(function (k) {
          return '<label class="cc-cat"><div><b>' + t(k) + '</b><small>' + t(k + 'D') + '</small></div>' +
            '<input type="checkbox" data-cat="' + k + '"' + (c[k] ? ' checked' : '') + ' aria-label="' + t(k) + '"></label>';
        }).join('') +
        '<div class="cc-btns" style="margin-top:8px">' +
        '<button type="button" class="cc-rej" data-a="reject">' + t('reject') + '</button>' +
        '<button type="button" class="cc-save" data-a="save">' + t('save') + '</button>' +
        '<button type="button" class="cc-acc" data-a="accept">' + t('accept') + '</button>' +
        '</div></div>';
    }
    root.innerHTML = html;
  }

  function show(m) { mode = m; render(); var b = root && root.querySelector('button'); if (m === 'prefs' && b) b.focus(); }
  function hide() { mode = null; if (root) root.innerHTML = ''; }

  function onClick(e) {
    var btn = e.target.closest && e.target.closest('#plg-cc [data-a]');
    if (btn) {
      var a = btn.getAttribute('data-a');
      if (a === 'accept') { write({ analytics: true, marketing: true }); hide(); }
      else if (a === 'reject') { write({}); hide(); }
      else if (a === 'config') { show('prefs'); }
      else if (a === 'close') { if (current) hide(); else show('banner'); }
      else if (a === 'save') {
        var ch = {};
        Array.prototype.forEach.call(root.querySelectorAll('input[data-cat]'), function (i) { ch[i.getAttribute('data-cat')] = i.checked; });
        write(ch); hide();
      }
      return;
    }
    var open = e.target.closest && e.target.closest('[data-cookie-settings]');
    if (open) { e.preventDefault(); show('prefs'); }
  }

  function init() {
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mode === 'prefs' && current) hide(); });
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-lang'] });
    if (current) activate(current); else show('banner');
  }

  window.plgConsent = {
    get: function () { return current; },
    has: function (cat) { return !!(current && current[cat]); },
    open: function () { show('prefs'); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
