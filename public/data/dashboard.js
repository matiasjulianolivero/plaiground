/*
 * Data plaiground · dashboard interactivo (estilo Franchise Brand Barometer)
 * PLGDash.mount(el, dashboard, { lang, mode: 'app' | 'viewer', onShare, onPdf, onBack, shareInfo })
 * Secciones: portada + KPIs con sparklines · explorador (líneas / apiladas / mapa de calor + ranking) ·
 * tablas con mapa de calor · hallazgos · relaciones visuales · plan de acción · ideas.
 * Usa PLGEngine (formato) y solo datos agregados guardados en el dashboard.
 */
(function () {
  'use strict';
  var PAL = {
    light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#8a8eac'],
    dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767', '#7c809f']
  };
  var SEQ = ['#e6eefb', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#2a78d6', '#1c5cab', '#104281', '#0d366b'];
  var SEQ_D = ['#1d2448', '#1c2f5e', '#1c3f7d', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#6da7ec', '#9ec5f4'];

  var CSS = `
.pd{--g1:#4338CA;--g2:#FF7A59;--g3:#19B5A5;--glass:rgba(255,255,255,.72);--glass-b:rgba(255,255,255,.85);--shadow:0 18px 50px rgba(28,30,80,.10);position:relative}
html[data-theme="dark"] .pd{--glass:rgba(24,27,62,.72);--glass-b:rgba(236,238,255,.10);--shadow:0 18px 50px rgba(0,0,0,.35)}
.pd-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(40% 45% at 10% 0%,rgba(139,140,248,.32),transparent 70%),radial-gradient(35% 40% at 95% 10%,rgba(255,122,89,.22),transparent 70%),radial-gradient(40% 45% at 85% 95%,rgba(25,181,165,.20),transparent 70%),radial-gradient(35% 40% at 5% 90%,rgba(224,161,0,.14),transparent 70%)}
.pd .glass{background:var(--glass);border:1px solid var(--glass-b);border-radius:26px;box-shadow:var(--shadow);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.pd-nav{position:sticky;top:72px;z-index:15;display:flex;gap:6px;align-items:center;padding:6px;margin:0 0 26px;overflow-x:auto;scrollbar-width:none}
.pd-nav::-webkit-scrollbar{display:none}
.pd-nav a{flex:none;text-decoration:none;color:var(--muted);font-weight:600;font-size:14px;padding:9px 15px;border-radius:999px;white-space:nowrap}
.pd-nav a:hover{color:var(--ink);background:var(--soft)}
.pd-nav a.on{background:var(--cta-bg);color:var(--cta-fg)}
.pd-nav .sp{flex:1}
.pd-nav button{flex:none;border:1px solid var(--line);background:var(--paper);color:var(--ink);font:600 14px var(--body);padding:9px 15px;border-radius:999px;cursor:pointer;white-space:nowrap}
.pd-nav button.pri{background:linear-gradient(100deg,#4338CA,#7C5CFF 55%,#FF7A59);color:#fff;border:0}
.pd-hero{padding:6px 0 10px}
.pd-badge{display:inline-flex;align-items:center;gap:12px}
.pd-badge .ic{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#4338CA,#FF7A59 60%,#19B5A5);color:#fff;box-shadow:0 10px 24px rgba(67,56,202,.35)}
.pd-badge .ic svg{width:22px;height:22px}
.pd-badge b{font:800 clamp(18px,2vw,22px)/1.1 var(--display);letter-spacing:-.03em}
.pd-badge span{font:700 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--ind);border:1.5px solid color-mix(in srgb,var(--ind) 40%,transparent);border-radius:999px;padding:5px 10px}
.pd-title{font:800 clamp(38px,6vw,76px)/.98 var(--display);letter-spacing:-.045em;margin:22px 0 16px;max-width:1100px}
.pd-title em{font-style:normal;background:linear-gradient(100deg,#4338CA 0%,#9a4fd8 35%,#FF7A59 65%,#19B5A5 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.pd-sum{font-size:clamp(16px,1.5vw,19px);color:var(--muted);max-width:860px;margin:0 0 20px;line-height:1.55}
.pd-chips{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 30px}
.pd-chip{background:var(--glass);border:1px solid var(--glass-b);border-radius:999px;padding:9px 16px;font-size:14px;color:var(--muted);box-shadow:0 6px 18px rgba(28,30,80,.06)}
.pd-chip b{color:var(--ink);font:800 16px var(--display);letter-spacing:-.02em;margin-right:4px}
.pd-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:16px;margin-bottom:18px}
.pd-kpi{padding:22px 22px 14px;position:relative;overflow:hidden}
.pd-kpi small{display:block;font-size:13px;font-weight:700;color:var(--muted);letter-spacing:.02em}
.pd-kpi .v{display:block;font:800 clamp(34px,3.6vw,48px)/1 var(--display);letter-spacing:-.045em;margin:12px 0 10px;font-variant-numeric:tabular-nums}
.pd-kpi:first-child .v{background:linear-gradient(100deg,#4338CA,#9a4fd8 45%,#FF7A59 80%);-webkit-background-clip:text;background-clip:text;color:transparent}
.pd-delta{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:700;border-radius:999px;padding:4px 10px}
.pd-delta.up{background:color-mix(in srgb,var(--good) 14%,transparent);color:var(--good)}
.pd-delta.down{background:color-mix(in srgb,var(--bad) 14%,transparent);color:var(--bad)}
.pd-kpi .n{font-size:12px;color:var(--muted);margin-left:8px}
.pd-kpi svg{display:block;width:100%;height:46px;margin-top:12px}
.pd-warn{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--muted);padding:12px 16px;margin:0 0 8px}
.pd-sec{margin-top:64px;scroll-margin-top:140px}
.pd-eye{font:700 12px var(--body);letter-spacing:.2em;text-transform:uppercase;color:var(--ind)}
.pd-h2{font:800 clamp(30px,3.6vw,46px)/1.02 var(--display);letter-spacing:-.04em;margin:10px 0 10px}
.pd-lead{color:var(--muted);font-size:16.5px;max-width:760px;margin:0 0 22px}
.pd-hl{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:16px}
.pd-card{padding:20px 22px;position:relative;min-width:0}
.pd-card h4{font:700 16px var(--body);margin:0 0 2px}.pd-card .pdsub{font-size:13px;color:var(--muted);margin:0 0 10px}
.pd-card svg,.pd-main svg{display:block;width:100%;height:auto;overflow:visible}
.pd svg text{font-family:var(--body);fill:var(--muted);font-size:11px}
.pd svg .lab{fill:var(--ink);font-weight:600;font-size:12px}
.pd svg .val{fill:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
.pd .tip{position:absolute;pointer-events:none;background:var(--cta-bg);color:var(--cta-fg);font-size:13px;line-height:1.45;padding:9px 12px;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.22);opacity:0;transition:opacity .12s;z-index:6;max-width:300px}
.pd .tip i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px}
.pd .tip .r{display:flex;justify-content:space-between;gap:14px;white-space:nowrap}
.pd-ex{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px}
@media (max-width:1000px){.pd-ex{grid-template-columns:minmax(0,1fr)}}
.pd-ctrl{display:flex;flex-wrap:wrap;gap:12px 18px;align-items:flex-end;padding:16px 18px;margin-bottom:16px}
.pd-ctrl .g{display:flex;flex-direction:column;gap:7px;min-width:0}
.pd-ctrl label,.pd-ctrl .lb{font:700 11px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.pd-pills{display:flex;flex-wrap:wrap;gap:6px}
.pd-pills button{border:1px solid var(--line);background:var(--paper);color:var(--ink);font:600 13.5px var(--body);padding:8px 13px;border-radius:999px;cursor:pointer;min-height:38px}
.pd-pills button[aria-pressed="true"]{background:var(--cta-bg);color:var(--cta-fg);border-color:transparent}
.pd-pills button[disabled]{opacity:.4;cursor:not-allowed}
.pd select{font:600 14px var(--body);color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:9px 12px;min-height:40px;max-width:100%}
.pd-main{padding:20px 22px;min-width:0;position:relative}
.pd-main .hd{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 16px;align-items:baseline;margin-bottom:6px}
.pd-main .hd b{font:800 22px var(--display);letter-spacing:-.03em}
.pd-main .big{font:800 30px var(--display);letter-spacing:-.04em}
.pd-legend{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 6px}
.pd-legend button{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:var(--paper);color:var(--ink);font:600 12.5px var(--body);padding:5px 10px;border-radius:999px;cursor:pointer}
.pd-legend button i{width:10px;height:10px;border-radius:3px}
.pd-legend button[aria-pressed="false"]{opacity:.45;text-decoration:line-through}
.pd-rank{padding:18px;min-width:0}
.pd-rank h4{font:800 18px var(--display);letter-spacing:-.02em;margin:0 0 2px}
.pd-rank .pdsub{font-size:12.5px;color:var(--muted);margin:0 0 12px}
.pd-rank ol{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.pd-rank li button{width:100%;display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:4px 10px;align-items:center;text-align:left;border:0;background:transparent;color:var(--ink);font:inherit;padding:9px 10px;border-radius:14px;cursor:pointer}
.pd-rank li button:hover{background:var(--soft)}
.pd-rank li button[aria-pressed="true"]{background:var(--cta-bg);color:var(--cta-fg)}
.pd-rank .n{font-weight:700;font-size:13px;opacity:.6}
.pd-rank .nm{font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pd-rank .vl{font:800 15px var(--display);font-variant-numeric:tabular-nums;text-align:right}
.pd-rank .pdbar{grid-column:2/4;height:7px;border-radius:99px;background:var(--soft);overflow:hidden;display:flex}
.pd-rank .pdbar span{display:block;height:100%;border-radius:99px}
.pd-rank .pdch{grid-column:2/4;font-size:12px;opacity:.8;display:flex;justify-content:space-between}
.pd-detail{margin-top:12px;padding:14px;border-radius:18px;background:var(--soft);font-size:13.5px}
.pd-detail b{font:800 17px var(--display)}
.pd-heat{display:grid;gap:3px;font-size:11.5px}
.pd-heat .c{height:30px;border-radius:6px;cursor:default}
.pd-heat .l{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:8px;font-weight:600;align-self:center;font-size:12.5px}
.pd-heat .m{text-align:center;color:var(--muted);font-size:10.5px}
.pd-heatkey{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);margin-top:10px}
.pd-heatkey span{height:8px;width:140px;border-radius:99px;display:block}
.pd-tbl{overflow:auto;max-height:560px;border-radius:18px}
.pd-tbl table{border-collapse:separate;border-spacing:0 5px;width:100%;font-size:13.5px;font-variant-numeric:tabular-nums}
.pd-tbl th{position:sticky;top:0;background:var(--glass);backdrop-filter:blur(10px);font:700 11.5px var(--body);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);text-align:right;padding:8px 10px;cursor:pointer;white-space:nowrap;z-index:1}
.pd-tbl th:first-child{text-align:left}
.pd-tbl td{padding:4px 6px;text-align:right;white-space:nowrap}
.pd-tbl td:first-child{text-align:left;font-weight:700;padding-left:8px;max-width:260px;overflow:hidden;text-overflow:ellipsis}
.pd-tbl td small{display:block;font-weight:500;color:var(--muted);font-size:11.5px}
.pd-tbl td .h{display:inline-block;min-width:84px;padding:7px 10px;border-radius:10px;font-weight:700;text-align:center}
.pd-search{font:500 15px var(--body);color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:999px;padding:10px 16px;min-width:220px}
.pd-ins{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px}
.pd-in{padding:20px;display:flex;flex-direction:column;gap:10px}
.pd-in .k{display:inline-flex;align-items:center;gap:8px;font:700 11px var(--body);letter-spacing:.14em;text-transform:uppercase}
.pd-in .k i{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;color:#fff;font-style:normal;font-size:14px}
.pd-in p{margin:0;font-size:15px;line-height:1.5}
.pd-rel{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:14px}
.pd-rel .glass{padding:18px 20px}
.pd-rel .rv{font:800 32px var(--display);letter-spacing:-.04em;white-space:nowrap}
.pd-rel .rl{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.12em}
.pd-rel .pair{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;margin:6px 0}
.pd-rel .pair span{display:inline-flex;align-items:center;gap:6px}.pd-rel .pair i{width:14px;height:3px;border-radius:2px;display:inline-block}
.pd-rel svg{width:100%;height:110px;display:block}
.pd-plan{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:14px}
.pd-col{padding:16px}
.pd-col h4{font:800 17px var(--display);margin:0 0 12px;display:flex;justify-content:space-between;align-items:center}
.pd-col h4 span{font:700 12px var(--body);color:var(--muted)}
.pd-act{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:14px;margin-bottom:10px;display:grid;gap:8px}
.pd-act .t{font-weight:600;font-size:14.5px;line-height:1.45}
.pd-act .e{font-size:12.5px;color:var(--good);font-weight:700}
.pd-act .tags{display:flex;flex-wrap:wrap;gap:6px}
.pd-act .tags span{font-size:11.5px;font-weight:700;border-radius:999px;padding:4px 9px;background:var(--soft);color:var(--muted)}
.pd-act .tags span.hi{background:color-mix(in srgb,#FF7A59 18%,transparent);color:#c2410c}
.pd-act .tags span.lo{background:color-mix(in srgb,var(--good) 14%,transparent);color:var(--good)}
.pd-ideas{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:12px;counter-reset:i}
.pd-ideas div{padding:18px;counter-increment:i;font-size:14.5px}
.pd-ideas div::before{content:counter(i,decimal-leading-zero);display:block;font:800 22px var(--display);background:linear-gradient(100deg,#4338CA,#FF7A59);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:6px}
.pd-foot{margin-top:40px;font-size:13px;color:var(--muted)}
.pd-empty{padding:18px;color:var(--muted);font-size:14px}
@media (max-width:640px){.pd-nav{top:64px}.pd-kpi .v{font-size:36px}.pd-heat{font-size:10px}}
@media print{.pd-bg,.pd-nav,.pd-ctrl,.pd-legend{display:none!important}.pd .glass{box-shadow:none;backdrop-filter:none;background:#fff;border:1px solid #ddd}.pd-sec{break-inside:avoid;margin-top:28px}.pd-tbl{max-height:none}}
`;
  var styled = false;
  function addCss() { if (styled) return; styled = true; var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
  var dark = function () { return document.documentElement.getAttribute('data-theme') === 'dark'; };
  var pal = function () { return dark() ? PAL.dark : PAL.light; };
  var cssv = function (v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var sumA = function (a) { return a.reduce(function (x, y) { return x + (y || 0); }, 0); };
  var valid = function (a) { return a.filter(function (v) { return typeof v === 'number' && isFinite(v); }); };
  function aggr(vals, agg) { var v = valid(vals); if (!v.length) return null; return agg === 'mean' ? sumA(v) / v.length : sumA(v); }

  function mount(el, d, opt) {
    addCss();
    var L = opt.lang || 'es', en = L === 'en', tr = function (es, e) { return en ? e : es; };
    var E = window.PLGEngine, F = function (v, u) { return E.fmt(v, u, L); }, P = function (x) { return E.pctTxt(x, L); }, MN = function (k) { return E.monthName(k, L); };
    var r = d.result || {}, cube = r.cube || { sheets: [], rels: [] };
    var AUD = { ceo: tr('Dirección', 'Leadership'), mkt: tr('Equipo de marketing', 'Marketing team'), inv: tr('Inversores', 'Investors') };
    var timeSheets = cube.sheets.filter(function (s) { return s.kind === 'time' && s.measures.length; });
    var tables = cube.sheets.filter(function (s) { return s.kind === 'table' && s.rows.length; });
    var st = { s: 0, m: 0, by: 'total', per: '12', view: 'line', hidden: {}, sel: null, tbl: 0, sort: 2, dir: -1, q: '' };
    if (timeSheets[0]) { var c0 = timeSheets[0].cats[0]; if (c0 && timeSheets[0].measures[0].by[c0]) st.by = c0; }

    var company = d.company || '', title = d.title || '';
    var titleHtml = company && title.toLowerCase().indexOf(company.toLowerCase()) >= 0 ? esc(title).replace(esc(company), '<em>' + esc(company) + '</em>') : (company ? '<em>' + esc(company) + '</em> · ' + esc(title) : '<em>' + esc(title) + '</em>');
    var nSheets = cube.sheets.length, nMonths = timeSheets.reduce(function (a, s) { return Math.max(a, s.months.length); }, 0);
    var nFind = (r.insights || []).length + (r.opportunities || []).length + (r.relationships || []).length;
    var sections = [['pd-top', tr('Resumen', 'Summary')]];
    if ((r.charts || []).length) sections.push(['pd-hl', tr('Lo más importante', 'Highlights')]);
    if (timeSheets.length) sections.push(['pd-ex', tr('Explorar', 'Explore')]);
    if (tables.length) sections.push(['pd-tb', tr('Rankings', 'Rankings')]);
    if (nFind) sections.push(['pd-find', tr('Hallazgos', 'Findings')]);
    if ((cube.rels || []).length || (r.relationships || []).length) sections.push(['pd-rel', tr('Relaciones', 'Relationships')]);
    if ((r.actions || []).length) sections.push(['pd-plan', tr('Plan de acción', 'Action plan')]);

    el.innerHTML = '<div class="pd"><div class="pd-bg"></div>' +
      '<nav class="pd-nav glass" aria-label="' + tr('Secciones', 'Sections') + '">' + sections.map(function (s, i) { return '<a href="#' + s[0] + '"' + (i ? '' : ' class="on"') + '>' + s[1] + '</a>'; }).join('') + '<span class="sp"></span>' +
      (opt.onPdf ? '<button type="button" data-a="pdf">' + tr('Descargar PDF', 'Download PDF') + '</button>' : '') + (opt.onShare ? '<button type="button" class="pri" data-a="share">' + tr('Compartir', 'Share') + '</button>' : '') + '</nav>' +
      '<section id="pd-top" class="pd-hero"><div class="pd-badge"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 20V11M12 20V5M18 20v-7"/></svg></span><b>Data plaiground</b><span>' + (r.mode === 'ai' ? tr('Análisis con IA', 'AI analysis') : tr('Análisis automático', 'Automatic analysis')) + ' · ' + new Date(d.ts || Date.now()).toLocaleDateString(en ? 'en-GB' : 'es-ES', { month: 'short', year: 'numeric' }) + '</span></div>' +
      '<h1 class="pd-title">' + titleHtml + '</h1>' + (r.summary ? '<p class="pd-sum">' + esc(r.summary) + '</p>' : '') +
      '<div class="pd-chips">' + (nSheets ? '<span class="pd-chip"><b>' + nSheets + '</b>' + (nSheets === 1 ? tr('hoja', 'sheet') : tr('hojas', 'sheets')) + '</span>' : '') + (nMonths ? '<span class="pd-chip"><b>' + nMonths + '</b>' + tr('meses', 'months') + '</span>' : '') + (nFind ? '<span class="pd-chip"><b>' + nFind + '</b>' + tr('hallazgos', 'findings') + '</span>' : '') + ((r.actions || []).length ? '<span class="pd-chip"><b>' + r.actions.length + '</b>' + tr('acciones', 'actions') + '</span>' : '') +
      '<span class="pd-chip">' + tr('Para', 'For') + ' <b style="font-size:14px">' + (AUD[d.aud] || AUD.ceo) + '</b></span>' + (d.goal ? '<span class="pd-chip">' + tr('Objetivo', 'Goal') + ': <b style="font-size:14px">' + esc(d.goal) + '</b></span>' : '') + '</div>' +
      '<div class="pd-kpis" id="pd-kpis"></div>' +
      '<div class="pd-warn glass">⚠︎ <span>' + (opt.mode === 'viewer' ? tr('Análisis generado automáticamente a partir de los datos de su autor. Puede contener errores: contrasta las conclusiones antes de decidir.', 'Analysis generated automatically from its author’s data. It may contain errors: check the conclusions before deciding.') : r.mode === 'ai' ? tr('Las cifras se calculan con código a partir de tu archivo; los textos los redacta la IA y pueden contener errores. Revísalo antes de presentarlo.', 'Figures are computed with code from your file; the text is written by AI and may contain errors. Review it before presenting.') : tr('Las cifras se calculan con código a partir de tu archivo. El análisis automático puede interpretar mal alguna columna: revísalo antes de presentarlo.', 'Figures are computed with code from your file. The automatic analysis may misread a column: review it before presenting.')) + '</span></div></section>' +
      ((r.charts || []).length ? '<section id="pd-hl" class="pd-sec"><div class="pd-eye">' + tr('Lo más importante', 'Highlights') + '</div><h2 class="pd-h2">' + tr('Los gráficos que cuentan la historia', 'The charts that tell the story') + '</h2><div class="pd-hl" id="pd-hlg"></div></section>' : '') +
      (timeSheets.length ? '<section id="pd-ex" class="pd-sec"><div class="pd-eye">' + tr('Explorador', 'Explorer') + '</div><h2 class="pd-h2">' + tr('Explora tus datos a tu manera', 'Explore your data your way') + '</h2><p class="pd-lead">' + tr('Elige una hoja, una métrica y cómo desglosarla. Pasa el cursor por los gráficos y pulsa en el ranking para destacar una categoría.', 'Pick a sheet, a metric and how to break it down. Hover the charts and click the ranking to highlight a category.') + '</p><div class="pd-ctrl glass" id="pd-ctrl"></div><div class="pd-ex"><div class="pd-main glass" id="pd-main"></div><div class="pd-rank glass" id="pd-rank"></div></div></section>' : '') +
      (tables.length ? '<section id="pd-tb" class="pd-sec"><div class="pd-eye">' + tr('Rankings', 'Rankings') + '</div><h2 class="pd-h2">' + tr('Quién destaca y quién se queda atrás', 'Who stands out and who lags behind') + '</h2><p class="pd-lead">' + tr('Cada color es más intenso cuanto más alto es el valor en esa columna. Ordena pulsando en cualquier cabecera.', 'The more intense the color, the higher the value in that column. Sort by clicking any header.') + '</p><div class="glass pd-card" id="pd-tbw"></div></section>' : '') +
      (nFind ? '<section id="pd-find" class="pd-sec"><div class="pd-eye">' + tr('Hallazgos', 'Findings') + '</div><h2 class="pd-h2">' + tr('Lo que dicen tus datos', 'What your data is saying') + '</h2><div class="pd-ins" id="pd-ins"></div></section>' : '') +
      ((cube.rels || []).length || (r.relationships || []).length ? '<section id="pd-rel" class="pd-sec"><div class="pd-eye">' + tr('Relaciones', 'Relationships') + '</div><h2 class="pd-h2">' + tr('Qué se mueve a la vez', 'What moves together') + '</h2><p class="pd-lead">' + tr('Series indexadas (primer mes = 100) para comparar su forma. Correlación no es causalidad, pero señala dónde mirar.', 'Indexed series (first month = 100) to compare their shape. Correlation isn’t causation, but it shows where to look.') + '</p><div class="pd-rel" id="pd-relg"></div></section>' : '') +
      ((r.actions || []).length ? '<section id="pd-plan" class="pd-sec"><div class="pd-eye">' + tr('Plan de acción', 'Action plan') + '</div><h2 class="pd-h2">' + tr('Qué hacer a continuación', 'What to do next') + '</h2><div class="pd-plan" id="pd-plang"></div>' + ((r.ideas || []).length ? '<h3 style="font:800 22px var(--display);margin:34px 0 12px">' + tr('Ideas para profundizar', 'Ideas to dig deeper') + '</h3><div class="pd-ideas">' + r.ideas.map(function (x) { return '<div class="glass">' + esc(x) + '</div>'; }).join('') + '</div>' : '') + '</section>' : '') +
      '<p class="pd-foot">' + (opt.footer || '') + '</p></div>';

    var $ = function (s) { return el.querySelector(s); };
    el.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { if (b.dataset.a === 'pdf') opt.onPdf(); else opt.onShare(); }; });
    // navegación activa
    var links = el.querySelectorAll('.pd-nav a');
    links.forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var t = el.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }; });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + x.target.id); }); }); }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach(function (s) { var t = el.querySelector('#' + s[0]); if (t) io.observe(t); });
    }

    /* ---------- dibujo ---------- */
    function spark(svg, vals, color) {
      var W = Math.max(120, svg.clientWidth || 220), H = 46, v = vals.map(function (x) { return typeof x === 'number' ? x : null; });
      var nums = valid(v); if (nums.length < 2) { svg.innerHTML = ''; return; }
      var mn = Math.min.apply(null, nums), mx = Math.max.apply(null, nums); if (mx === mn) mx = mn + 1;
      var x = function (i) { return 2 + i * (W - 4) / (v.length - 1); }, y = function (z) { return 4 + (1 - (z - mn) / (mx - mn)) * (H - 8); };
      var pts = v.map(function (z, i) { return z === null ? null : x(i) + ',' + y(z); }).filter(Boolean);
      var id = 'g' + Math.random().toString(36).slice(2, 7);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.innerHTML = '<defs><linearGradient id="' + id + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".35"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="M' + pts[0].split(',')[0] + ',' + H + ' L' + pts.join(' L') + ' L' + pts[pts.length - 1].split(',')[0] + ',' + H + ' Z" fill="url(#' + id + ')"/>' +
        '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<circle cx="' + pts[pts.length - 1].split(',')[0] + '" cy="' + pts[pts.length - 1].split(',')[1] + '" r="3.5" fill="' + color + '"/>';
    }
    // líneas (multi-serie) o columnas apiladas
    function timeChart(svg, tip, months, series, unit, kind, highlight) {
      var W = Math.max(300, Math.round(svg.clientWidth || 700)), H = W < 520 ? 260 : 340, pl = 64, pr = series.length <= 4 && kind === 'line' && W > 560 ? 120 : 18, pt = 16, pb = 32, n = months.length;
      var vis = series.filter(function (s) { return !s.hidden; });
      var tops = kind === 'stack' ? months.map(function (_, i) { return sumA(vis.map(function (s) { return Math.max(0, s.values[i] || 0); })); }) : [].concat.apply([], vis.map(function (s) { return valid(s.values); }));
      var mx = Math.max.apply(null, tops.concat([0])), mn = kind === 'stack' ? 0 : Math.min.apply(null, tops.concat([0]));
      if (mx === mn) mx = mn + 1; mx += (mx - mn) * 0.06;
      var bw = (W - pl - pr) / n, x = kind === 'stack' ? function (i) { return pl + bw * i + bw / 2; } : function (i) { return pl + i * (W - pl - pr) / Math.max(1, n - 1); };
      var y = function (v) { return pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb); };
      var g = '';
      for (var k = 0; k <= 4; k++) { var vv = mn + (mx - mn) * k / 4; g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(vv) + '" y2="' + y(vv) + '" stroke="' + cssv('--grid') + '"/><text x="' + (pl - 8) + '" y="' + (y(vv) + 4) + '" text-anchor="end">' + F(vv, unit).replace(/ ?[€$]$/, '') + '</text>'; }
      var step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - pl - pr) / 78))));
      months.forEach(function (m, i) { if ((i % step === 0 && x(n - 1) - x(i) >= 70) || i === n - 1) g += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + MN(m) + '</text>'; });
      if (kind === 'stack') {
        months.forEach(function (_, i) { var acc = 0; vis.forEach(function (s) { var v = Math.max(0, s.values[i] || 0); if (!v) return; var y1 = y(acc + v), h = y(acc) - y1; g += '<rect x="' + (x(i) - bw * 0.36) + '" y="' + y1 + '" width="' + Math.max(2, bw * 0.72) + '" height="' + Math.max(0, h - 1.5) + '" rx="3" fill="' + s.color + '" opacity="' + (highlight && highlight !== s.name ? 0.25 : 1) + '"/>'; acc += v; }); });
      } else {
        vis.forEach(function (s) {
          var dim = highlight && highlight !== s.name, segs = [], cur = [];
          s.values.forEach(function (v, i) { if (typeof v === 'number') cur.push(x(i) + ',' + y(v)); else if (cur.length) { segs.push(cur); cur = []; } }); if (cur.length) segs.push(cur);
          if (vis.length === 1) segs.forEach(function (sg) { g += '<path d="M' + sg[0].split(',')[0] + ',' + y(Math.max(mn, 0)) + ' L' + sg.join(' L') + ' L' + sg[sg.length - 1].split(',')[0] + ',' + y(Math.max(mn, 0)) + ' Z" fill="' + s.color + '" opacity=".10"/>'; });
          segs.forEach(function (sg) { g += '<polyline points="' + sg.join(' ') + '" fill="none" stroke="' + s.color + '" stroke-width="' + (highlight === s.name ? 3.5 : 2.25) + '" opacity="' + (dim ? 0.2 : 1) + '" stroke-linejoin="round" stroke-linecap="round"/>'; });
          var li = -1; s.values.forEach(function (v, i) { if (typeof v === 'number') li = i; });
          if (li >= 0) { g += '<circle cx="' + x(li) + '" cy="' + y(s.values[li]) + '" r="4" fill="' + s.color + '" stroke="' + cssv('--paper') + '" stroke-width="2" opacity="' + (dim ? 0.2 : 1) + '"/>'; if (pr > 60) g += '<text class="lab" x="' + (x(li) + 9) + '" y="' + (y(s.values[li]) + 4) + '" opacity="' + (dim ? 0.3 : 1) + '">' + esc(s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name) + '</text>'; }
        });
      }
      g += '<line class="xh" y1="' + pt + '" y2="' + (H - pb) + '" stroke="' + cssv('--muted') + '" stroke-dasharray="3 3" opacity="0"/><rect class="hit" x="' + pl + '" y="' + pt + '" width="' + (W - pl - pr) + '" height="' + (H - pt - pb) + '" fill="transparent"/>';
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.innerHTML = g;
      var hit = svg.querySelector('.hit'), xh = svg.querySelector('.xh'), card = svg.parentNode;
      hit.addEventListener('pointermove', function (ev) {
        var rc = svg.getBoundingClientRect(), sx = (ev.clientX - rc.left) * W / rc.width;
        var i = kind === 'stack' ? Math.floor((sx - pl) / bw) : Math.round((sx - pl) / ((W - pl - pr) / Math.max(1, n - 1))); i = Math.max(0, Math.min(n - 1, i));
        xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('opacity', 1);
        var rows = vis.map(function (s) { return { s: s, v: s.values[i] }; }).filter(function (o) { return typeof o.v === 'number'; }).sort(function (a, b) { return b.v - a.v; });
        var tot = kind === 'stack' && rows.length > 1 ? '<div class="r" style="border-top:1px solid rgba(255,255,255,.2);margin-top:4px;padding-top:4px"><span>Total</span><b>' + F(sumA(rows.map(function (o) { return o.v; })), unit) + '</b></div>' : '';
        tip.innerHTML = '<b>' + MN(months[i]) + '</b>' + rows.slice(0, 9).map(function (o) { return '<div class="r"><span><i style="background:' + o.s.color + '"></i>' + esc(o.s.name) + '</span><b>' + F(o.v, unit) + '</b></div>'; }).join('') + tot;
        var cr = card.getBoundingClientRect(), px = rc.left - cr.left + x(i) * rc.width / W;
        tip.style.opacity = 1; tip.style.left = Math.min(Math.max(8, px + 16), cr.width - tip.offsetWidth - 8) + 'px'; tip.style.top = Math.max(8, ev.clientY - cr.top - tip.offsetHeight / 2) + 'px';
      });
      hit.addEventListener('pointerleave', function () { tip.style.opacity = 0; xh.setAttribute('opacity', 0); });
    }
    function ramp(t) { var R = dark() ? SEQ_D : SEQ; return R[Math.max(0, Math.min(R.length - 1, Math.round(t * (R.length - 1))))]; }
    function heat(box, tip, months, series, unit) {
      var all = valid([].concat.apply([], series.map(function (s) { return s.values; }))), mn = Math.min.apply(null, all), mx = Math.max.apply(null, all); if (mx === mn) mx = mn + 1;
      var n = months.length, every = n > 18 ? 3 : n > 12 ? 2 : 1;
      var h = '<div class="pd-heat" style="grid-template-columns:minmax(90px,170px) repeat(' + n + ',minmax(0,1fr))"><div></div>' + months.map(function (m, i) { return '<div class="m">' + (i % every === 0 ? esc(MN(m).replace(/ \d{2}(\d{2})$/, " '$1")) : '') + '</div>'; }).join('');
      series.forEach(function (s, si) { h += '<div class="l" title="' + esc(s.name) + '">' + esc(s.name) + '</div>' + s.values.map(function (v, i) { var t = typeof v === 'number' ? (v - mn) / (mx - mn) : null; return '<div class="c" data-s="' + si + '" data-i="' + i + '" style="background:' + (t === null ? 'transparent;border:1px dashed var(--line)' : ramp(t)) + '"></div>'; }).join(''); });
      h += '</div><div class="pd-heatkey">' + F(mn, unit) + '<span style="background:linear-gradient(90deg,' + (dark() ? SEQ_D : SEQ).join(',') + ')"></span>' + F(mx, unit) + '</div>';
      box.innerHTML = h;
      box.querySelectorAll('.c').forEach(function (c) {
        c.onpointermove = function (ev) { var s = series[+c.dataset.s], i = +c.dataset.i, v = s.values[i]; tip.innerHTML = '<b>' + esc(s.name) + '</b><div class="r"><span>' + MN(months[i]) + '</span><b>' + (typeof v === 'number' ? F(v, unit) : '—') + '</b></div>'; var cr = box.parentNode.getBoundingClientRect(); tip.style.opacity = 1; tip.style.left = Math.min(ev.clientX - cr.left + 14, cr.width - tip.offsetWidth - 8) + 'px'; tip.style.top = (ev.clientY - cr.top - tip.offsetHeight - 12) + 'px'; };
        c.onpointerleave = function () { tip.style.opacity = 0; };
      });
    }

    /* ---------- KPIs ---------- */
    function drawKpis() {
      var colors = ['#4338CA', '#FF7A59', '#19B5A5', '#E0A100', '#9a4fd8', '#2a78d6'];
      $('#pd-kpis').innerHTML = (r.kpis || []).map(function (k, i) {
        var dl = '';
        if (k.delta !== null && k.delta !== undefined && isFinite(k.delta)) { var good = k.invert ? k.delta < 0 : k.delta >= 0; dl = '<span class="pd-delta ' + (good ? 'up' : 'down') + '">' + (k.delta >= 0 ? '▲' : '▼') + ' ' + P(k.delta).replace('+', '').replace('-', '') + '</span><span class="n">' + tr('vs. mes anterior', 'vs. last month') + (k.note ? ' · ' + esc(k.note) : '') + '</span>'; }
        else if (k.note) dl = '<span class="n" style="margin:0">' + esc(k.note) + '</span>';
        return '<div class="pd-kpi glass"><small>' + esc(k.label) + '</small><span class="v">' + esc(k.text) + '</span>' + dl + (k.spark && k.spark.length > 1 ? '<svg data-k="' + i + '" style="color:' + colors[i % colors.length] + '"></svg>' : '') + '</div>';
      }).join('');
      el.querySelectorAll('#pd-kpis svg').forEach(function (s) { var k = r.kpis[+s.dataset.k]; spark(s, k.spark, s.style.color); });
    }
    /* ---------- destacados ---------- */
    function drawHl() {
      var box = $('#pd-hlg'); if (!box) return;
      box.innerHTML = r.charts.map(function (c, i) { return '<div class="pd-card glass"><h4>' + esc(c.title) + '</h4><p class="pdsub">' + (c.type === 'line' ? tr('Evolución mensual', 'Monthly trend') : (c.by ? tr('Por', 'By') + ' ' + esc(c.by) : '')) + (c.sheet ? ' · ' + esc(c.sheet) : '') + '</p><svg id="pd-h' + i + '" role="img" aria-label="' + esc(c.title) + '"></svg><div class="tip" id="pd-ht' + i + '"></div></div>'; }).join('');
      r.charts.forEach(function (c, i) {
        var svg = $('#pd-h' + i), tip = $('#pd-ht' + i);
        if (c.type === 'line') timeChart(svg, tip, c.labels, [{ name: c.title, color: pal()[0], values: c.values }], c.unit, 'line');
        else E.drawChart(svg, tip, c, L);
      });
    }
    /* ---------- explorador ---------- */
    function curSheet() { return timeSheets[st.s]; }
    function curMeasure() { return curSheet().measures[Math.min(st.m, curSheet().measures.length - 1)]; }
    function periodIdx(n) { var p = st.per === 'all' ? n : Math.min(n, +st.per); return { from: n - p, to: n, len: p }; }
    function drawCtrl() {
      var s = curSheet(), m = curMeasure(), byOk = Object.keys(m.by);
      $('#pd-ctrl').innerHTML =
        '<div class="g"><span class="lb">' + tr('Hoja', 'Sheet') + '</span><div class="pd-pills">' + timeSheets.map(function (x, i) { return '<button type="button" data-sh="' + i + '" aria-pressed="' + (i === st.s) + '">' + esc(x.name) + '</button>'; }).join('') + '</div></div>' +
        '<div class="g"><label for="pd-m">' + tr('Métrica', 'Metric') + '</label><select id="pd-m">' + s.measures.map(function (x, i) { return '<option value="' + i + '"' + (i === st.m ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="g"><label for="pd-by">' + tr('Desglose', 'Breakdown') + '</label><select id="pd-by"><option value="total">' + tr('Total', 'Total') + '</option>' + byOk.map(function (c) { return '<option value="' + esc(c) + '"' + (st.by === c ? ' selected' : '') + '>' + tr('Por', 'By') + ' ' + esc(c) + '</option>'; }).join('') + '</select></div>' +
        '<div class="g"><span class="lb">' + tr('Periodo', 'Period') + '</span><div class="pd-pills">' + [['6', tr('6 meses', '6 months')], ['12', tr('12 meses', '12 months')], ['all', tr('Todo', 'All')]].map(function (p) { return '<button type="button" data-per="' + p[0] + '" aria-pressed="' + (st.per === p[0]) + '">' + p[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="g"><span class="lb">' + tr('Vista', 'View') + '</span><div class="pd-pills">' + [['line', tr('Líneas', 'Lines')], ['stack', tr('Apiladas', 'Stacked')], ['heat', tr('Mapa de calor', 'Heatmap')]].map(function (v) { var dis = (v[0] !== 'line' && st.by === 'total') || (v[0] === 'stack' && m.agg === 'mean'); return '<button type="button" data-v="' + v[0] + '" aria-pressed="' + (st.view === v[0]) + '"' + (dis ? ' disabled title="' + (st.by === 'total' ? tr('Elige un desglose', 'Pick a breakdown') : tr('No se puede apilar una media', 'Averages cannot be stacked')) + '"' : '') + '>' + v[1] + '</button>'; }).join('') + '</div></div>';
      $('#pd-ctrl').querySelectorAll('[data-sh]').forEach(function (b) { b.onclick = function () { st.s = +b.dataset.sh; st.m = 0; st.sel = null; st.hidden = {}; var c = curSheet().cats.filter(function (c) { return curMeasure().by[c]; })[0]; st.by = c || 'total'; if (st.by === 'total') st.view = 'line'; drawExplorer(); }; });
      $('#pd-m').onchange = function () { st.m = +this.value; st.sel = null; st.hidden = {}; if (st.by !== 'total' && !curMeasure().by[st.by]) st.by = 'total'; if (st.by === 'total' || (st.view === 'stack' && curMeasure().agg === 'mean')) st.view = 'line'; drawExplorer(); };
      $('#pd-by').onchange = function () { st.by = this.value; st.sel = null; st.hidden = {}; if (st.by === 'total') st.view = 'line'; drawExplorer(); };
      $('#pd-ctrl').querySelectorAll('[data-per]').forEach(function (b) { b.onclick = function () { st.per = b.dataset.per; drawExplorer(); }; });
      $('#pd-ctrl').querySelectorAll('[data-v]').forEach(function (b) { b.onclick = function () { if (b.disabled) return; st.view = b.dataset.v; drawExplorer(); }; });
    }
    function drawExplorer() {
      if (!timeSheets.length) return;
      drawCtrl();
      var s = curSheet(), m = curMeasure(), p = periodIdx(s.months.length), months = s.months.slice(p.from, p.to);
      var C = pal(), series;
      if (st.by === 'total' || !m.by[st.by]) series = [{ name: m.name, color: C[0], values: m.total.slice(p.from, p.to) }];
      else series = m.by[st.by].cats.map(function (c, i) { return { name: c, color: c === 'Otros' ? C[8] : C[i % 8], values: m.by[st.by].series[i].slice(p.from, p.to), hidden: !!st.hidden[c] }; });
      var totNow = aggr(m.total.slice(p.from, p.to), m.agg), prev = p.from - p.len >= 0 ? aggr(m.total.slice(p.from - p.len, p.from), m.agg) : null;
      var ch = prev ? totNow / prev - 1 : null;
      var main = $('#pd-main');
      main.innerHTML = '<div class="hd"><div><b>' + esc(m.name) + '</b> <span style="color:var(--muted);font-size:13px">· ' + esc(s.name) + ' · ' + (m.agg === 'mean' ? tr('media', 'average') : tr('total', 'total')) + ' ' + MN(months[0]) + ' – ' + MN(months[months.length - 1]) + '</span></div><div><span class="big">' + F(totNow, m.unit) + '</span>' + (ch !== null ? ' <span class="pd-delta ' + (ch >= 0 ? 'up' : 'down') + '">' + (ch >= 0 ? '▲' : '▼') + ' ' + P(ch).replace(/[+-]/, '') + ' <span style="font-weight:500;opacity:.8">' + tr('vs. periodo anterior', 'vs. previous period') + '</span></span>' : '') + '</div></div>' +
        (series.length > 1 && st.view !== 'heat' ? '<div class="pd-legend">' + series.map(function (x) { return '<button type="button" data-h="' + esc(x.name) + '" aria-pressed="' + !x.hidden + '"><i style="background:' + x.color + '"></i>' + esc(x.name) + '</button>'; }).join('') + '</div>' : '') +
        (st.view === 'heat' ? '<div id="pd-hb"></div>' : '<svg id="pd-ms" role="img" aria-label="' + esc(m.name) + '"></svg>') + '<div class="tip" id="pd-mt"></div>';
      main.querySelectorAll('[data-h]').forEach(function (b) { b.onclick = function () { var k = b.dataset.h; st.hidden[k] = !st.hidden[k]; drawExplorer(); }; });
      if (st.view === 'heat') heat($('#pd-hb'), $('#pd-mt'), months, series, m.unit);
      else timeChart($('#pd-ms'), $('#pd-mt'), months, series, m.unit, st.view === 'stack' ? 'stack' : 'line', st.sel);
      drawRank(s, m, p, series);
    }
    function drawRank(s, m, p, series) {
      var box = $('#pd-rank');
      if (st.by === 'total' || !m.by[st.by]) {
        // sin desglose: mejores meses
        var ms = s.months.slice(p.from, p.to).map(function (k, i) { return { k: k, v: m.total[p.from + i] }; }).filter(function (x) { return typeof x.v === 'number'; }).sort(function (a, b) { return b.v - a.v; });
        var mx = ms.length ? ms[0].v : 1;
        box.innerHTML = '<h4>' + tr('Mejores meses', 'Best months') + '</h4><p class="pdsub">' + esc(m.name) + '</p><ol>' + ms.slice(0, 8).map(function (x, i) { return '<li><button type="button" tabindex="-1"><span class="n">' + (i + 1) + '</span><span class="nm">' + MN(x.k) + '</span><span class="vl">' + F(x.v, m.unit) + '</span><span class="pdbar"><span style="width:' + Math.max(2, x.v / mx * 100) + '%;background:linear-gradient(90deg,#4338CA,#FF7A59)"></span></span></button></li>'; }).join('') + '</ol>' +
          (s.cats.length ? '<p class="pdsub" style="margin-top:12px">' + tr('Elige un desglose para ver el ranking por categoría.', 'Pick a breakdown to rank by category.') + '</p>' : '');
        return;
      }
      var b = m.by[st.by];
      var rows = b.cats.map(function (c, i) { var now = aggr(b.series[i].slice(p.from, p.to), m.agg), before = p.from - p.len >= 0 ? aggr(b.series[i].slice(p.from - p.len, p.from), m.agg) : null; return { c: c, color: series[i] ? series[i].color : pal()[0], now: now, ch: before ? now / before - 1 : null, best: (function () { var bi = -1, bv = -Infinity; b.series[i].forEach(function (v, j) { if (j >= p.from && j < p.to && typeof v === 'number' && v > bv) { bv = v; bi = j; } }); return bi >= 0 ? { k: s.months[bi], v: bv } : null; })() }; })
        .filter(function (x) { return x.now !== null; }).sort(function (a, b2) { return b2.now - a.now; });
      var tot = sumA(rows.map(function (x) { return Math.max(0, x.now); })), mx = rows.length ? Math.max.apply(null, rows.map(function (x) { return Math.abs(x.now); })) : 1;
      var sel = rows.filter(function (x) { return x.c === st.sel; })[0];
      box.innerHTML = '<h4>' + tr('Ranking', 'Ranking') + ' · ' + esc(st.by) + '</h4><p class="pdsub">' + esc(m.name) + ' · ' + (st.per === 'all' ? tr('todo el periodo', 'whole period') : tr('últimos ', 'last ') + st.per + tr(' meses', ' months')) + '</p><ol>' +
        rows.map(function (x, i) { return '<li><button type="button" data-c="' + esc(x.c) + '" aria-pressed="' + (st.sel === x.c) + '"><span class="n">' + (i + 1) + '</span><span class="nm">' + esc(x.c) + '</span><span class="vl">' + F(x.now, m.unit) + '</span><span class="pdbar"><span style="width:' + Math.max(2, Math.abs(x.now) / mx * 100) + '%;background:' + x.color + '"></span></span><span class="pdch"><span>' + (m.agg === 'sum' && tot ? Math.round(x.now / tot * 100) + '% ' + tr('del total', 'of total') : '') + '</span><span>' + (x.ch !== null ? (x.ch >= 0 ? '▲ ' : '▼ ') + P(x.ch).replace(/[+-]/, '') : '') + '</span></span></button></li>'; }).join('') + '</ol>' +
        (sel ? '<div class="pd-detail"><b>' + esc(sel.c) + '</b><br>' + tr('Valor en el periodo', 'Value in period') + ': <b style="font-size:14px">' + F(sel.now, m.unit) + '</b>' + (sel.ch !== null ? '<br>' + tr('Cambio vs. periodo anterior', 'Change vs previous period') + ': <b style="font-size:14px">' + P(sel.ch) + '</b>' : '') + (sel.best ? '<br>' + tr('Mejor mes', 'Best month') + ': <b style="font-size:14px">' + MN(sel.best.k) + ' (' + F(sel.best.v, m.unit) + ')</b>' : '') + '</div>' : '<p class="pdsub" style="margin-top:10px">' + tr('Pulsa una fila para destacarla en el gráfico.', 'Click a row to highlight it in the chart.') + '</p>');
      box.querySelectorAll('[data-c]').forEach(function (bt) { bt.onclick = function () { st.sel = st.sel === bt.dataset.c ? null : bt.dataset.c; if (st.view === 'heat') st.view = 'line'; drawExplorer(); }; });
    }
    /* ---------- tablas con mapa de calor ---------- */
    function drawTables() {
      var box = $('#pd-tbw'); if (!box) return;
      var t = tables[st.tbl];
      var rows = t.rows.filter(function (r0) { return !st.q || (r0[0] + ' ' + r0[1]).toLowerCase().indexOf(st.q.toLowerCase()) >= 0; });
      var ci = st.sort; rows = rows.slice().sort(function (a, b) { return ((b[ci] || 0) - (a[ci] || 0)) * -st.dir; });
      var ranges = t.columns.map(function (_, j) { var v = valid(t.rows.map(function (r0) { return r0[j + 2]; })); return [Math.min.apply(null, v), Math.max.apply(null, v)]; });
      var C = ['#FF7A59', '#4338CA', '#19B5A5', '#E0A100', '#9a4fd8', '#2a78d6', '#e34948', '#1baf7a'];
      box.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;margin-bottom:10px"><div class="pd-pills">' + tables.map(function (x, i) { return '<button type="button" data-t="' + i + '" aria-pressed="' + (i === st.tbl) + '">' + esc(x.name) + '</button>'; }).join('') + '</div><input class="pd-search" type="search" placeholder="' + tr('Buscar…', 'Search…') + '" value="' + esc(st.q) + '" aria-label="' + tr('Buscar', 'Search') + '"></div>' +
        '<div class="pd-tbl"><table><thead><tr><th>' + esc(t.label) + '</th>' + t.columns.map(function (c, j) { return '<th data-s="' + (j + 2) + '">' + esc(c.name) + (st.sort === j + 2 ? (st.dir < 0 ? ' ↓' : ' ↑') : '') + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r0) { return '<tr><td title="' + esc(r0[0]) + '">' + esc(r0[0]) + (r0[1] ? '<small>' + esc(r0[1]) + '</small>' : '') + '</td>' + t.columns.map(function (c, j) { var v = r0[j + 2], rg = ranges[j], tt = typeof v === 'number' && rg[1] > rg[0] ? (v - rg[0]) / (rg[1] - rg[0]) : 0.5, col = C[j % C.length]; return '<td><span class="h" style="background:color-mix(in srgb,' + col + ' ' + Math.round(10 + tt * 55) + '%,transparent)">' + (typeof v === 'number' ? F(v, c.unit) : '—') + '</span></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      box.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { st.tbl = +b.dataset.t; st.sort = 2; st.dir = -1; st.q = ''; drawTables(); }; });
      box.querySelectorAll('th[data-s]').forEach(function (h) { h.onclick = function () { var c = +h.dataset.s; if (st.sort === c) st.dir *= -1; else { st.sort = c; st.dir = -1; } drawTables(); }; });
      var inp = box.querySelector('.pd-search'); inp.oninput = function () { st.q = inp.value; var pos = inp.selectionStart; drawTables(); var i2 = box.querySelector('.pd-search'); i2.focus(); try { i2.setSelectionRange(pos, pos); } catch (e) {} };
    }
    /* ---------- hallazgos ---------- */
    function drawFindings() {
      var box = $('#pd-ins'); if (!box) return;
      var K = [['insights', tr('Insight', 'Insight'), '#4338CA', '💡'], ['opportunities', tr('Oportunidad', 'Opportunity'), '#0F8A5F', '↗'], ['warnings', tr('Atención', 'Watch out'), '#C2410C', '!']];
      box.innerHTML = K.map(function (k) { return (r[k[0]] || []).map(function (t) { return '<div class="pd-in glass" style="border-top:4px solid ' + k[2] + '"><span class="k" style="color:' + k[2] + '"><i style="background:' + k[2] + '">' + k[3] + '</i>' + k[1] + '</span><p>' + esc(t) + '</p></div>'; }).join(''); }).join('');
    }
    /* ---------- relaciones ---------- */
    function findSeries(sheet, meas) { var s = cube.sheets.filter(function (x) { return x.name === sheet && x.kind === 'time'; })[0]; if (!s) return null; var m = s.measures.filter(function (x) { return x.name === meas; })[0]; return m ? { months: s.months, values: m.total } : null; }
    function drawRels() {
      var box = $('#pd-relg'); if (!box) return;
      var C = pal(), html = '';
      (cube.rels || []).forEach(function (rl, i) {
        var A = findSeries(rl.as, rl.a), B = findSeries(rl.bs, rl.b); if (!A || !B) return;
        var str = Math.abs(rl.r) >= 0.8 ? tr('fuerte', 'strong') : Math.abs(rl.r) >= 0.6 ? tr('clara', 'clear') : tr('moderada', 'moderate');
        html += '<div class="glass"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><span class="rl">' + (rl.r >= 0 ? tr('Se mueven juntas', 'Move together') : tr('Se mueven al revés', 'Move opposite')) + ' · ' + str + '</span><span class="rv">r = ' + (+rl.r).toFixed(2).replace('.', en ? '.' : ',') + '</span></div>' +
          '<div class="pair"><span><i style="background:' + C[0] + '"></i>' + esc(rl.a) + ' <small style="color:var(--muted)">(' + esc(rl.as) + ')</small></span><span><i style="background:' + C[1] + '"></i>' + esc(rl.b) + ' <small style="color:var(--muted)">(' + esc(rl.bs) + ')</small></span></div><svg data-rel="' + i + '"></svg></div>';
      });
      if (!html && !(r.relationships || []).length) { box.innerHTML = '<div class="pd-empty">' + tr('No se han encontrado relaciones claras.', 'No clear relationships were found.') + '</div>'; return; }
      var texts = (r.mode === 'ai' || !html) ? (r.relationships || []) : [];
      box.innerHTML = html + texts.map(function (t) { return '<div class="pd-in glass" style="border-top:4px solid #19B5A5"><span class="k" style="color:#19B5A5"><i style="background:#19B5A5">∿</i>' + tr('Relación', 'Relationship') + '</span><p>' + esc(t) + '</p></div>'; }).join('');
      box.querySelectorAll('svg[data-rel]').forEach(function (svg) {
        var rl = cube.rels[+svg.dataset.rel], A = findSeries(rl.as, rl.a), B = findSeries(rl.bs, rl.b);
        var idx = {}; B.months.forEach(function (k, j) { idx[k] = B.values[j]; });
        var pts = A.months.map(function (k, j) { return [A.values[j], idx[k]]; }).filter(function (p2) { return typeof p2[0] === 'number' && typeof p2[1] === 'number' && p2[0] && p2[1]; });
        if (pts.length < 3) return;
        var a0 = pts[0][0], b0 = pts[0][1], ia = pts.map(function (p2) { return p2[0] / a0 * 100; }), ib = pts.map(function (p2) { return p2[1] / b0 * 100; });
        var W = Math.max(240, svg.clientWidth || 340), H = 110, all = ia.concat(ib), mn = Math.min.apply(null, all), mx = Math.max.apply(null, all); if (mx === mn) mx = mn + 1;
        var x = function (j) { return 4 + j * (W - 8) / (pts.length - 1); }, y = function (v) { return 6 + (1 - (v - mn) / (mx - mn)) * (H - 12); };
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.innerHTML = '<line x1="0" x2="' + W + '" y1="' + y(100) + '" y2="' + y(100) + '" stroke="' + cssv('--grid') + '" stroke-dasharray="3 3"/>' + [[ia, C[0]], [ib, C[1]]].map(function (q) { return '<polyline points="' + q[0].map(function (v, j) { return x(j) + ',' + y(v); }).join(' ') + '" fill="none" stroke="' + q[1] + '" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>'; }).join('');
      });
    }
    /* ---------- plan de acción ---------- */
    function drawPlan() {
      var box = $('#pd-plang'); if (!box) return;
      var groups = {}, order = [];
      (r.actions || []).forEach(function (a, i) { var k = a.when || tr('Sin plazo', 'No deadline'); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(Object.assign({ n: i + 1 }, a)); });
      var cls = function (v) { return /alto|high/i.test(v || '') ? 'hi' : /bajo|low/i.test(v || '') ? 'lo' : ''; };
      var clsE = function (v) { return /bajo|low/i.test(v || '') ? 'lo' : /alto|high/i.test(v || '') ? 'hi' : ''; };
      box.innerHTML = order.map(function (k) { return '<div class="pd-col glass"><h4>' + esc(k) + '<span>' + groups[k].length + '</span></h4>' + groups[k].map(function (a) { return '<div class="pd-act"><div class="t"><b style="color:var(--ind)">' + a.n + '.</b> ' + esc(a.t) + '</div>' + (a.est ? '<div class="e">' + esc(a.est) + '</div>' : '') + '<div class="tags"><span class="' + cls(a.impact) + '">' + tr('Impacto', 'Impact') + ': ' + esc(a.impact) + '</span><span class="' + clsE(a.effort) + '">' + tr('Esfuerzo', 'Effort') + ': ' + esc(a.effort) + '</span></div></div>'; }).join('') + '</div>'; }).join('');
    }
    function drawAll() { drawKpis(); drawHl(); drawExplorer(); if (tables.length) drawTables(); drawFindings(); drawRels(); drawPlan(); }
    drawAll();
    var rt; var onResize = function () { clearTimeout(rt); rt = setTimeout(function () { if (!document.body.contains(el)) { removeEventListener('resize', onResize); return; } drawKpis(); drawHl(); drawExplorer(); drawRels(); }, 160); };
    addEventListener('resize', onResize);
    return { redraw: drawAll };
  }
  window.PLGDash = { mount: mount };
})();
