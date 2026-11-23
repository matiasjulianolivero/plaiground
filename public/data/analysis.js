/*
 * Data plaiground · capa de análisis compartida (landing y plataforma)
 * Calcula con código, a partir de los datos, insights, oportunidades, relaciones,
 * acciones e ideas. Los textos se generan con plantillas a partir de las cifras.
 * window.PLGAnalysis.analyze(opts) → {insights, opps, rels, actions, ideas}
 */
(function () {
  'use strict';
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  function pearson(a, b) {
    var n = a.length, ma = sum(a) / n, mb = sum(b) / n, num = 0, da = 0, db = 0;
    for (var i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += Math.pow(a[i] - ma, 2); db += Math.pow(b[i] - mb, 2); }
    return da && db ? num / Math.sqrt(da * db) : 0;
  }
  function slope(x, y) {
    var n = x.length, mx = sum(x) / n, my = sum(y) / n, num = 0, den = 0;
    for (var i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); den += Math.pow(x[i] - mx, 2); }
    return den ? num / den : 0;
  }

  /* opts: {v, CH, biz, aud, company, trend, lang, nf, eur, pct, months} */
  function analyze(o) {
    var v = o.v, CH = o.CH, L = o.lang, en = L === 'en', nf = o.nf, eur = o.eur, pct = o.pct;
    var tr = function (es, e) { return en ? e : es; };
    var nm = function (c) { return c[L]; };
    var money = v.money, last = 11, ago = 5;
    var fmtUnits = function (x) { return money ? eur(x) : nf(x) + ' ' + v.unit[L]; };

    // eficiencia por canal (últimos 6 meses)
    var eff = CH.map(function (c) {
      var vol6 = sum(v.vol[c.id].slice(6)), sp6 = sum(v.spend[c.id].slice(6));
      var volA = sum(v.vol[c.id].slice(0, 6)), spA = sum(v.spend[c.id].slice(0, 6));
      return { c: c, vol: vol6, sp: sp6, cost: sp6 / vol6, costPrev: spA / volA,
        g: v.vol[c.id][last] / v.vol[c.id][ago] - 1,
        r: pearson(v.spend[c.id], v.vol[c.id]), k: slope(v.spend[c.id], v.vol[c.id]) };
    });
    var vt = sum(eff.map(function (e) { return e.vol; })), st = sum(eff.map(function (e) { return e.sp; }));
    eff.forEach(function (e) { e.share = e.vol / vt; e.sshare = e.sp / st; e.ratio = e.share / e.sshare; e.dCost = e.cost / e.costPrev - 1; });
    var paid = eff.filter(function (e) { return e.c.id !== 'email'; });
    var best = paid.slice().sort(function (a, b) { return b.ratio - a.ratio; })[0];
    var worst = paid.slice().sort(function (a, b) { return b.cost - a.cost; })[0];
    var fast = eff.slice().sort(function (a, b) { return b.g - a.g; })[0];
    var rising = eff.slice().sort(function (a, b) { return b.dCost - a.dCost; })[0];
    var emailE = eff.filter(function (e) { return e.c.id === 'email'; })[0];
    var avg = st / vt, gr = o.trend[last] / o.trend[ago] - 1;

    // estacionalidad (volumen total por mes)
    o.months = en ? ['December','January','February','March','April','May','June','July','August','September','October','November'] : ['diciembre','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre'];
    var tot = Array.from({ length: 12 }, function (_, i) { return sum(CH.map(function (c) { return v.vol[c.id][i]; })); });
    var mAvg = sum(tot) / 12, peak = tot.indexOf(Math.max.apply(null, tot)), low = tot.indexOf(Math.min.apply(null, tot));
    var peakUp = tot[peak] / mAvg - 1, lowDn = 1 - tot[low] / mAvg;

    // impacto estimado de reasignar el 15% de la inversión del canal más caro al más eficiente
    var shift = worst.sp / 6 * 0.15;
    var gain = shift * (1 / best.cost - 1 / worst.cost);
    var costTxt = money ? tr(nf(worst.cost, 2) + ' € por euro de ingresos', '€' + nf(worst.cost, 2) + ' per euro of revenue')
      : tr(nf(worst.cost, worst.cost < 20 ? 2 : 0) + ' € ' + v.one.es, '€' + nf(worst.cost, worst.cost < 20 ? 2 : 0) + ' ' + v.one.en);
    var tn = { ecom: tr('Los ingresos', 'Revenue'), saas: tr('El MRR', 'MRR'), fran: tr('Las ventas de la red', 'Network sales') }[o.biz];
    var plural = o.biz !== 'saas';

    var insights = [
      tr(tn + (o.company ? ' de ' + o.company : '') + ' ' + (gr >= 0 ? (plural ? 'crecen' : 'crece') : (plural ? 'caen' : 'cae')) + ' un ' + nf(Math.abs(gr) * 100, 0) + '% en los últimos 6 meses.',
        (o.company ? o.company + '’s ' + tn.toLowerCase() : tn) + ' ' + (gr >= 0 ? 'grew' : 'fell') + ' ' + nf(Math.abs(gr) * 100, 0) + '% over the last 6 months.'),
      tr(nm(best.c) + ' aporta el ' + nf(best.share * 100, 0) + '% ' + v.ofU.es + ' con solo el ' + nf(best.sshare * 100, 0) + '% de la inversión.',
        nm(best.c) + ' brings ' + nf(best.share * 100, 0) + '% ' + v.ofU.en + ' with just ' + nf(best.sshare * 100, 0) + '% of spend.'),
      tr(nm(worst.c) + ' es el canal más caro: ' + costTxt + ', un ' + nf((worst.cost / avg - 1) * 100, 0) + '% por encima de la media.',
        nm(worst.c) + ' is the most expensive channel: ' + costTxt + ', ' + nf((worst.cost / avg - 1) * 100, 0) + '% above average.'),
      tr(nm(fast.c) + ' es el canal que más crece (' + pct(fast.g) + ' en 6 meses).', nm(fast.c) + ' is the fastest-growing channel (' + pct(fast.g) + ' in 6 months).')
    ];

    var seasonal = peakUp >= 0.12;
    var prep = { ecom: { es: 'stock', en: 'stock' }, saas: { es: 'equipo comercial', en: 'sales capacity' }, fran: { es: 'personal en los locales', en: 'store staffing' } }[o.biz];
    var big = eff.slice().sort(function (a, b) { return b.share - a.share; })[0];
    var opps = [
      tr('Escalar ' + nm(best.c) + ': rinde ' + nf(best.ratio, 1) + ' veces más de lo que pesa en el presupuesto y aún tiene recorrido.',
        'Scale ' + nm(best.c) + ': it returns ' + nf(best.ratio, 1) + 'x its share of budget and still has room to grow.'),
      tr('Exprimir ' + nm(emailE.c) + ': es el canal más barato (' + nf(emailE.sshare * 100, 0) + '% de la inversión, ' + nf(emailE.share * 100, 0) + '% ' + v.ofU.es + '). Más automatizaciones y segmentación cuestan poco.',
        'Squeeze more from ' + nm(emailE.c) + ': it is the cheapest channel (' + nf(emailE.sshare * 100, 0) + '% of spend, ' + nf(emailE.share * 100, 0) + '% ' + v.ofU.en + '). More automations and segmentation cost little.'),
      seasonal ? tr('Adelantarse al pico de ' + o.months[peak] + ' (' + pct(peakUp) + ' sobre la media): preparar campañas y ' + prep.es + ' 4–6 semanas antes.',
        'Get ahead of the ' + o.months[peak] + ' peak (' + pct(peakUp) + ' above average): prepare campaigns and ' + prep.en + ' 4–6 weeks earlier.')
      : tr('Reducir dependencia: ' + nm(big.c) + ' concentra el ' + nf(big.share * 100, 0) + '% ' + v.ofU.es + '. Un segundo canal fuerte reduce el riesgo si sube su coste.',
        'Reduce dependency: ' + nm(big.c) + ' accounts for ' + nf(big.share * 100, 0) + '% ' + v.ofU.en + '. A second strong channel lowers the risk if its cost goes up.')
    ];

    var strength = function (r) { var a = Math.abs(r); return a >= 0.7 ? tr('fuerte', 'strong') : a >= 0.4 ? tr('moderada', 'moderate') : tr('débil', 'weak'); };
    var cv = function (a) { var m = sum(a) / a.length; return Math.sqrt(sum(a.map(function (x) { return Math.pow(x - m, 2); })) / a.length) / m; };
    var relSorted = eff.filter(function (e) { return e.c.id !== 'email' && cv(v.spend[e.c.id]) > 0.03; }).sort(function (a, b) { return Math.abs(b.r) - Math.abs(a.r); });
    var rf = function (r) { return nf(Math.abs(r) < 0.005 ? 0 : r, 2); };
    var rTop = relSorted[0], rLow = relSorted[relSorted.length - 1];
    var rels = [
      tr('En ' + nm(rTop.c) + ', inversión y resultados van de la mano (correlación ' + strength(rTop.r) + ', r = ' + rf(rTop.r) + '): cada 1.000 € más se asocian con ≈ ' + fmtUnits(Math.max(0, rTop.k * 1000)) + ' adicionales.',
        'In ' + nm(rTop.c) + ', spend and results move together (' + strength(rTop.r) + ' correlation, r = ' + rf(rTop.r) + '): every extra €1,000 is associated with about ' + fmtUnits(Math.max(0, rTop.k * 1000)) + ' more.'),
      Math.abs(rLow.r) >= 0.7 ? tr('En ' + nm(rLow.c) + ' también hay una relación fuerte (r = ' + rf(rLow.r) + '): es otro canal donde más inversión suele traducirse en más resultados.',
        'In ' + nm(rLow.c) + ' the relationship is also strong (r = ' + rf(rLow.r) + '): another channel where more spend usually turns into more results.')
      : Math.abs(rLow.r) >= 0.4 ? tr('En ' + nm(rLow.c) + ' la relación es moderada (r = ' + rf(rLow.r) + '): la inversión explica solo una parte de los resultados.',
        'In ' + nm(rLow.c) + ' the relationship is moderate (r = ' + rf(rLow.r) + '): spend explains only part of the results.')
      : tr('En ' + nm(rLow.c) + ' la relación es débil (r = ' + rf(rLow.r) + '): invertir más no garantiza más resultados; pesan otros factores como el contenido o la estacionalidad.',
        'In ' + nm(rLow.c) + ' the relationship is weak (r = ' + rf(rLow.r) + '): spending more does not guarantee more results; other factors such as content or seasonality matter.'),
      tr('Estacionalidad: ' + o.months[peak] + ' es el mes más alto (' + pct(peakUp) + ' sobre la media) y ' + o.months[low] + ' el más bajo (−' + nf(lowDn * 100, 0) + '%).',
        'Seasonality: ' + o.months[peak] + ' is the highest month (' + pct(peakUp) + ' above average) and ' + o.months[low] + ' the lowest (−' + nf(lowDn * 100, 0) + '%).'),
      tr('El coste por resultado de ' + nm(rising.c) + ' ha ' + (rising.dCost >= 0 ? 'subido' : 'bajado') + ' un ' + nf(Math.abs(rising.dCost) * 100, 0) + '% entre semestres' + (rising.dCost > 0.05 ? ': posible señal de saturación.' : '.'),
        nm(rising.c) + '’s cost per result ' + (rising.dCost >= 0 ? 'rose' : 'fell') + ' ' + nf(Math.abs(rising.dCost) * 100, 0) + '% between half-years' + (rising.dCost > 0.05 ? ': a possible sign of saturation.' : '.'))
    ];

    var actions = [
      { t: tr('Mover el 15% del presupuesto de ' + nm(worst.c) + ' (≈' + eur(shift) + '/mes) a ' + nm(best.c) + '.', 'Move 15% of the ' + nm(worst.c) + ' budget (≈' + eur(shift) + '/month) to ' + nm(best.c) + '.'),
        est: gain > 0 ? tr('Impacto estimado: +' + fmtUnits(gain) + ' al mes', 'Estimated impact: +' + fmtUnits(gain) + ' per month') : '',
        impact: tr('Alto', 'High'), effort: tr('Bajo', 'Low'), when: tr('Este mes', 'This month') },
      { t: tr('Test A/B en ' + nm(rising.c) + ': nuevas creatividades y audiencias para frenar la subida del coste.', 'A/B test in ' + nm(rising.c) + ': new creatives and audiences to curb rising costs.'),
        est: '', impact: tr('Medio', 'Medium'), effort: tr('Medio', 'Medium'), when: tr('Próximas 4 semanas', 'Next 4 weeks') },
      { t: seasonal ? tr('Calendario de campañas para el pico de ' + o.months[peak] + ', con la inversión reservada desde ahora.', 'Campaign calendar for the ' + o.months[peak] + ' peak, with budget reserved now.')
          : tr('Fijar un coste objetivo por resultado en cada canal y revisarlo cada mes.', 'Set a target cost per result for each channel and review it monthly.'),
        est: '', impact: tr('Alto', 'High'), effort: tr('Medio', 'Medium'), when: tr('Este trimestre', 'This quarter') },
      { t: tr('Lanzar 2 automatizaciones nuevas en ' + nm(emailE.c) + ' (bienvenida y recuperación).', 'Launch 2 new ' + nm(emailE.c) + ' automations (welcome and win-back).'),
        est: '', impact: tr('Medio', 'Medium'), effort: tr('Bajo', 'Low'), when: tr('Próximas 2 semanas', 'Next 2 weeks') }
    ];
    if (o.aud === 'inv') actions = [actions[0], actions[2]];
    if (o.aud === 'ceo') actions = actions.slice(0, 3);

    var ideas = {
      ecom: [tr('Añade el margen por producto para ver la rentabilidad real, no solo los ingresos.', 'Add product margin to see real profitability, not just revenue.'),
        tr('Separa clientes nuevos y recurrentes: ¿qué canal trae clientes que vuelven?', 'Split new vs returning customers: which channel brings customers who come back?'),
        tr('Desglosa Paid Social por campaña o creatividad para encontrar qué está subiendo el coste.', 'Break Paid Social down by campaign or creative to find what is driving costs up.')],
      saas: [tr('Añade la tasa de cierre por canal: un SQL barato no sirve si no se convierte.', 'Add win rate by channel: a cheap SQL is useless if it doesn’t close.'),
        tr('Cruza con el churn por cohorte para saber qué canal trae clientes que se quedan.', 'Cross with churn by cohort to see which channel brings customers who stay.'),
        tr('Mide el tiempo de ciclo de venta por canal para planificar la caja.', 'Measure sales-cycle length by channel to plan cash.')],
      fran: [tr('Desglosa por local o región para encontrar los que lo hacen mejor y replicarlo.', 'Break down by location or region to find top performers and replicate them.'),
        tr('Cruza las reservas con el clima o eventos locales para afinar la estacionalidad.', 'Cross bookings with weather or local events to sharpen seasonality.'),
        tr('Añade el ticket medio por canal: ¿qué canal trae clientes que gastan más?', 'Add average ticket by channel: which channel brings higher-spending customers?')]
    }[o.biz];

    return { insights: insights, opps: opps, rels: rels, actions: actions, ideas: ideas, note: tr('Las relaciones muestran correlación, no causalidad. Los impactos son estimaciones que asumen una eficiencia media constante.', 'Relationships show correlation, not causation. Impacts are estimates that assume constant average efficiency.') };
  }

  // Render HTML de la sección de análisis (usa clases .an-*)
  function render(a, lang, esc) {
    var en = lang === 'en', tr = function (es, e) { return en ? e : es; };
    esc = esc || function (s) { return String(s); };
    var li = function (arr) { return '<ul>' + arr.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>'; };
    var ic = {
      ins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
      opp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
      rel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M8.6 7.5l6.8 9M9 6h6"/></svg>',
      act: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
      idea: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'
    };
    var card = function (cls, icon, title, body) { return '<section class="an-card ' + cls + '"><h4><span class="an-ic">' + icon + '</span>' + title + '</h4>' + body + '</section>'; };
    var acts = '<ol class="an-acts">' + a.actions.map(function (x) {
      return '<li><div class="an-t">' + esc(x.t) + (x.est ? '<small>' + esc(x.est) + '</small>' : '') + '</div><div class="an-tags"><span>' + tr('Impacto', 'Impact') + ': <b>' + x.impact + '</b></span><span>' + tr('Esfuerzo', 'Effort') + ': <b>' + x.effort + '</b></span><span>' + x.when + '</span></div></li>';
    }).join('') + '</ol>';
    return '<div class="an-head"><h3>' + tr('Análisis de tus datos', 'Analysis of your data') + '</h3><span class="an-badge">✦ ' + tr('Generado con IA a partir de cifras calculadas', 'AI-generated from computed figures') + '</span></div>' +
      '<div class="an-grid">' +
      card('an-ins', ic.ins, tr('Insights clave', 'Key insights'), li(a.insights)) +
      card('an-opp', ic.opp, tr('Oportunidades', 'Opportunities'), li(a.opps)) +
      card('an-rel', ic.rel, tr('Relaciones en los datos', 'Relationships in the data'), li(a.rels)) +
      card('an-idea', ic.idea, tr('Ideas para profundizar', 'Ideas to dig deeper'), li(a.ideas)) +
      card('an-act', ic.act, tr('Plan de acción', 'Action plan'), acts) +
      '</div><p class="an-note">' + esc(a.note) + '</p>';
  }

  var CSS = '.an-head{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:18px 0 10px}' +
    '.an-head h3{font-size:22px}.an-badge{font:700 11px var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--ind);background:color-mix(in srgb,var(--ind) 12%,transparent);border-radius:999px;padding:4px 10px}' +
    '.an-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media (max-width:820px){.an-grid{grid-template-columns:minmax(0,1fr)}}' +
    '.an-card{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:18px 20px}' +
    '.an-card h4{display:flex;align-items:center;gap:10px;font:700 16px var(--body);margin:0 0 6px}' +
    '.an-ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;color:#fff;flex:none}.an-ic svg{width:17px;height:17px}' +
    '.an-ins .an-ic{background:#4338CA}.an-opp .an-ic{background:#0F8A5F}.an-rel .an-ic{background:#19B5A5}.an-idea .an-ic{background:#E0A100;color:#14162E}.an-act .an-ic{background:#FF7A59;color:#14162E}' +
    '.an-card ul{margin:0;padding-left:20px}.an-card li{margin:7px 0}' +
    '.an-act{grid-column:1/-1}.an-acts{list-style:none;counter-reset:a;margin:6px 0 0;padding:0}' +
    '.an-acts li{counter-increment:a;display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:6px 12px;align-items:start;padding:12px 0;border-top:1px solid var(--line)}' +
    '.an-acts li:first-child{border-top:0}.an-acts li::before{content:counter(a);width:24px;height:24px;border-radius:50%;background:var(--cta-bg);color:var(--cta-fg);display:grid;place-items:center;font:700 12px var(--body)}' +
    '.an-t small{display:block;color:var(--good);font-weight:700;font-size:13px;margin-top:2px}' +
    '.an-tags{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.an-tags span{font-size:12px;color:var(--muted);background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:3px 9px;white-space:nowrap}.an-tags b{color:var(--ink)}' +
    '@media (max-width:640px){.an-acts li{grid-template-columns:28px minmax(0,1fr)}.an-tags{grid-column:2;justify-content:flex-start}}' +
    '.an-note{font-size:13px;color:var(--muted);margin:10px 0 0}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  window.PLGAnalysis = { analyze: analyze, render: render };
})();
