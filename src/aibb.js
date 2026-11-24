/*
 * plaiground · AI Brand Barometer (API)
 * Mide cómo aparece una marca en las respuestas de distintos LLM frente a su competencia.
 *
 * Coste: por defecto SOLO la capa gratuita de la API de Gemini (secreto GEMINI_API_KEY, sin facturación activada).
 * OpenAI, Anthropic y Perplexity están preparados pero apagados: se activan solo si existen su clave y su modelo
 * (OPENAI_API_KEY + OPENAI_MODEL, ANTHROPIC_API_KEY + AIBB_ANTHROPIC_MODEL, PERPLEXITY_API_KEY + PERPLEXITY_MODEL).
 * Sin claves o sin sesión, todo funciona en MODO DEMO con respuestas de ejemplo marcadas como tales.
 */

const DAILY_CALLS_DEFAULT = 300;   // tope global de llamadas a LLM al día (la capa gratuita de Flash-Lite ronda las 500)
const STUDIES_PER_USER_DAY = 3;    // estudios reales por usuario y día
const MAX_PROMPTS = 8, MAX_COMPETITORS = 7; // más de 7 competidores: informe Premium
const TEASER_PROMPTS = 3, TEASER_ASKS_PER_IP_DAY = 16; // sin registro: vista previa de 3 preguntas + preparación del resto en segundo plano (2 estudios al día por IP)

const ENGINES = [
  { id: 'gemini', name: 'Gemini', key: 'GEMINI_API_KEY', model: 'GEMINI_MODEL', def: 'gemini-3.1-flash-lite', alt: ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-flash-latest'] },
  { id: 'chatgpt', name: 'ChatGPT', key: 'OPENAI_API_KEY', model: 'OPENAI_MODEL' },
  { id: 'claude', name: 'Claude', key: 'ANTHROPIC_API_KEY', model: 'AIBB_ANTHROPIC_MODEL' },
  { id: 'perplexity', name: 'Perplexity', key: 'PERPLEXITY_API_KEY', model: 'PERPLEXITY_MODEL' }
];
const engineActive = (env, e) => !!env[e.key] && !!(env[e.model] || e.def);
const engineList = env => ENGINES.map(e => ({ id: e.id, name: e.name, active: engineActive(env, e) }));

export function createAibb(h) {
  const { json, currentUser, randomToken } = h;
  const STUDIES_PER_IP_DAY = 5;

  /* ---------- utilidades ---------- */
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const clip = (s, n) => String(s == null ? '' : s).slice(0, n);
  const domainOf = u => { try { return new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { return ''; } };
  const rootOf = d => { const p = d.split('.'); return p.length > 2 && p[p.length - 2].length <= 3 ? p[p.length - 3] : p[p.length - 2] || d; };
  const titleCase = s => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  async function ensure(env) {
    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS aibb_usage (ts INTEGER NOT NULL, user_id TEXT, engine TEXT, kind TEXT, ok INTEGER)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_aibb_usage_ts ON aibb_usage(ts)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS aibb_studies (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, domain TEXT, brand TEXT, lang TEXT, score INTEGER, visibility REAL, data TEXT NOT NULL)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_aibb_user ON aibb_studies(user_id, created_at)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS aibb_shares (token TEXT PRIMARY KEY, study_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER)`),
      env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_aibb_shares_study ON aibb_shares(study_id)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS aibb_log (ts INTEGER NOT NULL, msg TEXT)`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS aibb_unlocks (token TEXT PRIMARY KEY, email TEXT NOT NULL, created_at INTEGER NOT NULL, ip TEXT, uses INTEGER DEFAULT 0)`)
    ]);
  }
  async function quota(env, user, kind) {
    const since = Date.now() - 864e5;
    const all = await env.DB.prepare('SELECT COUNT(*) AS n FROM aibb_usage WHERE ts > ?').bind(since).first();
    if (all.n >= (+env.AIBB_DAILY_CALLS || DAILY_CALLS_DEFAULT)) return 'global_limit';
    if (kind === 'setup' && !(user.email && env.LEAD_NOTIFY_EMAIL && user.email.toLowerCase() === env.LEAD_NOTIFY_EMAIL.toLowerCase())) {
      const mine = await env.DB.prepare("SELECT COUNT(*) AS n FROM aibb_usage WHERE ts > ? AND user_id = ? AND kind = 'setup'").bind(since, user.id).first();
      if (mine.n >= (String(user.id).startsWith('ip:') ? STUDIES_PER_IP_DAY : STUDIES_PER_USER_DAY + 2)) return 'user_limit';
    }
    return '';
  }
  const logUse = (env, user, engine, kind, ok) => env.DB.prepare('INSERT INTO aibb_usage (ts, user_id, engine, kind, ok) VALUES (?,?,?,?,?)').bind(Date.now(), user ? user.id : null, engine, kind, ok ? 1 : 0).run();

  /* ---------- llamadas a los LLM ---------- */
  async function callEngine(env, id, prompt, { json: wantJson = false, temperature = 0.7, system = '' } = {}, retried = false) {
    const e = ENGINES.find(x => x.id === id); if (!e || !engineActive(env, e)) return { error: 'engine_off' };
    const model = env[e.model] || e.def;
    try {
      if (id === 'gemini') {
        // Los modelos Gemini 3.5+ no admiten temperature/top_p: no se envían. Si un modelo no existe, se prueba el siguiente.
        const models = [model].concat(env[e.model] ? [] : (e.alt || []));
        let last = 'engine_failed';
        for (const mdl of models) {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(mdl)}:generateContent`, {
            method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env[e.key] },
            body: JSON.stringify(Object.assign({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: Object.assign({ maxOutputTokens: 4096 }, wantJson ? { responseMimeType: 'application/json' } : {}) }, system ? { systemInstruction: { parts: [{ text: system }] } } : {}))
          });
          const d = await r.json().catch(() => ({}));
          if (r.ok) {
            const text = ((d.candidates || [])[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
            if (text) return { text };
            await logErr(env, `gemini ${mdl} empty: ${JSON.stringify(d).slice(0, 300)}`); last = 'engine_failed'; continue;
          }
          await logErr(env, `gemini ${mdl} ${r.status}: ${JSON.stringify(d).slice(0, 400)}`);
          // 400/404: modelo no disponible; 403/429 con cupo 0: el modelo no está en la capa gratuita → probar el siguiente
          // Modelo no disponible, sin cupo gratuito o saturado (503 'high demand'): probar el siguiente modelo
          if (r.status === 400 || r.status === 404 || r.status === 403 || r.status >= 500 || (r.status === 429 && /limit: ?0|free_tier|FreeTier/i.test(JSON.stringify(d)))) { last = r.status === 429 ? 'rate_limited' : 'engine_failed'; continue; }
          if ((r.status === 429 || r.status >= 500) && !retried) { await new Promise(res => setTimeout(res, 1500)); return callEngine(env, id, prompt, { json: wantJson, temperature, system }, true); }
          return { error: r.status === 429 ? 'rate_limited' : 'engine_failed' };
        }
        return { error: last };
      }
      if (id === 'chatgpt' || id === 'perplexity') {
        const url = id === 'chatgpt' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.perplexity.ai/chat/completions';
        const msgs = (system ? [{ role: 'system', content: system }] : []).concat([{ role: 'user', content: prompt }]);
        const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env[e.key]}` }, body: JSON.stringify(Object.assign({ model, messages: msgs }, wantJson && id === 'chatgpt' ? { response_format: { type: 'json_object' } } : {})) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { console.error(id, r.status, JSON.stringify(d).slice(0, 300)); return { error: r.status === 429 ? 'rate_limited' : 'engine_failed' }; }
        let text = ((d.choices || [])[0]?.message?.content) || '';
        if (Array.isArray(d.citations) && d.citations.length) text += '\n\nFuentes: ' + d.citations.join(' ');
        return { text };
      }
      if (id === 'claude') {
        const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': env[e.key], 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ model, max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }, system ? { system } : {})) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { console.error('claude', r.status, JSON.stringify(d).slice(0, 300)); return { error: r.status === 429 ? 'rate_limited' : 'engine_failed' }; }
        return { text: (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('') };
      }
    } catch (err) { console.error(id, err); return { error: 'engine_failed' }; }
    return { error: 'engine_off' };
  }
  async function logErr(env, msg) { console.error(msg); try { await env.DB.prepare('INSERT INTO aibb_log (ts, msg) VALUES (?,?)').bind(Date.now(), String(msg).slice(0, 600)).run(); } catch (e) { } }
  const parseJson = t => { try { return JSON.parse(String(t).replace(/^```(json)?|```$/g, '').trim()); } catch (e) { const m = String(t).match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch (e2) { return null; } } };

  /* ---------- lectura de la web ---------- */
  async function readSite(url) {
    const out = { title: '', description: '', siteName: '', h1: '', lang: '' };
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; plaiground-AIBB/1.0; +https://plaigroundmarketing.com/ai-barometer/)', accept: 'text/html' }, redirect: 'follow', cf: { cacheTtl: 3600 } });
      if (!r.ok || !(r.headers.get('content-type') || '').includes('html')) return out;
      const html = (await r.text()).slice(0, 400000);
      const pick = re => { const m = html.match(re); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; };
      const dec = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
      out.title = dec(pick(/<title[^>]*>([^<]{1,200})<\/title>/i));
      out.description = dec(pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,400})/i) || pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,400})/i));
      out.siteName = dec(pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{1,80})/i));
      out.h1 = dec(pick(/<h1[^>]*>([\s\S]{1,200}?)<\/h1>/i).replace(/<[^>]+>/g, ''));
      out.lang = pick(/<html[^>]+lang=["']([a-zA-Z-]{2,8})/i);
    } catch (e) { /* web no accesible: seguimos con el dominio */ }
    return out;
  }

  /* ---------- preparación (marca, categoría, competidores, preguntas) ---------- */
  function demoSetup(domain, site, lang) {
    const brand = site.siteName || titleCase(rootOf(domain));
    const es = lang !== 'en';
    const cat = es ? 'software de gestión para empresas' : 'business management software';
    const comps = ['Alfaplus', 'Betaware', 'Gammix', 'Deltio']; // competidores ficticios del modo demo
    return { domain, brand, category: cat, country: es ? 'España' : 'United States', language: es ? 'es' : 'en', competitors: comps, prompts: templatePrompts(brand, cat, es ? 'España' : 'the US', comps[0], es) };
  }
  function manualSetup(domain, site, lang) {
    const es = lang !== 'en', brand = site.siteName || titleCase(rootOf(domain));
    const cat = clip((site.description || site.title || '').split(/[.|·\-–—:]/)[0].trim(), 70);
    return { domain, brand, category: cat, country: '', language: es ? 'es' : 'en', competitors: [],
      prompts: es ? [`¿Qué opinan los clientes de ${brand}?`, `¿Cuáles son las mejores alternativas a ${brand}?`, `¿Es ${brand} una buena opción? ¿Qué pros y contras tiene?`, `¿Qué empresas hacen lo mismo que ${brand} y cuál recomiendas?`, `¿Cuánto cuesta trabajar con ${brand} o con empresas similares?`, `¿Qué empresa recomiendas en el sector de ${brand} para una pyme?`]
        : [`What do customers think of ${brand}?`, `What are the best alternatives to ${brand}?`, `Is ${brand} a good choice? What are the pros and cons?`, `Which companies do the same as ${brand} and which do you recommend?`, `How much does it cost to work with ${brand} or similar companies?`, `Which company in ${brand}’s industry do you recommend for a small business?`] };
  }
  function templatePrompts(brand, cat, country, comp, es) {
    return es ? [
      `¿Cuáles son las mejores opciones de ${cat} en ${country}?`, `Recomiéndame un proveedor de ${cat} para una pyme`, `${brand} o ${comp}: ¿cuál me conviene más?`,
      `¿Qué opinan los clientes de ${brand}?`, `¿Qué alternativas hay a ${comp}?`, `¿Cuánto cuesta ${cat} y qué opciones hay?`,
      `Top 5 de ${cat} más recomendadas este año`, `¿Qué ${cat} tiene mejor relación calidad-precio?`]
      : [`What are the best ${cat} options in ${country}?`, `Recommend a ${cat} provider for a small business`, `${brand} or ${comp}: which one should I choose?`,
        `What do customers think of ${brand}?`, `What are the alternatives to ${comp}?`, `How much does ${cat} cost and what are the options?`,
        `Top 5 most recommended ${cat} this year`, `Which ${cat} offers the best value for money?`];
  }
  async function liveSetup(env, user, domain, site, lang) {
    const es = lang !== 'en';
    const prompt = `Analiza esta web y devuelve SOLO un JSON.
Dominio: ${domain}
Título: ${site.title}
Descripción: ${site.description}
Nombre del sitio: ${site.siteName}
H1: ${site.h1}
Idioma de la web: ${site.lang || 'desconocido'}

Devuelve: {"brand": nombre comercial de la marca, "category": categoría de producto/servicio en 2-5 palabras (en ${es ? 'español' : 'inglés'}), "country": país principal de mercado, "competitors": [entre 3 y 7 competidores directos reales en ese mercado, solo nombres de marca: incluye todos los que de verdad compiten con ella por los mismos clientes (si hay 6 o 7 relevantes, pon 6 o 7; si solo hay 3 claros, pon 3), sin rellenar con marcas poco relevantes], "prompts": [${MAX_PROMPTS} preguntas que haría un comprador a un asistente de IA en ${es ? 'español' : 'inglés'}, variadas: mejores opciones de la categoría, recomendación para su caso, comparativa con un competidor, opiniones de la marca, alternativas a un competidor, precio, top 5, mejor relación calidad-precio. No menciones la marca en más de 3 de ellas]}`;
    const r = await callEngine(env, 'gemini', prompt, { json: true, temperature: 0.4 });
    await logUse(env, user, 'gemini', 'setup', !r.error);
    if (r.error) return { error: r.error };
    const j = parseJson(r.text) || {};
    const base = demoSetup(domain, site, lang);
    const comps = (Array.isArray(j.competitors) ? j.competitors : []).map(c => clip(String(c).trim(), 60)).filter(Boolean).slice(0, MAX_COMPETITORS);
    const prompts = (Array.isArray(j.prompts) ? j.prompts : []).map(p => clip(String(p).trim(), 240)).filter(Boolean).slice(0, MAX_PROMPTS);
    return {
      domain, brand: clip(j.brand || base.brand, 60), category: clip(j.category || base.category, 80), country: clip(j.country || base.country, 60), language: es ? 'es' : 'en',
      competitors: comps.length ? comps : [], prompts: prompts.length >= 4 ? prompts : templatePrompts(clip(j.brand || base.brand, 60), clip(j.category || base.category, 80), clip(j.country || base.country, 60), comps[0] || (es ? 'la competencia' : 'the competition'), es)
    };
  }
  function cleanSetup(s) {
    s = s || {};
    const domain = domainOf(s.domain || '');
    return {
      domain, brand: clip(String(s.brand || '').trim(), 60) || titleCase(rootOf(domain || 'marca')), category: clip(s.category, 80), country: clip(s.country, 60), language: s.language === 'en' ? 'en' : 'es',
      competitors: (Array.isArray(s.competitors) ? s.competitors : []).map(c => clip(String(c).trim(), 60)).filter(Boolean).slice(0, MAX_COMPETITORS),
      prompts: (Array.isArray(s.prompts) ? s.prompts : []).map(p => clip(String(p).trim(), 240)).filter(Boolean).slice(0, MAX_PROMPTS)
    };
  }
  const askSystem = lang => lang === 'en'
    ? 'You are an AI assistant helping a buyer. Answer naturally and concretely, naming specific brands and providers when relevant, in the order you would recommend them. At the end add one line starting with "Sources:" listing the websites (URLs or domains) you would rely on.'
    : 'Eres un asistente de IA que ayuda a un comprador. Responde con naturalidad y de forma concreta, nombrando marcas y proveedores específicos cuando proceda, en el orden en que los recomendarías. Al final añade una línea que empiece por "Fuentes:" con las webs (URL o dominio) en las que te basarías.';

  /* ---------- análisis de respuestas ---------- */
  function brandAliases(name, domain) {
    const a = new Set([norm(name)]);
    const n = norm(name).replace(/\b(s\.?a\.?|s\.?l\.?|inc\.?|ltd\.?|gmbh|group|grupo)\b/g, '').trim(); if (n.length > 2) a.add(n);
    if (domain) { a.add(norm(domain)); const r = rootOf(domain); if (r.length > 3) a.add(norm(r)); }
    return [...a].filter(x => x.length > 1);
  }
  function findFirst(text, aliases) {
    let best = -1;
    for (const al of aliases) {
      const re = new RegExp('(^|[^a-z0-9])' + al.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z0-9])', 'g');
      let m, count = 0, first = -1; while ((m = re.exec(text))) { count++; if (first < 0) first = m.index + m[1].length; }
      if (count && (best < 0 || first < best)) best = first;
    }
    return best;
  }
  function countAll(text, aliases) {
    let c = 0; for (const al of aliases) { const re = new RegExp('(^|[^a-z0-9])' + al.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z0-9])', 'g'); c = Math.max(c, (text.match(re) || []).length); } return c;
  }
  const IGNORE_DOM = /^(example\.com|ejemplo\.com)$/;
  function sourcesOf(raw) {
    const t = String(raw);
    const doms = new Set();
    (t.match(/https?:\/\/[^\s)\]>"',]+/g) || []).forEach(u => { const d = domainOf(u); if (d) doms.add(d); });
    (t.match(/\b(?:[a-z0-9-]+\.)+(?:com|es|net|org|io|co|ai|app|eu|info|biz|de|fr|it|uk|mx|ar|cl|pt|tech|dev)\b/gi) || []).forEach(d => { d = d.toLowerCase().replace(/^www\./, ''); if (!IGNORE_DOM.test(d)) doms.add(d); });
    return [...doms].slice(0, 20);
  }
  const POS = ['lider', 'mejor', 'recomend', 'excelente', 'destaca', 'popular', 'fiable', 'solido', 'intuitiv', 'completo', 'leader', 'best', 'recommend', 'excellent', 'stands out', 'reliable', 'solid', 'easy', 'great', 'top'];
  const NEG = ['caro', 'limitad', 'queja', 'problema', 'lento', 'complej', 'peor', 'falla', 'expensive', 'limited', 'complain', 'issue', 'slow', 'complex', 'worse', 'lack', 'drawback', 'desventaja'];
  function heuristicSentiment(text, idx) {
    if (idx < 0) return null;
    const w = text.slice(Math.max(0, idx - 160), idx + 260);
    let s = 0; POS.forEach(p => { if (w.includes(p)) s++; }); NEG.forEach(n => { if (w.includes(n)) s--; });
    return Math.max(-1, Math.min(1, s / 3));
  }
  function analyze(setup, answers, judge) {
    const brands = [{ name: setup.brand, aliases: brandAliases(setup.brand, setup.domain), target: true }].concat(setup.competitors.map(c => ({ name: c, aliases: brandAliases(c, '') })));
    const rows = answers.map((a, i) => {
      const t = norm(a.text);
      const hits = brands.map(b => ({ i: findFirst(t, b.aliases), n: countAll(t, b.aliases) }));
      const order = hits.map((x, k) => [x.i, k]).filter(x => x[0] >= 0).sort((x, y) => x[0] - y[0]).map(x => x[1]);
      const pos = brands.map((b, k) => { const p = order.indexOf(k); return p < 0 ? null : p + 1; });
      const src = sourcesOf(a.text);
      return { prompt: a.prompt, engine: a.engine, pos, count: hits.map(x => x.n), sources: src, own: src.some(d => setup.domain && (d === setup.domain || d.endsWith('.' + setup.domain))), sentiment: judge && judge[i] != null ? judge[i] : heuristicSentiment(t, hits[0].i) };
    });
    const N = rows.length || 1, totalMentions = rows.reduce((s, r) => s + r.count.reduce((x, y) => x + y, 0), 0) || 1;
    const brandStats = brands.map((b, k) => {
      const m = rows.filter(r => r.pos[k] != null);
      const avgPos = m.length ? m.reduce((s, r) => s + r.pos[k], 0) / m.length : null;
      return { name: b.name, target: !!b.target, visibility: m.length / N, avgPos, top1: rows.filter(r => r.pos[k] === 1).length / N, sov: rows.reduce((s, r) => s + r.count[k], 0) / totalMentions };
    });
    const engines = [...new Set(rows.map(r => r.engine))];
    const byEngine = engines.map(e => ({ engine: e, vis: brands.map((b, k) => { const rr = rows.filter(r => r.engine === e); return rr.length ? rr.filter(r => r.pos[k] != null).length / rr.length : 0; }) }));
    const srcCount = {}; rows.forEach(r => r.sources.forEach(d => { srcCount[d] = (srcCount[d] || 0) + 1; }));
    const sources = Object.entries(srcCount).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([d, n]) => ({ domain: d, n, own: !!setup.domain && (d === setup.domain || d.endsWith('.' + setup.domain)) }));
    const tgt = brandStats[0], nB = brands.length;
    const sents = rows.map(r => r.sentiment).filter(x => x != null);
    const sentiment = sents.length ? sents.reduce((a, b) => a + b, 0) / sents.length : null;
    const posScore = tgt.avgPos ? Math.max(0, 1 - (tgt.avgPos - 1) / Math.max(1, nB)) : 0;
    const score = Math.round(100 * (0.5 * tgt.visibility + 0.3 * posScore * (tgt.visibility > 0 ? 1 : 0) + 0.2 * Math.min(1, tgt.sov * nB / 1.5)));
    const ownCited = rows.filter(r => r.own).length / N;
    return { brands: brandStats, rows, byEngine, sources, score, sentiment, ownCited, rank: [...brandStats].sort((a, b) => b.visibility - a.visibility || (a.avgPos || 99) - (b.avgPos || 99)).findIndex(b => b.target) + 1 };
  }

  /* ---------- modo demo: respuestas de ejemplo deterministas ---------- */
  function demoAnswers(setup, engines) {
    let seed = 0; for (const ch of setup.domain + setup.brand) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const es = setup.language !== 'en';
    const pool = ['g2.com', 'capterra.com', 'trustpilot.com', 'reddit.com', 'forbes.com', 'wikipedia.org', 'youtube.com', 'linkedin.com', es ? 'xataka.com' : 'techradar.com', es ? 'elconfidencial.com' : 'pcmag.com'];
    const all = [setup.brand].concat(setup.competitors);
    const out = [];
    for (const e of engines) for (const p of setup.prompts) {
      const bias = e === 'gemini' ? 0.6 : e === 'chatgpt' ? 0.5 : e === 'claude' ? 0.45 : 0.55;
      const list = setup.competitors.filter(() => rnd() < 0.75);
      if (norm(p).includes(norm(setup.brand)) || rnd() < bias) list.splice(Math.floor(rnd() * (list.length + 1)), 0, setup.brand);
      if (!list.length) list.push(all[1] || setup.brand);
      const adj = es ? ['destaca por su facilidad de uso', 'es una opción sólida y popular', 'es más completo, aunque algo caro', 'tiene buena relación calidad-precio', 'recibe algunas quejas por el soporte'] : ['stands out for ease of use', 'is a solid, popular option', 'is more complete, though a bit expensive', 'offers good value for money', 'gets some complaints about support'];
      const src = pool.filter(() => rnd() < 0.3).slice(0, 3); if (rnd() < 0.35) src.push(setup.domain);
      const text = (es ? '[Respuesta de ejemplo · modo demo]\n' : '[Sample answer · demo mode]\n') + list.map((b, k) => `${k + 1}. ${b}: ${adj[Math.floor(rnd() * adj.length)]}.`).join('\n') + `\n\n${es ? 'Fuentes' : 'Sources'}: ${src.join(', ') || 'g2.com'}`;
      out.push({ prompt: p, engine: e, text });
    }
    return out;
  }

  /* ---------- rutas ---------- */
  return async function handle(req, env, url, pathname, m) {
    if (!pathname.startsWith('/api/aibb/')) return null;
    if (env.DB) await ensure(env);
    const user = env.DB ? await currentUser(req, env) : null;
    const liveOk = !!(env.GEMINI_API_KEY || env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || env.PERPLEXITY_API_KEY);
    const body = m === 'POST' ? await req.json().catch(() => ({})) : {};

    // Comprobación pública y sin datos sensibles de que Gemini responde (máx. 12 por hora)
    if (pathname === '/api/aibb/health' && m === 'GET') {
      const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM aibb_usage WHERE ts > ? AND kind = 'health'").bind(Date.now() - 3600e3).first();
      if (n.n >= 12) return json({ error: 'try_later' }, 429);
      await logUse(env, null, 'gemini', 'health', 1);
      const t = env.GEMINI_API_KEY ? await callEngine(env, 'gemini', 'Responde solo: OK') : { error: 'no_key' };
      const last = await env.DB.prepare('SELECT ts, msg FROM aibb_log ORDER BY ts DESC LIMIT 5').all();
      return json({ ok: !!t.text, error: t.error || null, reply: t.text ? t.text.slice(0, 40) : null, recent: (last.results || []).map(r => ({ at: new Date(r.ts).toISOString(), msg: r.msg.replace(/AIza[\w-]+|AQ\.[\w-]+/g, '[key]') })) }, 200, { 'cache-control': 'no-store' });
    }
    if (pathname === '/api/aibb/diag' && m === 'GET') {
      if (!user || !env.LEAD_NOTIFY_EMAIL || user.email.toLowerCase() !== env.LEAD_NOTIFY_EMAIL.toLowerCase()) return json({ error: 'forbidden' }, 403);
      const t = await callEngine(env, 'gemini', 'Responde solo: OK');
      const r = await env.DB.prepare('SELECT ts, msg FROM aibb_log ORDER BY ts DESC LIMIT 20').all();
      return json({ test: t, log: r.results || [] });
    }
    if (pathname === '/api/aibb/config' && m === 'GET') return json({ teaser: TEASER_PROMPTS, engines: engineList(env), live: liveOk, user: user ? { email: user.email } : null, limits: { perDay: STUDIES_PER_USER_DAY, prompts: MAX_PROMPTS, competitors: MAX_COMPETITORS } });

    if (pathname === '/api/aibb/setup' && m === 'POST') {
      const raw = String(body.url || '').trim(), lang = body.lang === 'en' ? 'en' : 'es';
      const domain = domainOf(raw);
      if (!domain || !domain.includes('.') || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(domain)) return json({ error: 'invalid_url' }, 400);
      const site = await readSite('https://' + domain + '/');
      if (!env.GEMINI_API_KEY) return json({ mode: 'demo', reason: !user ? 'login' : 'nokey', setup: demoSetup(domain, site, lang), engines: engineList(env), site });
      // La preparación (marca, competidores reales y preguntas) también funciona sin sesión, con su propio tope por IP;
      // lanzar las preguntas a las IA sí exige iniciar sesión.
      const who = user || { id: 'ip:' + (await h.sha256((req.headers.get('cf-connecting-ip') || '') + ':aibb')).slice(0, 24) };
      const q = await quota(env, who, 'setup'); if (q) return json({ error: q }, 429);
      const s = await liveSetup(env, who, domain, site, lang);
      // Si la IA no responde, nunca mostramos datos simulados para una web real: preparación manual para completar y lanzar
      if (s.error) return json({ mode: user ? 'live' : 'login', reason: 'auto_failed', detail: s.error, setup: manualSetup(domain, site, lang), engines: engineList(env), site });
      return json({ mode: user ? 'live' : 'login', setup: s, engines: engineList(env), site });
    }

    // Desbloqueo con email: el informe completo se muestra al momento y se envía un enlace para guardarlo en el histórico
    if (pathname === '/api/aibb/unlock' && m === 'POST') {
      const email = String(body.email || '').trim().toLowerCase(), lang = body.lang === 'en' ? 'en' : 'es';
      if (!h.validEmail(email)) return json({ error: 'invalid_email' }, 400);
      if (body.accepted !== true) return json({ error: 'terms_required' }, 400);
      const ip = req.headers.get('cf-connecting-ip') || '', hourAgo = Date.now() - 3600e3;
      const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM aibb_unlocks WHERE (ip = ? OR email = ?) AND created_at > ?').bind(ip, email, hourAgo).first();
      if (n.n >= 6) return json({ error: 'too_many_requests' }, 429);
      const token = randomToken(16);
      await env.DB.prepare('INSERT INTO aibb_unlocks (token, email, created_at, ip) VALUES (?,?,?,?)').bind(token, email, Date.now(), ip).run();
      const base = (env.APP_URL || url.origin).replace(/\/$/, '');
      if (env.RESEND_API_KEY) await h.issueLoginLink(env, base, email, lang, ip, true);
      return json({ unlock: token, email });
    }
    if (pathname === '/api/aibb/ask' && m === 'POST') {
      let who = user;
      if (!who && /^[a-f0-9]{32}$/.test(String(body.unlock || ''))) {
        const u = await env.DB.prepare('SELECT email FROM aibb_unlocks WHERE token = ? AND created_at > ?').bind(body.unlock, Date.now() - 864e5).first();
        if (u) who = { id: 'pending:' + u.email };
      }
      if (!who) {
        who = { id: 'ip:' + (await h.sha256((req.headers.get('cf-connecting-ip') || '') + ':aibb')).slice(0, 24) };
        const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM aibb_usage WHERE ts > ? AND user_id = ? AND kind = 'ask'").bind(Date.now() - 864e5, who.id).first();
        if (n.n >= TEASER_ASKS_PER_IP_DAY) return json({ error: 'teaser_limit' }, 429);
      }
      const s = cleanSetup(body.setup), engine = String(body.engine || ''), prompt = clip(String(body.prompt || '').trim(), 240);
      if (!prompt) return json({ error: 'bad_request' }, 400);
      const e = ENGINES.find(x => x.id === engine); if (!e || !engineActive(env, e)) return json({ error: 'engine_off' }, 400);
      const q = await quota(env, who, 'ask'); if (q) return json({ error: q }, 429);
      const r = await callEngine(env, engine, prompt, { system: askSystem(s.language) });
      await logUse(env, who, engine, 'ask', !r.error);
      if (r.error) return json({ error: r.error }, 502);
      return json({ text: clip(r.text, 6000) });
    }

    if (pathname === '/api/aibb/finish' && m === 'POST') {
      const s = cleanSetup(body.setup);
      if (!s.domain || !s.prompts.length) return json({ error: 'bad_request' }, 400);
      const demo = body.demo === true || !liveOk;
      let unlocked = null;
      if (!user && !demo && /^[a-f0-9]{32}$/.test(String(body.unlock || ''))) {
        unlocked = await env.DB.prepare('SELECT email, uses FROM aibb_unlocks WHERE token = ? AND created_at > ?').bind(body.unlock, Date.now() - 864e5).first();
        if (unlocked && unlocked.uses >= 3) unlocked = null;
      }
      const owner = user || (unlocked ? { id: 'pending:' + unlocked.email, email: unlocked.email, pending: true } : null);
      const partial = !demo && !owner;
      let answers, judge = null;
      if (demo) { s.competitors = ['Alfaplus', 'Betaware', 'Gammix', 'Deltio']; s.prompts = s.prompts.map(p => p); answers = demoAnswers(s, ['gemini', 'chatgpt', 'claude', 'perplexity']); }
      else {
        answers = (Array.isArray(body.answers) ? body.answers : []).slice(0, partial ? TEASER_PROMPTS : MAX_PROMPTS * ENGINES.length).map(a => ({ prompt: clip(a.prompt, 240), engine: String(a.engine || ''), text: clip(a.text, 6000) })).filter(a => a.text);
        if (!answers.length) return json({ error: 'no_answers' }, 400);
        // Un juez (Gemini) valora el tono hacia la marca en cada respuesta: -1 negativo · 0 neutro · 1 positivo · null si no aparece
        if (!partial && env.GEMINI_API_KEY && !(await quota(env, owner, 'judge'))) {
          const jp = `Marca: ${s.brand} (${s.domain}). Para cada respuesta numerada, valora el tono hacia la marca: 1 positivo, 0 neutro, -1 negativo, null si no se menciona. Devuelve SOLO un JSON {"scores":[...]} con ${answers.length} valores en orden.\n\n` + answers.map((a, i) => `#${i + 1}\n${clip(a.text, 1500)}`).join('\n\n');
          const r = await callEngine(env, 'gemini', jp, { json: true, temperature: 0 });
          await logUse(env, owner, 'gemini', 'judge', !r.error);
          const j = r.error ? null : parseJson(r.text);
          if (j && Array.isArray(j.scores) && j.scores.length === answers.length) judge = j.scores.map(x => x == null ? null : Math.max(-1, Math.min(1, +x || 0)));
        }
      }
      const result = analyze(s, answers, judge);
      const study = { v: 1, demo, partial, created_at: Date.now(), setup: s, answers: answers.map(a => ({ prompt: a.prompt, engine: a.engine, text: clip(a.text, 4000) })), result, engines: engineList(env) };
      if (!demo && owner) {
        const user = owner;
        if (unlocked) await env.DB.prepare('UPDATE aibb_unlocks SET uses = uses + 1 WHERE token = ?').bind(body.unlock).run();
        study.id = randomToken(8);
        await env.DB.prepare('INSERT INTO aibb_studies (id, user_id, created_at, domain, brand, lang, score, visibility, data) VALUES (?,?,?,?,?,?,?,?,?)')
          .bind(study.id, user.id, study.created_at, s.domain, s.brand, s.language, result.score, result.brands[0].visibility, JSON.stringify(study)).run();
        const tb = result.brands[0];
        if (h.notifyOwner) await h.notifyOwner(env, `🔎 Estudio AI Barometer: ${s.brand} (${s.domain}) · score ${result.score}`, [['Email', user.email + (user.pending ? ' (sin confirmar aún)' : '')], ['Marca', s.brand], ['Web', s.domain], ['Categoría', s.category], ['Competidores', s.competitors.join(', ')], ['AI Visibility Score', String(result.score)], ['Visibilidad', Math.round(tb.visibility * 100) + '%'], ['Puesto', result.rank + ' de ' + result.brands.length], ['Asistentes', [...new Set(answers.map(a => a.engine))].join(', ')]], user.email);
      }
      return json({ study });
    }

    if (pathname === '/api/aibb/studies' && m === 'GET') {
      if (!user) return json({ error: 'unauthorized' }, 401);
      const r = await env.DB.prepare('SELECT id, created_at, domain, brand, score, visibility FROM aibb_studies WHERE user_id = ? ORDER BY created_at DESC LIMIT 200').bind(user.id).all();
      return json({ studies: r.results || [] });
    }
    // Enlace público de solo lectura para compartir un estudio (30 días, revocable)
    const shm = pathname.match(/^\/api\/aibb\/studies\/([a-f0-9]{16})\/share$/);
    if (shm) {
      if (!user) return json({ error: 'unauthorized' }, 401);
      const own = await env.DB.prepare('SELECT id FROM aibb_studies WHERE id = ? AND user_id = ?').bind(shm[1], user.id).first();
      if (!own) return json({ error: 'not_found' }, 404);
      const now = Date.now();
      if (m === 'GET') { const sh = await env.DB.prepare('SELECT token, expires_at FROM aibb_shares WHERE study_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC').bind(shm[1], now).first(); return json({ share: sh || null }); }
      if (m === 'POST') {
        let sh = await env.DB.prepare('SELECT token, expires_at FROM aibb_shares WHERE study_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC').bind(shm[1], now).first();
        if (!sh) { sh = { token: randomToken(18), expires_at: now + 30 * 864e5 }; await env.DB.prepare('INSERT INTO aibb_shares (token, study_id, user_id, created_at, expires_at) VALUES (?,?,?,?,?)').bind(sh.token, shm[1], user.id, now, sh.expires_at).run(); }
        return json({ share: sh });
      }
      if (m === 'DELETE') { await env.DB.prepare('UPDATE aibb_shares SET revoked_at = ? WHERE study_id = ? AND user_id = ? AND revoked_at IS NULL').bind(now, shm[1], user.id).run(); return json({ ok: true }); }
    }
    const pub = pathname.match(/^\/api\/aibb\/share\/([a-f0-9]{36})$/);
    if (pub && m === 'GET') {
      const r = await env.DB.prepare('SELECT st.data AS data, sh.expires_at AS exp FROM aibb_shares sh JOIN aibb_studies st ON st.id = sh.study_id WHERE sh.token = ? AND sh.revoked_at IS NULL AND sh.expires_at > ?').bind(pub[1], Date.now()).first();
      if (!r) return json({ error: 'not_found' }, 404);
      const st = JSON.parse(r.data); delete st.id;
      return json({ study: st, expires_at: r.exp }, 200, { 'x-robots-tag': 'noindex' });
    }
    const sm = pathname.match(/^\/api\/aibb\/studies\/([a-f0-9]{16})$/);
    if (sm) {
      if (!user) return json({ error: 'unauthorized' }, 401);
      if (m === 'GET') { const r = await env.DB.prepare('SELECT data FROM aibb_studies WHERE id = ? AND user_id = ?').bind(sm[1], user.id).first(); return r ? json({ study: JSON.parse(r.data) }) : json({ error: 'not_found' }, 404); }
      if (m === 'DELETE') { await env.DB.batch([env.DB.prepare('DELETE FROM aibb_shares WHERE study_id = ? AND user_id = ?').bind(sm[1], user.id), env.DB.prepare('DELETE FROM aibb_studies WHERE id = ? AND user_id = ?').bind(sm[1], user.id)]); return json({ ok: true }); }
    }
    return json({ error: 'not_found' }, 404);
  };
}
