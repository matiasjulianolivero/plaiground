/**
 * plaiground · Worker
 * --------------------------------------------------------------
 * Sirve la web estática (carpeta public/) y, solo para /api/*, la API de Data plaiground:
 *
 *   POST   /api/auth/request   { email, accepted, lang }  → envía el enlace mágico por email (Resend)
 *   POST   /api/auth/verify    { token }                   → valida el enlace y abre sesión (cookie)
 *   POST   /api/auth/logout                                → cierra la sesión
 *   GET    /api/me                                         → { email } o 401
 *   DELETE /api/me                                         → borra la cuenta y todos sus datos
 *   GET    /api/dashboards                                 → lista de dashboards del usuario
 *   POST   /api/dashboards     { id, title, ... }          → crea o actualiza un dashboard
 *   DELETE /api/dashboards/:id                             → borra un dashboard
 *
 * Configuración necesaria en Cloudflare:
 *   - Base de datos D1 con binding DB (se crea sola en el primer despliegue).
 *   - Secreto RESEND_API_KEY (Workers → plaiground → Settings → Variables and Secrets).
 *   - Variables APP_URL y EMAIL_FROM (en wrangler.jsonc).
 */

const SESSION_COOKIE = 'plg_session';
const TOKEN_TTL_MIN = 15;
const SESSION_TTL_DAYS = 30;
const MAX_REQUESTS_PER_EMAIL_HOUR = 5;
const MAX_REQUESTS_PER_IP_HOUR = 20;
const MAX_DASHBOARDS = 50;

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, created_at INTEGER NOT NULL,
      terms_accepted_at INTEGER, last_login_at INTEGER, lang TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS login_tokens (
      token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL, used_at INTEGER, ip TEXT, accepted INTEGER, lang TEXT)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tokens_email ON login_tokens(email, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tokens_ip ON login_tokens(ip, created_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS dashboards (
      id TEXT NOT NULL, user_id TEXT NOT NULL, data TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, id))`)
  ]);
  schemaReady = true;
}

/* ---------- utilidades ---------- */
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

function randomToken(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function getCookie(req, name) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
const sessionCookie = (value, maxAge) =>
  `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const validEmail = e => typeof e === 'string' && e.length <= 254 && /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]{2,}$/.test(e);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function readJson(req) {
  try { return await req.json(); } catch (e) { return {}; }
}

// Protección CSRF básica: las peticiones que cambian datos deben venir de nuestra propia web
function sameOrigin(req, url) {
  const o = req.headers.get('origin');
  return !o || o === url.origin;
}

async function currentUser(req, env) {
  const raw = getCookie(req, SESSION_COOKIE);
  if (!raw) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.lang FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`
  ).bind(await sha256(raw), Date.now()).first();
  return row || null;
}

/* ---------- email ---------- */
function loginEmail(link, lang) {
  const en = lang === 'en';
  const subject = en ? 'Your access link to Data plaiground' : 'Tu enlace de acceso a Data plaiground';
  const html = `<!DOCTYPE html><html><body style="margin:0;background:#F4F5FB;font-family:Arial,Helvetica,sans-serif;color:#14162E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5FB;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;padding:32px">
<tr><td style="font-size:22px;font-weight:bold;letter-spacing:-0.5px">pl<span style="color:#4338CA">ai</span>ground <span style="font-size:13px;color:#555A7A;font-weight:normal">Data</span></td></tr>
<tr><td style="padding:22px 0 8px;font-size:20px;font-weight:bold">${en ? 'Sign in to Data plaiground' : 'Entra en Data plaiground'}</td></tr>
<tr><td style="font-size:15px;line-height:1.55;color:#555A7A">${en ? 'Click the button to sign in. The link expires in 15 minutes and can only be used once.' : 'Pulsa el botón para entrar. El enlace caduca en 15 minutos y solo se puede usar una vez.'}</td></tr>
<tr><td style="padding:24px 0"><a href="${esc(link)}" style="display:inline-block;background:#4338CA;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:999px">${en ? 'Sign in' : 'Entrar'}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#555A7A">${en ? 'If the button doesn’t work, copy this link into your browser:' : 'Si el botón no funciona, copia este enlace en tu navegador:'}<br><span style="word-break:break-all;color:#4338CA">${esc(link)}</span></td></tr>
<tr><td style="padding-top:22px;font-size:12px;color:#8A8EAD;border-top:1px solid #E6E8F5">${en ? 'If you didn’t request this, you can ignore this email.' : 'Si no lo has pedido tú, ignora este email.'} · plaigroundmarketing.com</td></tr>
</table></td></tr></table></body></html>`;
  const text = (en ? 'Sign in to Data plaiground (link valid for 15 minutes): ' : 'Entra en Data plaiground (enlace válido 15 minutos): ') + link;
  return { subject, html, text };
}

async function sendEmail(env, to, { subject, html, text }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM || 'Data plaiground <onboarding@resend.dev>', to: [to], subject, html, text })
  });
  if (!r.ok) {
    console.error('Resend error', r.status, await r.text());
    return false;
  }
  return true;
}

/* ---------- handlers ---------- */
async function requestLogin(req, env, url) {
  if (!env.RESEND_API_KEY) return json({ error: 'email_not_configured' }, 503);
  const body = await readJson(req);
  const email = String(body.email || '').trim().toLowerCase();
  const lang = body.lang === 'en' ? 'en' : 'es';
  if (!validEmail(email)) return json({ error: 'invalid_email' }, 400);
  if (body.accepted !== true) return json({ error: 'terms_required' }, 400);

  const now = Date.now(), hourAgo = now - 3600e3;
  const ip = req.headers.get('cf-connecting-ip') || '';
  const [byEmail, byIp] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS n FROM login_tokens WHERE email = ? AND created_at > ?').bind(email, hourAgo).first(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM login_tokens WHERE ip = ? AND created_at > ?').bind(ip, hourAgo).first()
  ]);
  if (byEmail.n >= MAX_REQUESTS_PER_EMAIL_HOUR || byIp.n >= MAX_REQUESTS_PER_IP_HOUR) return json({ error: 'too_many_requests' }, 429);

  const token = randomToken();
  await env.DB.prepare('INSERT INTO login_tokens (token_hash, email, created_at, expires_at, ip, accepted, lang) VALUES (?,?,?,?,?,?,?)')
    .bind(await sha256(token), email, now, now + TOKEN_TTL_MIN * 60e3, ip, 1, lang).run();

  const base = (env.APP_URL || url.origin).replace(/\/$/, '');
  const link = `${base}/data/app/?login=${token}`;
  const ok = await sendEmail(env, email, loginEmail(link, lang));
  if (!ok) return json({ error: 'email_failed' }, 502);
  return json({ ok: true });
}

async function verifyLogin(req, env) {
  const body = await readJson(req);
  const token = String(body.token || '');
  if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: 'invalid_token' }, 400);
  const now = Date.now();
  const hash = await sha256(token);
  // Marca el token como usado de forma atómica (solo funciona una vez)
  const used = await env.DB.prepare('UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING email, lang, accepted')
    .bind(now, hash, now).first();
  if (!used) return json({ error: 'expired_or_used' }, 400);

  let user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(used.email).first();
  if (!user) {
    user = { id: crypto.randomUUID() };
    await env.DB.prepare('INSERT INTO users (id, email, created_at, terms_accepted_at, last_login_at, lang) VALUES (?,?,?,?,?,?)')
      .bind(user.id, used.email, now, used.accepted ? now : null, now, used.lang).run();
  } else {
    await env.DB.prepare('UPDATE users SET last_login_at = ?, terms_accepted_at = COALESCE(terms_accepted_at, ?) WHERE id = ?').bind(now, now, user.id).run();
  }
  const session = randomToken();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)')
    .bind(await sha256(session), user.id, now, now + SESSION_TTL_DAYS * 864e5).run();
  // Limpieza ocasional de tokens y sesiones caducados
  await env.DB.batch([
    env.DB.prepare('DELETE FROM login_tokens WHERE expires_at < ?').bind(now - 864e5),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now)
  ]);
  return json({ ok: true, email: used.email }, 200, { 'set-cookie': sessionCookie(session, SESSION_TTL_DAYS * 86400) });
}

async function logout(req, env) {
  const raw = getCookie(req, SESSION_COOKIE);
  if (raw) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(raw)).run();
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
}

async function deleteAccount(env, user) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM dashboards WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM login_tokens WHERE email = ?').bind(user.email),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id)
  ]);
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
}

const DASH_FIELDS = ['id', 'title', 'biz', 'aud', 'company', 'data', 'goal', 'source', 'ts'];
function cleanDashboard(d) {
  const out = {};
  for (const k of DASH_FIELDS) if (d[k] !== undefined) out[k] = typeof d[k] === 'string' ? d[k].slice(0, 300) : d[k];
  if (!/^[a-z0-9]{4,24}$/i.test(String(out.id || ''))) return null;
  if (!['ecom', 'saas', 'fran'].includes(out.biz) || !['ceo', 'mkt', 'inv'].includes(out.aud)) return null;
  out.ts = Number(out.ts) || Date.now();
  return out;
}

async function api(req, env, url) {
  if (!env.DB) return json({ error: 'database_not_configured', configured: false }, 503);
  await ensureSchema(env.DB);
  const { pathname } = url, m = req.method;
  if (m !== 'GET' && !sameOrigin(req, url)) return json({ error: 'forbidden' }, 403);

  if (pathname === '/api/auth/request' && m === 'POST') return requestLogin(req, env, url);
  if (pathname === '/api/auth/verify' && m === 'POST') return verifyLogin(req, env);
  if (pathname === '/api/auth/logout' && m === 'POST') return logout(req, env);

  const user = await currentUser(req, env);
  if (pathname === '/api/me' && m === 'GET') {
    return user ? json({ email: user.email }) : json({ error: 'unauthorized', configured: !!env.RESEND_API_KEY }, 401);
  }
  if (!user) return json({ error: 'unauthorized' }, 401);
  if (pathname === '/api/me' && m === 'DELETE') return deleteAccount(env, user);

  if (pathname === '/api/dashboards' && m === 'GET') {
    const { results } = await env.DB.prepare('SELECT data FROM dashboards WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?').bind(user.id, MAX_DASHBOARDS).all();
    return json({ dashboards: results.map(r => JSON.parse(r.data)) });
  }
  if (pathname === '/api/dashboards' && m === 'POST') {
    const d = cleanDashboard(await readJson(req));
    if (!d) return json({ error: 'invalid_dashboard' }, 400);
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM dashboards WHERE user_id = ?').bind(user.id).first();
    const exists = await env.DB.prepare('SELECT 1 FROM dashboards WHERE user_id = ? AND id = ?').bind(user.id, d.id).first();
    if (!exists && count.n >= MAX_DASHBOARDS) return json({ error: 'limit_reached' }, 409);
    const now = Date.now();
    await env.DB.prepare(`INSERT INTO dashboards (id, user_id, data, created_at, updated_at) VALUES (?,?,?,?,?)
      ON CONFLICT(user_id, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`)
      .bind(d.id, user.id, JSON.stringify(d), now, now).run();
    return json({ ok: true, dashboard: d });
  }
  const dm = pathname.match(/^\/api\/dashboards\/([a-z0-9]{4,24})$/i);
  if (dm && m === 'DELETE') {
    await env.DB.prepare('DELETE FROM dashboards WHERE user_id = ? AND id = ?').bind(user.id, dm[1]).run();
    return json({ ok: true });
  }
  return json({ error: 'not_found' }, 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(req, env, url); }
      catch (e) { console.error(e); return json({ error: 'server_error' }, 500); }
    }
    return env.ASSETS.fetch(req);
  }
};
