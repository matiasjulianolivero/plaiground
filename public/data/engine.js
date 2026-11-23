/*
 * Data plaiground · motor de datos (se ejecuta en el navegador del usuario)
 * ----------------------------------------------------------------------
 * 1. readWorkbook: lee Excel/CSV con SheetJS (vendor/xlsx.core.min.js) y detecta tablas y tipos de columna.
 * 2. profile: resumen compacto (nombres, tipos, estadísticas, muestra pequeña) → es lo único que ve la IA, junto con los hechos.
 * 3. facts: hechos calculados con código (tendencias, repartos, correlaciones, anomalías, rankings).
 * 4. compute: convierte la especificación del dashboard (KPIs y gráficos que propone la IA) en cifras calculadas con código.
 * 5. heuristicSpec: especificación automática sin IA (modo de respaldo).
 * Los datos completos nunca salen del navegador.
 */
(function () {
  'use strict';
  var MAX_ROWS = 50000;
  var sum = function (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; };
  var mean = function (a) { return a.length ? sum(a) / a.length : 0; };
  function pearson(a, b) {
    var n = Math.min(a.length, b.length); if (n < 3) return 0;
    var ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n)), num = 0, da = 0, db = 0;
    for (var i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) * (a[i] - ma); db += (b[i] - mb) * (b[i] - mb); }
    return da && db ? num / Math.sqrt(da * db) : 0;
  }
  var norm = function (s) { return String(s == null ? '' : s).trim(); };

  /* ---------------- lectura ---------------- */
  function toDate(v) {
    if (v instanceof Date && !isNaN(v)) return v;
    if (typeof v === 'string') {
      var s = v.trim(), m;
      if ((m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/))) return new Date(+m[1], +m[2] - 1, +(m[3] || 1));
      if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) return new Date(+m[3], +m[2] - 1, +m[1]);
      if ((m = s.match(/^(\d{1,2})[\/.-](\d{4})$/))) return new Date(+m[2], +m[1] - 1, 1);
    }
    return null;
  }
  function toNum(v) {
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'string') {
      var s = v.trim().replace(/[€$£%\s]/g, '');
      if (!s || !/^[-+(]?[\d.,]+\)?$/.test(s)) return null;
      var neg = /^\(.*\)$/.test(s); s = s.replace(/[()]/g, '');
      if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
      var n = parseFloat(s); return isFinite(n) ? (neg ? -n : n) : null;
    }
    return null;
  }
  function detectHeader(aoa) {
    var best = -1, bestScore = 0;
    for (var r = 0; r < Math.min(15, aoa.length - 1); r++) {
      var row = aoa[r] || [], next = aoa[r + 1] || [];
      var str = row.filter(function (c) { return typeof c === 'string' && c.trim() && isNaN(+c); }).length;
      var filledNext = next.filter(function (c) { return c !== null && c !== ''; }).length;
      if (str >= 2 && filledNext >= 2 && str >= row.filter(function (c) { return c !== null && c !== ''; }).length * 0.7) {
        var score = str * 2 + filledNext;
        if (score > bestScore) { bestScore = score; best = r; }
        if (str >= 3) break;
      }
    }
    return best;
  }
  var MONEY = /(€|eur\b|euros|\$|usd|£|ingres|venta|factur|coste|cost|precio|price|gasto|spend|inversi|valor|revenue|margen \(|ebitda|beneficio|profit|presupuesto|budget|importe|amount|salario|pipeline|mrr|arr)/i;
  var PCTH = /(%|tasa|rate|ratio|porcentaje|conversi|win|oee|retenci|churn|ctr|share|cuota)/i;
  var RATIO = /( por | per |\/|medio|media|promedio|average|avg|ratio|retorno|return|precio|price|ticket|valoración|rating|nps|enps|satisfac|días de|plazo|probabilidad|%)/i;
  function typeColumn(name, vals) {
    var nn = vals.filter(function (v) { return v !== null && v !== '' && v !== undefined; });
    var col = { name: name, type: 'text', unit: '', nulls: vals.length - nn.length };
    if (!nn.length) { col.type = 'empty'; return col; }
    var dates = nn.filter(function (v) { return toDate(v); }).length;
    var nums = nn.filter(function (v) { return toNum(v) !== null && !(v instanceof Date); }).length;
    if (dates / nn.length >= 0.8 && (nn[0] instanceof Date || typeof nn[0] === 'string')) { col.type = 'date'; return col; }
    if (nums / nn.length >= 0.8) {
      var ns = nn.map(toNum).filter(function (x) { return x !== null; });
      var allInt = ns.every(function (x) { return Math.round(x) === x; });
      if (allInt && ns.every(function (x) { return x >= 1990 && x <= 2100; }) && /(año|year|ejercicio)/i.test(name)) { col.type = 'category'; return col; }
      col.type = 'number';
      col.ratio = RATIO.test(name);
      var maxAbs = Math.max.apply(null, ns.map(Math.abs));
      if (PCTH.test(name) && maxAbs <= 1.5) col.unit = 'pct';
      else if (/%/.test(name) && maxAbs <= 100) col.unit = 'pct100';
      else if (/M€|millones|\(m\)|mm\)/i.test(name)) col.unit = 'meur';
      else if (/\$|usd/i.test(name)) col.unit = 'usd';
      else if (MONEY.test(name)) col.unit = 'eur';
      return col;
    }
    var uniq = {}; nn.forEach(function (v) { uniq[norm(v)] = 1; });
    var u = Object.keys(uniq).length;
    if (u === nn.length && nn.length > 8) col.type = 'id';
    else if (u <= 40 && u <= Math.max(3, nn.length * 0.6)) col.type = 'category';
    else col.type = 'text';
    return col;
  }
  function readSheet(name, aoa) {
    aoa = aoa.filter(function (r) { return r && r.some(function (c) { return c !== null && c !== ''; }); });
    var h = detectHeader(aoa);
    if (h < 0) return null;
    var header = aoa[h].map(function (c, i) { return norm(c) || ('Columna ' + (i + 1)); });
    var seen = {};
    header = header.map(function (c) { var k = c; var i = 2; while (seen[k]) k = c + ' (' + i++ + ')'; seen[k] = 1; return k; });
    var body = aoa.slice(h + 1, h + 1 + MAX_ROWS);
    // quitar filas de totales
    body = body.filter(function (r) { return !(typeof r[0] === 'string' && /^(total|totales|suma|grand total)\b/i.test(r[0].trim())); });
    var cols = header.map(function (c, j) { return typeColumn(c, body.map(function (r) { return r[j] === undefined ? null : r[j]; })); });
    var keep = cols.map(function (c, j) { return c.type !== 'empty' ? j : -1; }).filter(function (j) { return j >= 0; });
    var rows = body.map(function (r) {
      var o = {};
      keep.forEach(function (j) {
        var c = cols[j], v = r[j] === undefined ? null : r[j];
        if (v === '' ) v = null;
        if (v !== null) {
          if (c.type === 'date') v = toDate(v);
          else if (c.type === 'number') v = toNum(v);
          else v = norm(v);
        }
        o[c.name] = v;
      });
      return o;
    });
    if (rows.length < 2) return null;
    return { name: name, columns: keep.map(function (j) { return cols[j]; }), rows: rows };
  }
  function readWorkbook(data, filename) {
    var XLSX = window.XLSX;
    var wb = typeof data === 'string' ? XLSX.read(data, { type: 'string', cellDates: true, raw: false }) : XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true });
    var sheets = [];
    wb.SheetNames.forEach(function (n) {
      var aoa = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null, blankrows: false });
      var s = readSheet(n, aoa);
      if (s) sheets.push(s);
    });
    return { name: filename || 'datos', sheets: sheets };
  }

  /* ---------------- utilidades de tabla ---------------- */
  var colsOf = function (s, t) { return s.columns.filter(function (c) { return c.type === t; }); };
  var dateCol = function (s) { return colsOf(s, 'date')[0] || null; };
  var monthKey = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  function aggFor(col) { return col && (/^pct/.test(col.unit) || col.ratio) ? 'mean' : 'sum'; }
  function aggregate(vals, agg) {
    vals = vals.filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (agg === 'count') return vals.length;
    if (!vals.length) return null;
    if (agg === 'mean') return mean(vals);
    if (agg === 'max') return Math.max.apply(null, vals);
    if (agg === 'min') return Math.min.apply(null, vals);
    if (agg === 'last') return vals[vals.length - 1];
    return sum(vals);
  }
  function filterRows(s, filter) {
    if (!filter || !filter.column) return s.rows;
    return s.rows.filter(function (r) { return norm(r[filter.column]) === norm(filter.value); });
  }
  function monthly(s, measure, agg, filter) {
    var dc = dateCol(s); if (!dc) return [];
    var g = {};
    filterRows(s, filter).forEach(function (r) { var d = r[dc.name]; if (!(d instanceof Date)) return; var k = monthKey(d); (g[k] = g[k] || []).push(r[measure]); });
    return Object.keys(g).sort().map(function (k) { return { k: k, v: aggregate(g[k], agg) }; }).filter(function (p) { return p.v !== null; });
  }
  function byCategory(s, measure, cat, agg, filter, months) {
    var g = {}, rows = filterRows(s, filter), dc = dateCol(s);
    if (months && dc) {
      var keys = Object.keys(rows.reduce(function (a, r) { if (r[dc.name] instanceof Date) a[monthKey(r[dc.name])] = 1; return a; }, {})).sort().slice(-months);
      var set = {}; keys.forEach(function (k) { set[k] = 1; });
      rows = rows.filter(function (r) { return r[dc.name] instanceof Date && set[monthKey(r[dc.name])]; });
    }
    rows.forEach(function (r) { var k = norm(r[cat]); if (!k) return; (g[k] = g[k] || []).push(r[measure]); });
    return Object.keys(g).map(function (k) { return { k: k, v: aggregate(g[k], agg) }; }).filter(function (p) { return p.v !== null; }).sort(function (a, b) { return b.v - a.v; });
  }
  function catCols(s) { return s.columns.filter(function (c) { if (c.type !== 'category') return false; var u = {}; s.rows.forEach(function (r) { if (r[c.name]) u[r[c.name]] = 1; }); var n = Object.keys(u).length; return n >= 2 && n <= 25; }); }
  function labelCol(s) {
    var isCode = function (c) { var v = s.rows.map(function (r) { return r[c.name]; }).filter(Boolean).slice(0, 20); return v.length && v.every(function (x) { return /^[A-Z]{2,6}[-_ ]?\d+$/i.test(String(x)) || /^\d+$/.test(String(x)); }); };
    var named = colsOf(s, 'id').concat(colsOf(s, 'text')).filter(function (c) { return !isCode(c); });
    return named[0] || colsOf(s, 'category')[0] || colsOf(s, 'id')[0] || null;
  }
  function measures(s) {
    return colsOf(s, 'number').filter(function (c) { return !/(^id$|código|codigo|cp\b|tel)/i.test(c.name); });
  }

  /* ---------------- formato ---------------- */
  function fmt(v, unit, lang) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    var loc = lang === 'en' ? 'en-GB' : 'es-ES';
    var nf = function (x, d) { return new Intl.NumberFormat(loc, { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(x); };
    var a = Math.abs(v);
    if (unit === 'pct') return nf(v * 100, 1) + '%';
    if (unit === 'pct100') return nf(v, 1) + '%';
    if (unit === 'meur') return (a >= 1000 ? nf(v / 1000, 2) + ' mil M€' : nf(v, a < 10 ? 2 : 1) + ' M€');
    var sym = unit === 'usd' ? ' $' : unit === 'eur' ? ' €' : '';
    if (a >= 1e9) return nf(v / 1e9, 2) + (lang === 'en' ? 'bn' : ' mil M') + sym.trim();
    if (a >= 1e6) return nf(v / 1e6, 2) + ' M' + sym.trim();
    if (a >= 1e4) return nf(v / 1e3, 1) + 'k' + sym;
    return nf(v, a < 10 && Math.round(v) !== v ? 2 : 0) + sym;
  }
  var pctTxt = function (x, lang) { return (x > 0 ? '+' : '') + new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'es-ES', { maximumFractionDigits: 0 }).format(x * 100) + '%'; };
  function monthName(k, lang) {
    var p = k.split('-'), d = new Date(+p[0], +p[1] - 1, 1);
    return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES', { month: 'short', year: 'numeric' });
  }

  /* ---------------- perfil para la IA ---------------- */
  function profile(wb) {
    return {
      file: wb.name,
      sheets: wb.sheets.map(function (s) {
        var dc = dateCol(s), range = null;
        if (dc) { var ds = s.rows.map(function (r) { return r[dc.name]; }).filter(function (d) { return d instanceof Date; }).sort(function (a, b) { return a - b; }); if (ds.length) range = [monthKey(ds[0]), monthKey(ds[ds.length - 1])]; }
        return {
          name: s.name, rows: s.rows.length, date_range: range,
          columns: s.columns.map(function (c) {
            var o = { name: c.name, type: c.type }; if (c.unit) o.unit = c.unit;
            var vals = s.rows.map(function (r) { return r[c.name]; }).filter(function (v) { return v !== null && v !== undefined; });
            if (c.type === 'number') { o.sum = +sum(vals).toPrecision(6); o.min = +Math.min.apply(null, vals).toPrecision(6); o.max = +Math.max.apply(null, vals).toPrecision(6); o.mean = +mean(vals).toPrecision(6); }
            if (c.type === 'category') { var f = {}; vals.forEach(function (v) { f[v] = (f[v] || 0) + 1; }); o.values = Object.keys(f).sort(function (a, b) { return f[b] - f[a]; }).slice(0, 12); o.distinct = Object.keys(f).length; }
            if (c.type === 'text' || c.type === 'id') o.examples = vals.slice(0, 3).map(function (v) { return String(v).slice(0, 40); });
            return o;
          }),
          sample: s.rows.slice(0, 4).map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { var v = r[k]; o[k] = v instanceof Date ? monthKey(v) : (typeof v === 'string' ? v.slice(0, 40) : v); }); return o; })
        };
      })
    };
  }

  /* ---------------- importancia de una métrica ---------------- */
  var KEY = /(ingres|venta|revenue|factur|margen|beneficio|ebitda|profit|resultado|coste|cost|gasto|inversi|lead|client|pedido|order|conversi|nps|churn|retenci|defect|calidad|reclamac|valor|pipeline|mrr|arr|cac|roas|roi)/i;
  var MINOR = /(horas|energ|impresi|contactos|días de ciclo|plazo|id\b)/i;
  function importance(col, sheetIndex) {
    var w = 1;
    if (KEY.test(col.name)) w += 2;
    if (col.unit === 'eur' || col.unit === 'meur' || col.unit === 'usd') w += 1;
    if (MINOR.test(col.name)) w -= 1;
    return Math.max(0.2, w - Math.min(1, sheetIndex * 0.08));
  }

  /* ---------------- hechos calculados ---------------- */
  function facts(wb, lang) {
    var en = lang === 'en', tr = function (es, e) { return en ? e : es; };
    var out = [], id = 0;
    var add = function (kind, sheet, text, weight, data) { out.push({ id: 'F' + (++id), kind: kind, sheet: sheet, text: text, w: weight || 1, data: data || null }); };
    var series = []; // series mensuales para correlaciones entre hojas
    wb.sheets.forEach(function (s, si) {
      var dc = dateCol(s), cats = catCols(s).slice(0, 3);
      var ms = measures(s).map(function (m) { return { m: m, w: importance(m, si) }; }).sort(function (a, b) { return b.w - a.w; }).slice(0, 8).map(function (x) { x.m._w = x.w; return x.m; });
      if (dc) {
        ms.forEach(function (m, mi) {
          var agg = aggFor(m), ser = monthly(s, m.name, agg);
          if (ser.length < 4) return;
          var vals = ser.map(function (p) { return p.v; });
          series.push({ sheet: s.name, col: m, ser: ser });
          var n = Math.min(3, Math.floor(vals.length / 2)), a = mean(vals.slice(0, n)), b = mean(vals.slice(-n));
          var g = a ? b / a - 1 : 0;
          var peak = ser.reduce(function (x, y) { return y.v > x.v ? y : x; }), low = ser.reduce(function (x, y) { return y.v < x.v ? y : x; });
          var avg = mean(vals);
          add('trend', s.name, tr(
            '[' + s.name + '] ' + m.name + ': ' + (g >= 0 ? 'sube' : 'baja') + ' ' + pctTxt(g, lang) + ' (media de los últimos ' + n + ' meses vs. los primeros ' + n + '). Máximo en ' + monthName(peak.k, lang) + ' (' + fmt(peak.v, m.unit, lang) + '), mínimo en ' + monthName(low.k, lang) + ' (' + fmt(low.v, m.unit, lang) + ').',
            '[' + s.name + '] ' + m.name + ': ' + (g >= 0 ? 'up' : 'down') + ' ' + pctTxt(g, lang) + ' (last ' + n + ' months avg vs first ' + n + '). Peak in ' + monthName(peak.k, lang) + ' (' + fmt(peak.v, m.unit, lang) + '), low in ' + monthName(low.k, lang) + ' (' + fmt(low.v, m.unit, lang) + ').'), m._w * 1.2 + Math.min(1.5, Math.abs(g) * 2), { growth: g, measure: m.name, unit: m.unit, sheet: s.name, peak: peak.k, low: low.k });
          var last = ser[ser.length - 1], prev = ser[ser.length - 2];
          if (prev && prev.v) add('last', s.name, tr('[' + s.name + '] ' + m.name + ' en ' + monthName(last.k, lang) + ': ' + fmt(last.v, m.unit, lang) + ' (' + pctTxt(last.v / prev.v - 1, lang) + ' vs. mes anterior).', '[' + s.name + '] ' + m.name + ' in ' + monthName(last.k, lang) + ': ' + fmt(last.v, m.unit, lang) + ' (' + pctTxt(last.v / prev.v - 1, lang) + ' vs previous month).'), m._w * 0.6);
          if (vals.length >= 8) {
            var sd = Math.sqrt(mean(vals.map(function (v) { return (v - avg) * (v - avg); })));
            ser.forEach(function (p) { var z = sd ? (p.v - avg) / sd : 0; if (Math.abs(z) >= 2.2) add('anomaly', s.name, tr('[' + s.name + '] Valor atípico en ' + m.name + ' en ' + monthName(p.k, lang) + ': ' + fmt(p.v, m.unit, lang) + ' (' + (z > 0 ? 'muy por encima' : 'muy por debajo') + ' de la media de ' + fmt(avg, m.unit, lang) + ').', '[' + s.name + '] Outlier in ' + m.name + ' in ' + monthName(p.k, lang) + ': ' + fmt(p.v, m.unit, lang) + ' (' + (z > 0 ? 'well above' : 'well below') + ' the ' + fmt(avg, m.unit, lang) + ' average).'), 2.5); });
          }
          // cambios de nivel por periodo (detecta tramos anómalos de varios meses)
          if (vals.length >= 10) {
            var w = 3, bestD = 0, bestI = -1;
            for (var i = 0; i + w <= vals.length; i++) { var win = mean(vals.slice(i, i + w)), rest = mean(vals.slice(0, i).concat(vals.slice(i + w))); var dlt = rest ? win / rest - 1 : 0; if (Math.abs(dlt) > Math.abs(bestD)) { bestD = dlt; bestI = i; } }
            if (Math.abs(bestD) >= 0.25 && bestI >= 0) add('period', s.name, tr('[' + s.name + '] Entre ' + monthName(ser[bestI].k, lang) + ' y ' + monthName(ser[bestI + w - 1].k, lang) + ', ' + m.name + ' estuvo un ' + pctTxt(bestD, lang) + ' respecto al resto del periodo.', '[' + s.name + '] Between ' + monthName(ser[bestI].k, lang) + ' and ' + monthName(ser[bestI + w - 1].k, lang) + ', ' + m.name + ' was ' + pctTxt(bestD, lang) + ' versus the rest of the period.'), 1.5 + m._w * 0.6 + Math.min(2, Math.abs(bestD)), { measure: m.name, sheet: s.name, from: ser[bestI].k, to: ser[bestI + w - 1].k, delta: bestD });
          }
        });
      }
      cats.forEach(function (c) {
        ms.slice(0, 4).forEach(function (m) {
          var agg = aggFor(m), b = byCategory(s, m.name, c.name, agg);
          if (b.length < 2) return;
          if (agg === 'sum') {
            var tot = sum(b.map(function (x) { return x.v; })); if (!tot) return;
            add('share', s.name, tr('[' + s.name + '] ' + m.name + ' por ' + c.name + ': ' + b.slice(0, 4).map(function (x) { return x.k + ' ' + Math.round(x.v / tot * 100) + '%'; }).join(', ') + (b.length > 4 ? ' (de ' + b.length + ')' : '') + '. Menor: ' + b[b.length - 1].k + ' (' + Math.round(b[b.length - 1].v / tot * 100) + '%).',
              '[' + s.name + '] ' + m.name + ' by ' + c.name + ': ' + b.slice(0, 4).map(function (x) { return x.k + ' ' + Math.round(x.v / tot * 100) + '%'; }).join(', ') + (b.length > 4 ? ' (of ' + b.length + ')' : '') + '. Lowest: ' + b[b.length - 1].k + ' (' + Math.round(b[b.length - 1].v / tot * 100) + '%).'), 1 + m._w * 0.7 + (b[0].v / tot > 0.5 ? 0.8 : 0), { measure: m.name, sheet: s.name, cat: c.name, top: b[0].k, topShare: b[0].v / tot, bottom: b[b.length - 1].k });
          } else {
            add('compare', s.name, tr('[' + s.name + '] ' + m.name + ' (media) por ' + c.name + ': mejor ' + b[0].k + ' (' + fmt(b[0].v, m.unit, lang) + '), peor ' + b[b.length - 1].k + ' (' + fmt(b[b.length - 1].v, m.unit, lang) + ').', '[' + s.name + '] ' + m.name + ' (average) by ' + c.name + ': highest ' + b[0].k + ' (' + fmt(b[0].v, m.unit, lang) + '), lowest ' + b[b.length - 1].k + ' (' + fmt(b[b.length - 1].v, m.unit, lang) + ').'), 0.8 + m._w * 0.6, { measure: m.name, sheet: s.name, cat: c.name, top: b[0].k, bottom: b[b.length - 1].k });
          }
          if (dc && agg === 'sum') {
            var recent = byCategory(s, m.name, c.name, 'sum', null, 6), all = byCategory(s, m.name, c.name, 'sum', null, 12);
            var gr = recent.map(function (x) { var t = all.filter(function (y) { return y.k === x.k; })[0]; var older = t ? t.v - x.v : 0; return { k: x.k, g: older > 0 ? x.v / older - 1 : null }; }).filter(function (x) { return x.g !== null; }).sort(function (a, b) { return b.g - a.g; });
            if (gr.length >= 2) add('catgrowth', s.name, tr('[' + s.name + '] Crecimiento de ' + m.name + ' por ' + c.name + ' (últimos 6 meses vs. 6 anteriores): más rápido ' + gr[0].k + ' (' + pctTxt(gr[0].g, lang) + '), más lento ' + gr[gr.length - 1].k + ' (' + pctTxt(gr[gr.length - 1].g, lang) + ').', '[' + s.name + '] Growth of ' + m.name + ' by ' + c.name + ' (last 6 months vs previous 6): fastest ' + gr[0].k + ' (' + pctTxt(gr[0].g, lang) + '), slowest ' + gr[gr.length - 1].k + ' (' + pctTxt(gr[gr.length - 1].g, lang) + ').'), 1.2 + m._w * 0.7, { measure: m.name, sheet: s.name, cat: c.name, fast: gr[0], slow: gr[gr.length - 1] });
          }
        });
      });
      // hojas sin fecha: rankings
      if (!dc) {
        var lc = labelCol(s);
        if (lc && s.rows.length >= 4) ms.slice(0, 5).forEach(function (m) {
          var rows = s.rows.filter(function (r) { return typeof r[m.name] === 'number'; }).slice().sort(function (a, b) { return b[m.name] - a[m.name]; });
          if (rows.length < 4) return;
          add('rank', s.name, tr('[' + s.name + '] ' + m.name + ': más alto ' + rows.slice(0, 2).map(function (r) { return r[lc.name] + ' (' + fmt(r[m.name], m.unit, lang) + ')'; }).join(', ') + '; más bajo ' + rows.slice(-2).reverse().map(function (r) { return r[lc.name] + ' (' + fmt(r[m.name], m.unit, lang) + ')'; }).join(', ') + '.',
            '[' + s.name + '] ' + m.name + ': highest ' + rows.slice(0, 2).map(function (r) { return r[lc.name] + ' (' + fmt(r[m.name], m.unit, lang) + ')'; }).join(', ') + '; lowest ' + rows.slice(-2).reverse().map(function (r) { return r[lc.name] + ' (' + fmt(r[m.name], m.unit, lang) + ')'; }).join(', ') + '.'), 0.8 + m._w * 0.6, { measure: m.name, sheet: s.name, label: lc.name, top: rows[0][lc.name], bottom: rows[rows.length - 1][lc.name], unit: m.unit });
        });
        // correlaciones a nivel de fila
        for (var i = 0; i < ms.length; i++) for (var j = i + 1; j < ms.length; j++) {
          var rr = s.rows.filter(function (r) { return typeof r[ms[i].name] === 'number' && typeof r[ms[j].name] === 'number'; });
          if (rr.length < 8) continue;
          var r = pearson(rr.map(function (x) { return x[ms[i].name]; }), rr.map(function (x) { return x[ms[j].name]; }));
          if (Math.abs(r) >= 0.6 && Math.abs(r) < 0.97) add('corr', s.name, tr('[' + s.name + '] ' + ms[i].name + ' y ' + ms[j].name + ' están ' + (r > 0 ? 'positivamente' : 'negativamente') + ' relacionados (r = ' + r.toFixed(2) + ', ' + rr.length + ' filas).', '[' + s.name + '] ' + ms[i].name + ' and ' + ms[j].name + ' are ' + (r > 0 ? 'positively' : 'negatively') + ' related (r = ' + r.toFixed(2) + ', ' + rr.length + ' rows).'), 2 + Math.abs(r));
        }
      }
    });
    // correlaciones entre series mensuales (dentro y entre hojas)
    var pairs = [];
    for (var a = 0; a < series.length; a++) for (var b = a + 1; b < series.length; b++) {
      var A = series[a], B = series[b];
      if (A.sheet === B.sheet && A.col.name === B.col.name) continue;
      if (A.sheet === B.sheet && A.col.name.split(/\s+/)[0].toLowerCase() === B.col.name.split(/\s+/)[0].toLowerCase()) continue;
      var mapB = {}; B.ser.forEach(function (p) { mapB[p.k] = p.v; });
      var xs = [], ys = []; A.ser.forEach(function (p) { if (mapB[p.k] !== undefined) { xs.push(p.v); ys.push(mapB[p.k]); } });
      var cross = A.sheet !== B.sheet;
      if (xs.length < (cross ? 12 : 8)) continue;
      var rr2 = pearson(xs, ys);
      if (!cross && Math.abs(rr2) >= 0.97) continue; // relaciones obvias (una métrica deriva de la otra)
      if (Math.abs(rr2) >= (cross ? 0.6 : 0.75)) pairs.push({ r: rr2, A: A, B: B, n: xs.length, w: (A.col._w || 1) + (B.col._w || 1) });
    }
    var pscore = function (p) { return Math.abs(p.r) * 2 + (p.A.sheet !== p.B.sheet ? 1 : 0) + p.w * 0.3; };
    pairs.sort(function (x, y) { return pscore(y) - pscore(x); }).slice(0, 12).forEach(function (p) {
      add('corr', p.A.sheet + ' / ' + p.B.sheet, tr('Relación mensual ' + (p.r > 0 ? 'positiva' : 'inversa') + ' entre [' + p.A.sheet + '] ' + p.A.col.name + ' y [' + p.B.sheet + '] ' + p.B.col.name + ' (r = ' + p.r.toFixed(2) + ', ' + p.n + ' meses).', (p.r > 0 ? 'Positive' : 'Inverse') + ' monthly relationship between [' + p.A.sheet + '] ' + p.A.col.name + ' and [' + p.B.sheet + '] ' + p.B.col.name + ' (r = ' + p.r.toFixed(2) + ', ' + p.n + ' months).'), 1 + pscore(p) * 0.6, { a: p.A.col.name, as: p.A.sheet, b: p.B.col.name, bs: p.B.sheet, r: p.r, cross: p.A.sheet !== p.B.sheet });
    });
    out.sort(function (x, y) { return y.w - x.w; });
    return out.slice(0, 90);
  }

  /* ---------------- especificación → dashboard calculado ---------------- */
  function findSheet(wb, name) { return wb.sheets.filter(function (s) { return s.name === name; })[0] || wb.sheets.filter(function (s) { return s.name.toLowerCase() === String(name || '').toLowerCase(); })[0]; }
  function findCol(s, name, type) { var c = s && s.columns.filter(function (c) { return c.name === name || c.name.toLowerCase() === String(name || '').toLowerCase(); })[0]; return c && (!type || c.type === type) ? c : null; }
  function compute(wb, spec, lang) {
    var out = { kpis: [], charts: [], period: null };
    (spec.kpis || []).forEach(function (k) {
      var s = findSheet(wb, k.sheet), c = findCol(s, k.column, 'number'); if (!c) return;
      var agg = k.agg || aggFor(c), dc = dateCol(s), filter = k.filter && findCol(s, k.filter.column) ? k.filter : null;
      var item = { label: String(k.label || c.name).slice(0, 60), unit: c.unit, invert: !!k.lower_is_better };
      if (dc && k.period !== 'all') {
        var ser = monthly(s, c.name, agg === 'last' ? 'sum' : agg, filter); if (!ser.length) return;
        var last = ser[ser.length - 1], prev = ser[ser.length - 2];
        item.value = last.v; item.delta = prev && prev.v ? last.v / prev.v - 1 : null; item.note = monthName(last.k, lang);
      } else {
        item.value = aggregate(filterRows(s, filter).map(function (r) { return r[c.name]; }), agg === 'last' ? 'sum' : agg); item.delta = null; item.note = '';
      }
      if (item.value === null) return;
      item.text = fmt(item.value, c.unit, lang);
      out.kpis.push(item);
    });
    (spec.charts || []).forEach(function (ch) {
      var s = findSheet(wb, ch.sheet), c = findCol(s, ch.column, 'number'); if (!c) return;
      var agg = ch.agg || aggFor(c), filter = ch.filter && findCol(s, ch.filter.column) ? ch.filter : null;
      var item = { type: ch.type === 'bar' ? 'bar' : 'line', title: String(ch.title || c.name).slice(0, 80), unit: c.unit, sheet: s.name };
      if (item.type === 'line') {
        var ser = monthly(s, c.name, agg, filter); if (ser.length < 2) return;
        item.labels = ser.map(function (p) { return p.k; }); item.values = ser.map(function (p) { return p.v; });
      } else {
        var cat = findCol(s, ch.by) || catCols(s)[0] || labelCol(s); if (!cat) return;
        var b = cat.type === 'category' ? byCategory(s, c.name, cat.name, agg, filter, ch.last_months || null)
          : s.rows.filter(function (r) { return typeof r[c.name] === 'number'; }).map(function (r) { return { k: norm(r[cat.name]), v: r[c.name] }; }).sort(function (x, y) { return y.v - x.v; });
        if (ch.ascending) b = b.slice().sort(function (x, y) { return x.v - y.v; });
        b = b.slice(0, ch.top || 10); if (b.length < 2) return;
        item.labels = b.map(function (p) { return p.k; }); item.values = b.map(function (p) { return p.v; }); item.by = cat.name;
        item.share = agg === 'sum' && !/^pct/.test(c.unit);
      }
      out.charts.push(item);
    });
    return out;
  }

  /* ---------------- especificación automática (sin IA) ---------------- */
  function heuristicSpec(wb, lang, factsList, ctx) {
    var en = lang === 'en', tr = function (es, e) { return en ? e : es; };
    var cand = [];
    wb.sheets.forEach(function (s, si) { measures(s).forEach(function (m) { cand.push({ s: s, m: m, score: importance(m, si) + (dateCol(s) ? 1.5 : 0) + (/^pct/.test(m.unit) ? -0.3 : 0) }); }); });
    cand.sort(function (a, b) { return b.score - a.score; });
    var usedK = {}, kpis = [];
    cand.forEach(function (c) { if (kpis.length >= 4) return; var k = c.m.name.toLowerCase().replace(/\s*\(.*\)/, ''); if (usedK[k]) return; usedK[k] = 1; kpis.push({ label: c.m.name, sheet: c.s.name, column: c.m.name, period: dateCol(c.s) ? 'last_month' : 'all', lower_is_better: /(coste|cost|gasto|defect|churn|reclamac|bajas|retraso|cac)/i.test(c.m.name) }); });
    var charts = [], usedS = {};
    cand.filter(function (c) { return dateCol(c.s); }).forEach(function (c) { if (charts.length >= 2 || usedS[c.s.name + c.m.name]) return; usedS[c.s.name + c.m.name] = 1; charts.push({ type: 'line', title: c.m.name + ' · ' + c.s.name, sheet: c.s.name, column: c.m.name }); });
    // gráficos de los hallazgos más fuertes: periodos anómalos y repartos
    factsList.filter(function (f) { return f.kind === 'period' && f.data; }).slice(0, 1).forEach(function (f) { if (!usedS[f.data.sheet + f.data.measure]) charts.push({ type: 'line', title: f.data.measure + ' · ' + f.data.sheet, sheet: f.data.sheet, column: f.data.measure }); });
    factsList.filter(function (f) { return f.kind === 'share' && f.data; }).slice(0, 2).forEach(function (f) { charts.push({ type: 'bar', title: f.data.measure + ' ' + tr('por', 'by') + ' ' + f.data.cat, sheet: f.data.sheet, column: f.data.measure, by: f.data.cat }); });
    factsList.filter(function (f) { return f.kind === 'rank' && f.data; }).slice(0, 1).forEach(function (f) { if (charts.length < 6) charts.push({ type: 'bar', title: f.data.measure + ' · ' + f.data.sheet, sheet: f.data.sheet, column: f.data.measure, by: f.data.label }); });
    var strip = function (t) { return t.replace(/^\[[^\]]+\]\s*/, ''); };
    var of = function (kind, n) { return factsList.filter(function (f) { return f.kind === kind; }).slice(0, n); };
    var insights = of('trend', 3).map(function (f) { return strip(f.text); }).concat(of('share', 2).map(function (f) { return strip(f.text); })).slice(0, 5);
    var opps = [];
    of('catgrowth', 4).forEach(function (f) { if (!f.data || opps.length >= 3) return; var d = f.data; if (d.fast.g > 0.05) opps.push(tr(d.fast.k + ' es lo que más crece en ' + d.measure + ' (' + pctTxt(d.fast.g, lang) + ' en el último semestre): candidato a recibir más inversión y atención comercial.', d.fast.k + ' is growing fastest in ' + d.measure + ' (' + pctTxt(d.fast.g, lang) + ' in the last half-year): a candidate for more investment and sales focus.')); });
    of('share', 3).forEach(function (f) { if (!f.data || opps.length >= 4) return; if (f.data.topShare > 0.5) opps.push(tr(f.data.top + ' concentra el ' + Math.round(f.data.topShare * 100) + '% de ' + f.data.measure + ': diversificar reduciría el riesgo.', f.data.top + ' accounts for ' + Math.round(f.data.topShare * 100) + '% of ' + f.data.measure + ': diversifying would reduce risk.')); });
    var rels = of('corr', 4).map(function (f) { return strip(f.text) + (f.data && f.data.cross ? tr(' Puede indicar que una cosa influye en la otra: merece la pena investigarlo.', ' It may indicate that one drives the other: worth investigating.') : ''); });
    var actions = [];
    of('period', 3).forEach(function (f) { if (!f.data) return; var d = f.data; actions.push({ t: tr('Investigar qué pasó con ' + d.measure + ' (' + d.sheet + ') entre ' + monthName(d.from, lang) + ' y ' + monthName(d.to, lang) + ': ' + pctTxt(d.delta, lang) + ' respecto al resto del periodo.', 'Investigate what happened to ' + d.measure + ' (' + d.sheet + ') between ' + monthName(d.from, lang) + ' and ' + monthName(d.to, lang) + ': ' + pctTxt(d.delta, lang) + ' versus the rest of the period.'), impact: tr('Alto', 'High'), effort: tr('Bajo', 'Low'), when: tr('Esta semana', 'This week') }); });
    of('catgrowth', 3).forEach(function (f) { if (!f.data || actions.length >= 5) return; var d = f.data; if (d.slow.g < -0.1) actions.push({ t: tr('Revisar ' + d.slow.k + ': ' + d.measure + ' cae ' + pctTxt(d.slow.g, lang) + ' en el último semestre.', 'Review ' + d.slow.k + ': ' + d.measure + ' fell ' + pctTxt(d.slow.g, lang) + ' in the last half-year.'), impact: tr('Medio', 'Medium'), effort: tr('Medio', 'Medium'), when: tr('Este mes', 'This month') }); });
    of('rank', 2).forEach(function (f) { if (!f.data || actions.length >= 5) return; var d = f.data; actions.push({ t: tr('Analizar ' + d.bottom + ' (' + d.label + '): es el valor más bajo en ' + d.measure + '.', 'Analyse ' + d.bottom + ' (' + d.label + '): it has the lowest ' + d.measure + '.'), impact: tr('Medio', 'Medium'), effort: tr('Bajo', 'Low'), when: tr('Este mes', 'This month') }); });
    var ideas = [tr('Añade el margen o la rentabilidad por línea o canal para priorizar por beneficio, no solo por volumen.', 'Add margin or profitability by line or channel to prioritise by profit, not just volume.'),
      tr('Si tienes datos de clientes (altas, bajas, satisfacción), cruzarlos con estos datos explicaría mejor las tendencias.', 'If you have customer data (sign-ups, churn, satisfaction), crossing it with this data would explain the trends better.'),
      tr('Con más meses de histórico se podrían separar mejor estacionalidad y tendencia.', 'With more months of history, seasonality and trend could be separated better.')];
    var top = of('trend', 1)[0];
    return {
      title: (ctx && ctx.company) || wb.name.replace(/\.[a-z]+$/i, ''),
      summary: tr('Análisis automático de ' + wb.sheets.length + ' ' + (wb.sheets.length === 1 ? 'hoja' : 'hojas') + ', calculado con código a partir de tus datos.', 'Automatic analysis of ' + wb.sheets.length + ' ' + (wb.sheets.length === 1 ? 'sheet' : 'sheets') + ', computed with code from your data.') + (top ? ' ' + strip(top.text) : ''),
      kpis: kpis, charts: charts.slice(0, 6), insights: insights, relationships: rels, opportunities: opps, actions: actions.slice(0, 5), ideas: ideas, warnings: []
    };
  }

  /* ---------------- gráficos (SVG a tamaño real) ---------------- */
  var css = function (v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); };
  function drawChart(svg, tip, ch, lang) {
    var W = Math.max(300, Math.round(svg.clientWidth || 600)), g = '';
    if (ch.type === 'line') {
      var H = 240, pl = 60, pr = 16, pt = 14, pb = 30, ys = ch.values, n = ys.length;
      var max = Math.max.apply(null, ys.concat([0])), min = Math.min.apply(null, ys.concat([0])); if (max === min) max = min + 1; max += (max - min) * 0.08;
      var x = function (i) { return pl + i * (W - pl - pr) / Math.max(1, n - 1); }, y = function (v) { return pt + (1 - (v - min) / (max - min)) * (H - pt - pb); };
      for (var k = 0; k <= 4; k++) { var v = min + (max - min) * k / 4; g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="' + css('--grid') + '"/><text x="' + (pl - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fmt(v, ch.unit, lang).replace(/ ?[€$]$/, '') + '</text>'; }
      var step = Math.ceil(n / (W < 420 ? 4 : 7));
      ch.labels.forEach(function (l, i) { if ((i % step === 0 && x(n - 1) - x(i) >= 72) || i === n - 1) g += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + monthName(l, lang) + '</text>'; });
      var col = css('--c1');
      g += '<path d="M' + x(0) + ',' + y(Math.max(min, 0)) + ' L' + ys.map(function (v, i) { return x(i) + ',' + y(v); }).join(' L') + ' L' + x(n - 1) + ',' + y(Math.max(min, 0)) + ' Z" fill="' + col + '" opacity=".08"/>';
      g += '<polyline points="' + ys.map(function (v, i) { return x(i) + ',' + y(v); }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>';
      g += '<circle cx="' + x(n - 1) + '" cy="' + y(ys[n - 1]) + '" r="4.5" fill="' + col + '" stroke="' + css('--paper') + '" stroke-width="2"/>';
      g += '<line class="xh" y1="' + pt + '" y2="' + (H - pb) + '" stroke="' + css('--muted') + '" stroke-dasharray="3 3" opacity="0"/><circle class="xd" r="5" fill="' + col + '" stroke="' + css('--paper') + '" stroke-width="2" opacity="0"/><rect class="hit" x="' + pl + '" y="' + pt + '" width="' + (W - pl - pr) + '" height="' + (H - pt - pb) + '" fill="transparent"/>';
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.innerHTML = g;
      var hit = svg.querySelector('.hit'), xh = svg.querySelector('.xh'), xd = svg.querySelector('.xd'), card = svg.parentNode;
      hit.addEventListener('pointermove', function (ev) {
        var r = svg.getBoundingClientRect(), sx = (ev.clientX - r.left) * W / r.width, i = Math.max(0, Math.min(n - 1, Math.round((sx - pl) / ((W - pl - pr) / Math.max(1, n - 1)))));
        xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('opacity', 1); xd.setAttribute('cx', x(i)); xd.setAttribute('cy', y(ys[i])); xd.setAttribute('opacity', 1);
        tip.innerHTML = '<b>' + monthName(ch.labels[i], lang) + '</b><br>' + fmt(ys[i], ch.unit, lang) + (i && ys[i - 1] ? ' · ' + pctTxt(ys[i] / ys[i - 1] - 1, lang) : '');
        var cr = card.getBoundingClientRect(), px = r.left - cr.left + x(i) * r.width / W, py = r.top - cr.top + y(ys[i]) * r.height / H;
        tip.style.opacity = 1; tip.style.left = Math.min(Math.max(8, px - tip.offsetWidth / 2), cr.width - tip.offsetWidth - 8) + 'px'; tip.style.top = (py - tip.offsetHeight - 14) + 'px';
      });
      hit.addEventListener('pointerleave', function () { tip.style.opacity = 0; xh.setAttribute('opacity', 0); xd.setAttribute('opacity', 0); });
    } else {
      var rowH = 34, lw = Math.min(170, Math.round(W * 0.34)), pr2 = 96, vals = ch.values, mx = Math.max.apply(null, vals.map(Math.abs).concat([1e-9])), tot = sum(vals.filter(function (v) { return v > 0; }));
      var H2 = 6 + vals.length * rowH, c1 = css('--c1');
      ch.labels.forEach(function (l, i) {
        var yy = 6 + i * rowH, w = Math.max(3, (W - lw - pr2) * Math.abs(vals[i]) / mx), lab = l.length > 24 ? l.slice(0, 23) + '…' : l;
        g += '<text class="lab" x="0" y="' + (yy + 17) + '">' + esc(lab) + '</text>';
        g += '<rect x="' + lw + '" y="' + (yy + 6) + '" width="' + w + '" height="16" rx="4" fill="' + (vals[i] < 0 ? css('--c2') : c1) + '"/>';
        g += '<text class="val" x="' + (lw + w + 8) + '" y="' + (yy + 18) + '">' + fmt(vals[i], ch.unit, lang) + (ch.share && tot ? ' · ' + Math.round(vals[i] / tot * 100) + '%' : '') + '</text>';
        g += '<rect class="bh" data-i="' + i + '" x="0" y="' + yy + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>';
      });
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H2); svg.innerHTML = g;
      var card2 = svg.parentNode;
      svg.querySelectorAll('.bh').forEach(function (r) {
        r.addEventListener('pointermove', function (ev) { var i = +r.getAttribute('data-i'); tip.innerHTML = '<b>' + esc(ch.labels[i]) + '</b><br>' + fmt(vals[i], ch.unit, lang); var cr = card2.getBoundingClientRect(); tip.style.opacity = 1; tip.style.left = Math.min(ev.clientX - cr.left + 14, cr.width - tip.offsetWidth - 8) + 'px'; tip.style.top = (ev.clientY - cr.top - tip.offsetHeight - 10) + 'px'; });
        r.addEventListener('pointerleave', function () { tip.style.opacity = 0; });
      });
    }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  window.PLGEngine = { importance: importance, readWorkbook: readWorkbook, profile: profile, facts: facts, compute: compute, heuristicSpec: heuristicSpec, drawChart: drawChart, fmt: fmt, pctTxt: pctTxt, monthName: monthName };
})();
