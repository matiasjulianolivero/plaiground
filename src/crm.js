/**
 * CRM de plaiground (solo para el titular).
 *
 * Seguimiento (solo con consentimiento analítico, cookie propia plg_vid):
 *   - /api/m con la cookie: guarda páginas vistas, visitas (sesiones de 30 min) y tiempo visible.
 *   - linkVisitor(): cuando alguien deja su email (contacto, newsletter, acceso, AI Brand Barometer) se une su actividad.
 * Fichas: se reúnen por email desde contactos, newsletter, cuentas, AI Brand Barometer y Data.
 * Correos: registro de todos los envíos, plantillas y envío manual. Regla: las respuestas se pueden enviar
 * a cualquier contacto; los correos comerciales solo a quien aceptó recibirlos (suscriptor confirmado).
 *
 *   GET    /api/crm/contacts                 → lista
 *   GET    /api/crm/contact?email=           → ficha completa
 *   POST   /api/crm/contact   {email,status,notes,no_contact}
 *   GET    /api/crm/templates · POST /api/crm/templates {id?,name,subject,body,kind} · DELETE /api/crm/templates/:id
 *   POST   /api/crm/send      {email,subject,body,kind:'reply'|'commercial'}
 */
export const CRM_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS crm_visitors (vid TEXT PRIMARY KEY, email TEXT, created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, visits INTEGER NOT NULL DEFAULT 1)',
  'CREATE INDEX IF NOT EXISTS idx_crm_vis_email ON crm_visitors(email)',
  'CREATE TABLE IF NOT EXISTS crm_pageviews (id INTEGER PRIMARY KEY AUTOINCREMENT, vid TEXT NOT NULL, ts INTEGER NOT NULL, path TEXT, seconds INTEGER NOT NULL DEFAULT 0, ref TEXT)',
  'CREATE INDEX IF NOT EXISTS idx_crm_pv_vid ON crm_pageviews(vid, ts)',
  'CREATE TABLE IF NOT EXISTS crm_email_log (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, email TEXT NOT NULL, kind TEXT, subject TEXT, ok INTEGER, manual INTEGER DEFAULT 0, body TEXT)',
  'CREATE INDEX IF NOT EXISTS idx_crm_mail_email ON crm_email_log(email, ts)',
  'CREATE TABLE IF NOT EXISTS crm_contacts (email TEXT PRIMARY KEY, status TEXT, notes TEXT, no_contact INTEGER DEFAULT 0, updated_at INTEGER)',
  'CREATE TABLE IF NOT EXISTS crm_templates (id TEXT PRIMARY KEY, name TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, kind TEXT NOT NULL, updated_at INTEGER NOT NULL)'
];
const SESSION_GAP = 30 * 60e3, KEEP = 395 * 864e5;
const STATUSES = ['nuevo', 'contactado', 'en_conversacion', 'cliente', 'descartado'];

const vidOf = req => { const m = /(?:^|;\s*)plg_vid=([a-f0-9]{32})/.exec(req.headers.get('cookie') || ''); return m ? m[1] : null; };
const cleanPath = u => String(u || '').replace(/[^\w\-./?=]/g, '').slice(0, 120) || '/';

// Llamado desde /api/m: solo actúa si el navegador lleva la cookie analítica (es decir, con consentimiento)
export async function crmTrack(req, env, b) {
  const vid = vidOf(req); if (!vid) return;
  const now = Date.now();
  if (b.e === 'pv' || b.e === 'pv2') {
    const v = await env.DB.prepare('SELECT last_seen FROM crm_visitors WHERE vid = ?').bind(vid).first();
    const ops = [env.DB.prepare('INSERT INTO crm_pageviews (vid, ts, path, ref) VALUES (?,?,?,?)').bind(vid, now, cleanPath(b.u), String(b.r || '').slice(0, 80))];
    if (!v) ops.push(env.DB.prepare('INSERT INTO crm_visitors (vid, created_at, last_seen, visits) VALUES (?,?,?,1)').bind(vid, now, now));
    else ops.push(env.DB.prepare('UPDATE crm_visitors SET last_seen = ?, visits = visits + ? WHERE vid = ?').bind(now, now - v.last_seen > SESSION_GAP ? 1 : 0, vid));
    await env.DB.batch(ops);
  } else if (b.e === 'pt') {
    const s = Math.max(0, Math.min(3600, Math.round(+b.s || 0)));
    await env.DB.prepare('UPDATE crm_pageviews SET seconds = MAX(seconds, ?) WHERE id = (SELECT id FROM crm_pageviews WHERE vid = ? AND path = ? AND ts > ? ORDER BY ts DESC LIMIT 1)')
      .bind(s, vid, cleanPath(b.u), now - 6 * 3600e3).run();
  }
}

// Une la actividad del navegador (si dio su consentimiento) con el email que acaba de dejar
export async function linkVisitor(req, env, email) {
  try {
    const vid = vidOf(req); if (!vid || !email) return;
    const now = Date.now();
    await env.DB.prepare('INSERT INTO crm_visitors (vid, email, created_at, last_seen, visits) VALUES (?,?,?,?,1) ON CONFLICT(vid) DO UPDATE SET email = excluded.email')
      .bind(vid, String(email).toLowerCase(), now, now).run();
  } catch (e) { console.error('linkVisitor', e); }
}

export async function logEmail(env, to, kind, subject, ok, manual, body) {
  try {
    if (!env.DB || !to) return;
    const owner = String(env.LEAD_NOTIFY_EMAIL || '').toLowerCase();
    if (String(to).toLowerCase() === owner && !manual) return;
    await env.DB.prepare('INSERT INTO crm_email_log (ts, email, kind, subject, ok, manual, body) VALUES (?,?,?,?,?,?,?)')
      .bind(Date.now(), String(to).toLowerCase(), kind || 'auto', String(subject || '').slice(0, 200), ok ? 1 : 0, manual ? 1 : 0, body ? String(body).slice(0, 8000) : null).run();
  } catch (e) { console.error('logEmail', e); }
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function bodyHtml(text) {
  return esc(text).split(/\n{2,}/).map(p => '<p style="margin:0 0 14px">' + p.replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#4338CA">$1</a>') + '</p>').join('');
}

async function gather(env, ownerEmail) {
  const q = async (sql, ...a) => ((await env.DB.prepare(sql).bind(...a).all().catch(() => ({ results: [] }))).results || []);
  const C = {};
  const get = e => { e = String(e || '').toLowerCase().trim(); if (!e || e === ownerEmail) return null; return C[e] = C[e] || { email: e, name: '', company: '', web: '', sources: [], first: Infinity, last: 0, consent: false, sub: null, visits: 0, pages: 0, seconds: 0, mails: 0, lastMail: 0, status: 'nuevo', notes: '', no_contact: false, lang: '' }; };
  const seen = (c, ts) => { if (!c || !ts) return; c.first = Math.min(c.first, ts); c.last = Math.max(c.last, ts); };
  const src = (c, s) => { if (c && c.sources.indexOf(s) < 0) c.sources.push(s); };
  for (const r of await q('SELECT email, name, company, created_at, lang, interests FROM leads ORDER BY created_at')) { const c = get(r.email); if (!c) continue; c.name = r.name || c.name; c.company = r.company || c.company; c.lang = r.lang || c.lang; src(c, 'contacto'); seen(c, r.created_at); }
  for (const r of await q('SELECT email, name, status, created_at, confirmed_at, lang FROM subscribers')) { const c = get(r.email); if (!c) continue; c.name = c.name || r.name || ''; c.sub = r.status; c.consent = r.status === 'confirmed'; c.lang = c.lang || r.lang || ''; src(c, 'newsletter'); seen(c, r.created_at); seen(c, r.confirmed_at); }
  const users = await q('SELECT id, email, created_at, last_login_at, lang FROM users');
  const byId = {};
  for (const r of users) { const c = get(r.email); if (!c) continue; byId[r.id] = c; c.lang = c.lang || r.lang || ''; src(c, 'cuenta'); seen(c, r.created_at); seen(c, r.last_login_at); }
  for (const r of await q('SELECT user_id, domain, created_at FROM aibb_studies')) { const c = byId[r.user_id]; if (!c) continue; src(c, 'barometro'); c.web = c.web || r.domain || ''; seen(c, r.created_at); }
  for (const r of await q('SELECT email, created_at FROM aibb_unlocks')) { const c = get(r.email); if (c) { src(c, 'barometro'); seen(c, r.created_at); } }
  for (const r of await q('SELECT email, created_at, setup FROM aibb_jobs')) { const c = get(r.email); if (!c) continue; src(c, 'barometro'); seen(c, r.created_at); if (!c.web) { try { c.web = JSON.parse(r.setup).domain || ''; } catch (e) { } } }
  for (const r of await q('SELECT user_id, created_at FROM dashboards')) { const c = byId[r.user_id]; if (c) { src(c, 'data'); seen(c, r.created_at); } }
  for (const r of await q('SELECT v.email AS email, SUM(v.visits) AS visits, MAX(v.last_seen) AS last, (SELECT COUNT(*) FROM crm_pageviews p WHERE p.vid IN (SELECT vid FROM crm_visitors WHERE email = v.email)) AS pages, (SELECT COALESCE(SUM(seconds),0) FROM crm_pageviews p WHERE p.vid IN (SELECT vid FROM crm_visitors WHERE email = v.email)) AS secs FROM crm_visitors v WHERE v.email IS NOT NULL GROUP BY v.email')) {
    const c = get(r.email); if (!c) continue; c.visits = r.visits || 0; c.pages = r.pages || 0; c.seconds = r.secs || 0; seen(c, r.last);
  }
  for (const r of await q('SELECT email, COUNT(*) AS n, MAX(ts) AS last FROM crm_email_log WHERE ok = 1 GROUP BY email')) { const c = get(r.email); if (c) { c.mails += r.n; c.lastMail = Math.max(c.lastMail, r.last); } }
  for (const r of await q('SELECT email, COUNT(*) AS n, MAX(sent_at) AS last FROM newsletter_sends WHERE ok = 1 GROUP BY email')) { const c = get(r.email); if (c) { c.mails += r.n; c.lastMail = Math.max(c.lastMail, r.last); } }
  for (const r of await q('SELECT email, status, notes, no_contact FROM crm_contacts')) { const c = C[String(r.email).toLowerCase()]; if (!c) continue; c.status = r.status || c.status; c.notes = r.notes || ''; c.no_contact = !!r.no_contact; }
  Object.values(C).forEach(c => { if (c.first === Infinity) c.first = c.last || 0; });
  return { C, byId, q };
}

export async function crmApi(req, env, url, pathname, m, owner, h) {
  if (!env.DB) return h.json({ error: 'database_not_configured' }, 503);
  await env.DB.batch(CRM_SCHEMA.map(s => env.DB.prepare(s)));
  const ownerEmail = String(owner.email || '').toLowerCase();
  const body = m === 'POST' ? await req.json().catch(() => ({})) : {};

  if (pathname === '/api/crm/contacts' && m === 'GET') {
    await env.DB.prepare('DELETE FROM crm_pageviews WHERE ts < ?').bind(Date.now() - KEEP).run().catch(() => { });
    const { C } = await gather(env, ownerEmail);
    const list = Object.values(C).sort((a, b) => b.last - a.last);
    const anon = await env.DB.prepare('SELECT COUNT(*) AS n FROM crm_visitors WHERE email IS NULL').first().catch(() => ({ n: 0 }));
    return h.json({ contacts: list, anonymous_visitors: anon ? anon.n : 0, statuses: STATUSES });
  }

  if (pathname === '/api/crm/contact' && m === 'GET') {
    const email = String(url.searchParams.get('email') || '').toLowerCase();
    const { C, byId, q } = await gather(env, ownerEmail);
    const c = C[email]; if (!c) return h.json({ error: 'not_found' }, 404);
    const uids = Object.keys(byId).filter(id => byId[id] === c);
    const inU = uids.length ? uids.map(() => '?').join(',') : "''";
    const leads = await q('SELECT code, created_at, name, company, role, interests, urgency, message, newsletter, lang FROM leads WHERE email = ? ORDER BY created_at DESC', email);
    const studies = uids.length ? await q(`SELECT id, created_at, domain, brand, score FROM aibb_studies WHERE user_id IN (${inU}) ORDER BY created_at DESC LIMIT 50`, ...uids) : [];
    const dashboards = uids.length ? await q(`SELECT id, created_at, data FROM dashboards WHERE user_id IN (${inU}) ORDER BY created_at DESC LIMIT 50`, ...uids) : [];
    const pages = await q('SELECT p.ts, p.path, p.seconds, p.ref FROM crm_pageviews p JOIN crm_visitors v ON v.vid = p.vid WHERE v.email = ? ORDER BY p.ts DESC LIMIT 300', email);
    const mails = (await q('SELECT ts, kind, subject, ok, manual, body FROM crm_email_log WHERE email = ? ORDER BY ts DESC LIMIT 100', email))
      .concat((await q('SELECT issue, sent_at, ok FROM newsletter_sends WHERE email = ?', email)).map(r => ({ ts: r.sent_at, kind: 'newsletter', subject: 'Newsletter · ' + r.issue, ok: r.ok, manual: 0 })))
      .sort((a, b) => b.ts - a.ts);
    // Páginas más vistas y tiempo por página
    const top = {}; pages.forEach(p => { const t = top[p.path] = top[p.path] || { path: p.path, views: 0, seconds: 0 }; t.views++; t.seconds += p.seconds || 0; });
    return h.json({
      contact: c, leads, studies,
      dashboards: dashboards.map(d => { let t = ''; try { t = JSON.parse(d.data).title || ''; } catch (e) { } return { id: d.id, created_at: d.created_at, title: t }; }),
      pages, topPages: Object.values(top).sort((a, b) => b.views - a.views).slice(0, 15), mails
    });
  }

  if (pathname === '/api/crm/contact' && m === 'POST') {
    const email = String(body.email || '').toLowerCase().trim();
    if (!h.validEmail(email)) return h.json({ error: 'invalid_email' }, 400);
    const status = STATUSES.includes(body.status) ? body.status : 'nuevo';
    await env.DB.prepare('INSERT INTO crm_contacts (email, status, notes, no_contact, updated_at) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET status = excluded.status, notes = excluded.notes, no_contact = excluded.no_contact, updated_at = excluded.updated_at')
      .bind(email, status, String(body.notes || '').slice(0, 4000), body.no_contact ? 1 : 0, Date.now()).run();
    return h.json({ ok: true });
  }

  if (pathname === '/api/crm/templates' && m === 'GET') {
    const r = await env.DB.prepare('SELECT * FROM crm_templates ORDER BY updated_at DESC').all();
    return h.json({ templates: r.results || [] });
  }
  if (pathname === '/api/crm/templates' && m === 'POST') {
    const id = /^[a-f0-9]{16}$/.test(String(body.id || '')) ? body.id : h.randomToken(8);
    const name = String(body.name || '').trim().slice(0, 80), subject = String(body.subject || '').trim().slice(0, 200), text = String(body.body || '').slice(0, 8000);
    if (!name || !subject || !text) return h.json({ error: 'missing_fields' }, 400);
    const kind = body.kind === 'commercial' ? 'commercial' : 'reply';
    await env.DB.prepare('INSERT INTO crm_templates (id, name, subject, body, kind, updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, subject = excluded.subject, body = excluded.body, kind = excluded.kind, updated_at = excluded.updated_at')
      .bind(id, name, subject, text, kind, Date.now()).run();
    return h.json({ ok: true, id });
  }
  const tm = pathname.match(/^\/api\/crm\/templates\/([a-f0-9]{16})$/);
  if (tm && m === 'DELETE') { await env.DB.prepare('DELETE FROM crm_templates WHERE id = ?').bind(tm[1]).run(); return h.json({ ok: true }); }

  if (pathname === '/api/crm/send' && m === 'POST') {
    if (!env.RESEND_API_KEY) return h.json({ error: 'email_not_configured' }, 503);
    const email = String(body.email || '').toLowerCase().trim();
    const subject = String(body.subject || '').trim().slice(0, 200), text = String(body.body || '').trim().slice(0, 8000);
    const kind = body.kind === 'commercial' ? 'commercial' : 'reply';
    if (!h.validEmail(email) || !subject || !text) return h.json({ error: 'missing_fields' }, 400);
    const { C } = await gather(env, ownerEmail);
    const c = C[email];
    if (!c) return h.json({ error: 'not_a_contact' }, 404);
    if (c.no_contact) return h.json({ error: 'no_contact' }, 409);
    if (kind === 'commercial' && !c.consent) return h.json({ error: 'no_consent' }, 409);
    const base = (env.APP_URL || url.origin).replace(/\/$/, ''), en = c.lang === 'en';
    let unsub = '';
    if (kind === 'commercial') { const s = await env.DB.prepare('SELECT token FROM subscribers WHERE email = ?').bind(email).first(); if (s) unsub = `${base}/api/newsletter/unsubscribe?t=${s.token}`; }
    const foot = en
      ? `You receive this email from Matías Olivero (plaiground, plaigroundmarketing.com) because you got in touch through the website.${unsub ? ` <a href="${unsub}" style="color:#555A7A">Unsubscribe</a>.` : ' If you don’t want more emails, just reply and let me know.'}`
      : `Recibes este correo de Matías Olivero (plaiground, plaigroundmarketing.com) porque contactaste a través de la web.${unsub ? ` <a href="${unsub}" style="color:#555A7A">Darte de baja</a>.` : ' Si no quieres recibir más correos, respóndeme y lo anoto.'}`;
    const html = `<!DOCTYPE html><html><body style="margin:0;background:#F4F5FB;font-family:Arial,Helvetica,sans-serif;color:#14162E"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5FB;padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;padding:28px"><tr><td style="font-size:20px;font-weight:bold;padding-bottom:16px">pl<span style="color:#4338CA">ai</span>ground</td></tr><tr><td style="font-size:15px;line-height:1.6">${bodyHtml(text)}</td></tr><tr><td style="font-size:12px;color:#555A7A;line-height:1.5;padding-top:18px;border-top:1px solid #E6E7F2">${foot}</td></tr></table></td></tr></table></body></html>`;
    const plain = text + '\n\n—\n' + foot.replace(/<[^>]+>/g, '') + (unsub ? ' ' + unsub : '');
    const ok = await h.sendEmail(env, email, { subject, html, text: plain, from: env.LEAD_FROM, replyTo: env.LEAD_NOTIFY_EMAIL, kind: kind === 'commercial' ? 'manual_comercial' : 'manual_respuesta', manual: true, body: text });
    if (ok && c.status === 'nuevo') await env.DB.prepare("INSERT INTO crm_contacts (email, status, updated_at) VALUES (?, 'contactado', ?) ON CONFLICT(email) DO UPDATE SET status = CASE WHEN crm_contacts.status IS NULL OR crm_contacts.status = 'nuevo' THEN 'contactado' ELSE crm_contacts.status END, updated_at = excluded.updated_at").bind(email, Date.now()).run();
    return ok ? h.json({ ok: true }) : h.json({ error: 'send_failed' }, 502);
  }
  return h.json({ error: 'not_found' }, 404);
}
