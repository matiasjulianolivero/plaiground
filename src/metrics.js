/**
 * Medición propia, sin cookies y sin datos personales.
 *
 *   POST /api/m                 { e, p?, r? }  → suma 1 a contadores diarios agregados (visitas por página,
 *                                                tipo de web de origen y algunos clics). No guarda IP, navegador ni identificadores.
 *   GET  /api/metrics/admin     (solo titular) → resumen semanal (lunes, hora de Madrid) de las últimas 13 semanas,
 *                                                con los datos que ya guarda la web: estudios AIBB, emails, contactos,
 *                                                suscriptores, cuentas e informes de Data.
 */
const TZ = 'Europe/Madrid';
const PAGES = ['home', 'aibb', 'caso', 'data', 'cv', 'barometer', 'newsletter', 'legal', 'otra'];
const EVENTS = ['hero', 'plai_menu', 'plai_go', 'svc'];
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|whatsapp|telegram/i;

export const METRICS_SCHEMA = 'CREATE TABLE IF NOT EXISTS metrics_daily (day TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, key))';

const dayOf = ts => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date(ts)); // AAAA-MM-DD en Madrid
function mondayOf(day) {
  const [y, m, d] = day.split('-').map(Number), t = Date.UTC(y, m - 1, d), wd = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - wd * 864e5).toISOString().slice(0, 10);
}
// Tipo de web de origen a partir del dominio (nunca la URL completa)
function source(host, self) {
  host = String(host || '').toLowerCase().replace(/^www\./, '');
  if (!host) return 'directo';
  if (host === self) return 'interna';
  if (/(^|\.)google\.|bing\.com$|duckduckgo\.com$|ecosia\.org$|yahoo\.|search\.brave\.com$/.test(host)) return 'buscador';
  if (/linkedin\.com$|lnkd\.in$/.test(host)) return 'linkedin';
  if (/chatgpt\.com$|openai\.com$|perplexity\.ai$|gemini\.google\.com$|copilot\.microsoft\.com$|claude\.ai$/.test(host)) return 'ia';
  if (/facebook\.com$|instagram\.com$|t\.co$|x\.com$|twitter\.com$|threads\.net$|tiktok\.com$|youtube\.com$|reddit\.com$/.test(host)) return 'redes';
  if (/mail\.|outlook\.|gmail\.com$|^newsletter/.test(host)) return 'email';
  return 'otra';
}

export async function track(req, env, json, onCrm) {
  const ok = () => new Response(null, { status: 204 });
  if (BOT.test(req.headers.get('user-agent') || '')) return ok();
  const len = +(req.headers.get('content-length') || 0);
  if (len > 600) return ok();
  let b = {};
  try { b = JSON.parse((await req.text()).slice(0, 600) || '{}'); } catch (e) { return ok(); }
  if (onCrm && (b.e === 'pv' || b.e === 'pv2' || b.e === 'pt')) { try { await onCrm(b); } catch (e) { console.error('crm', e); } }
  if (b.e === 'pv2' || b.e === 'pt') return ok();
  const day = dayOf(Date.now()), keys = [];
  if (b.e === 'pv') {
    const page = PAGES.includes(b.p) ? b.p : 'otra';
    const self = new URL(req.url).hostname.replace(/^www\./, '');
    keys.push('pv', 'pv:' + page, 'src:' + source(b.r, self));
  } else if (EVENTS.includes(b.e)) keys.push('ev:' + b.e);
  else return ok();
  await env.DB.batch(keys.map(k => env.DB.prepare('INSERT INTO metrics_daily (day, key, n) VALUES (?, ?, 1) ON CONFLICT(day, key) DO UPDATE SET n = n + 1').bind(day, k)));
  return ok();
}

export async function metricsAdmin(env, owner, json) {
  const WEEKS = 13, now = Date.now();
  const thisMonday = mondayOf(dayOf(now));
  const weeks = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const [y, m, d] = thisMonday.split('-').map(Number);
    weeks.push(new Date(Date.UTC(y, m - 1, d) - i * 7 * 864e5).toISOString().slice(0, 10));
  }
  const since = Date.UTC(...weeks[0].split('-').map((v, k) => k === 1 ? v - 1 : +v)) - 2 * 3600e3; // margen por la zona horaria
  const row = () => ({ visitas: 0, paginas: {}, origen: {}, eventos: {}, estudios_iniciados: 0, estudios_con_email: 0, dominios: 0, emails_aibb: 0, contactos: 0, suscriptores: 0, cuentas_nuevas: 0, informes_data: 0 });
  const W = Object.fromEntries(weeks.map(w => [w, row()]));
  const wk = ts => W[mondayOf(dayOf(ts))];

  const md = await env.DB.prepare('SELECT day, key, n FROM metrics_daily WHERE day >= ?').bind(weeks[0]).all();
  for (const r of md.results || []) {
    const w = W[mondayOf(r.day)]; if (!w) continue;
    const [kind, name] = r.key.split(':');
    if (kind === 'pv' && !name) w.visitas += r.n;
    else if (kind === 'pv') w.paginas[name] = (w.paginas[name] || 0) + r.n;
    else if (kind === 'src') w.origen[name] = (w.origen[name] || 0) + r.n;
    else if (kind === 'ev') w.eventos[name] = (w.eventos[name] || 0) + r.n;
  }
  const ownerId = owner ? owner.id : '', ownerEmail = owner ? owner.email.toLowerCase() : '';
  const q = async (sql, ...args) => ((await env.DB.prepare(sql).bind(...args).all().catch(() => ({ results: [] }))).results || []);

  for (const r of await q("SELECT ts FROM aibb_usage WHERE kind = 'setup' AND ts >= ? AND (user_id IS NULL OR user_id != ?)", since, ownerId)) { const w = wk(r.ts); if (w) w.estudios_iniciados++; }
  const doms = {};
  for (const r of await q('SELECT created_at, domain FROM aibb_studies WHERE created_at >= ? AND user_id != ?', since, ownerId)) {
    const w = wk(r.created_at); if (!w) continue; w.estudios_con_email++;
    const k = mondayOf(dayOf(r.created_at)); (doms[k] = doms[k] || new Set()).add(r.domain);
  }
  for (const k in doms) if (W[k]) W[k].dominios = doms[k].size;
  const emails = {};
  for (const r of (await q('SELECT created_at, email FROM aibb_unlocks WHERE created_at >= ?', since)).concat(await q('SELECT created_at, email FROM aibb_jobs WHERE created_at >= ?', since))) {
    const e = String(r.email || '').toLowerCase(); if (!e || e === ownerEmail) continue;
    const k = mondayOf(dayOf(r.created_at)); (emails[k] = emails[k] || new Set()).add(e);
  }
  for (const k in emails) if (W[k]) W[k].emails_aibb = emails[k].size;
  for (const r of await q('SELECT created_at, email FROM leads WHERE created_at >= ?', since)) { if (String(r.email).toLowerCase() === ownerEmail) continue; const w = wk(r.created_at); if (w) w.contactos++; }
  for (const r of await q('SELECT confirmed_at, email FROM subscribers WHERE confirmed_at >= ?', since)) { if (String(r.email).toLowerCase() === ownerEmail) continue; const w = wk(r.confirmed_at); if (w) w.suscriptores++; }
  for (const r of await q('SELECT created_at FROM users WHERE created_at >= ? AND id != ?', since, ownerId)) { const w = wk(r.created_at); if (w) w.cuentas_nuevas++; }
  for (const r of await q('SELECT created_at FROM dashboards WHERE created_at >= ? AND user_id != ?', since, ownerId)) { const w = wk(r.created_at); if (w) w.informes_data++; }

  const since0 = ((await q('SELECT MIN(day) AS d FROM metrics_daily'))[0] || {}).d || null;
  const excl = { ips: ((await q('SELECT COUNT(*) AS n FROM owner_ips WHERE last_seen > ?', now - 30 * 864e5))[0] || {}).n || 0 };
  const totals = { subscribers: ((await q("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'confirmed'"))[0] || {}).n || 0 };
  return json({ tz: TZ, generated_at: now, weeks: weeks.map(w => ({ week: w, ...W[w] })), totals, counted_since: since0, excluded: excl });
}
