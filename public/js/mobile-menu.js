/* plaiground · menú móvil: botón hamburguesa + panel de vidrio con los enlaces del header */
(function () {
  'use strict';
  var nav = document.querySelector('header .nav'), ul = nav && nav.querySelector('ul');
  if (!nav || !ul) return;
  var css = document.createElement('style');
  css.textContent = '.mm-btn{display:none;flex:none;width:36px;height:36px;border-radius:50%;border:1px solid rgba(20,22,46,.10);background:var(--gl-chip,rgba(255,255,255,.4));color:var(--ink,#14162E);cursor:pointer;align-items:center;justify-content:center;padding:0}' +
    '.mm-btn span{position:relative;width:18px;height:2px;border-radius:2px;background:currentColor;transition:background .2s}.mm-btn span::before,.mm-btn span::after{content:"";position:absolute;left:0;width:18px;height:2px;border-radius:2px;background:currentColor;transition:transform .25s}' +
    '.mm-btn span::before{top:-6px}.mm-btn span::after{top:6px}.mm-open .mm-btn span{background:transparent}.mm-open .mm-btn span::before{transform:translateY(6px) rotate(45deg)}.mm-open .mm-btn span::after{transform:translateY(-6px) rotate(-45deg)}' +
    '.mm-panel{position:absolute;left:0;right:0;top:calc(100% + 10px);padding:10px;border-radius:26px;background:#FAFAFF;box-shadow:inset 0 1px 0 var(--gl-hi,#fff),var(--gl-sh2,0 14px 38px rgba(20,22,46,.16));border:1px solid rgba(255,255,255,.35);opacity:0;transform:translateY(-8px);pointer-events:none;transition:opacity .2s,transform .2s;z-index:60}' +
    'html[data-theme="dark"] .mm-panel{border-color:rgba(255,255,255,.12);background:#15183A}' +
    '.mm-open .mm-panel{opacity:1;transform:none;pointer-events:auto}' +
    '.mm-panel a{display:flex;align-items:center;gap:8px;padding:14px 16px;border-radius:16px;text-decoration:none;color:var(--ink,#14162E);font:600 17px var(--body,system-ui)}' +
    '.mm-panel a:hover,.mm-panel a:focus-visible{background:rgba(67,56,202,.08)}.mm-panel a.cta{justify-content:center;margin-top:6px;background:var(--ink,#14162E);color:var(--bg,#fff)}' +
    'html[data-theme="dark"] .mm-btn{border-color:rgba(255,255,255,.12)}.mm-btn span,.mm-btn span::before,.mm-btn span::after{width:16px}.mm-btn span::before{top:-5px}.mm-btn span::after{top:5px}.mm-open .mm-btn span::before{transform:translateY(5px) rotate(45deg)}.mm-open .mm-btn span::after{transform:translateY(-5px) rotate(-45deg)}' +
    '@media (max-width:860px){.mm-btn{display:inline-flex}}@media (max-width:560px){header .nav ul{display:none!important}header .nav{gap:8px;padding-right:10px!important}header .nav .lang{margin-left:auto}html:not([data-theme="dark"]) header .nav .lang,html:not([data-theme="dark"]) header .nav .theme{border-color:rgba(20,22,46,.10)}}';
  document.head.appendChild(css);
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'mm-btn'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'mmPanel');
  btn.setAttribute('aria-label', 'Menú / Menu'); btn.innerHTML = '<span aria-hidden="true"></span>';
  var panel = document.createElement('div'); panel.className = 'mm-panel'; panel.id = 'mmPanel';
  ul.querySelectorAll('a').forEach(function (a) { var c = a.cloneNode(true); c.removeAttribute('id'); panel.appendChild(c); });
  nav.appendChild(btn); nav.appendChild(panel);
  function set(open) { nav.classList.toggle('mm-open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  btn.addEventListener('click', function (e) { e.stopPropagation(); set(!nav.classList.contains('mm-open')); });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('mm-open')) { set(false); btn.focus(); } });
  addEventListener('resize', function () { if (innerWidth > 860) set(false); });
})();
