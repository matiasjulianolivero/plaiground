"""Genera los emails de la newsletter (public/newsletter/<id>/email-<lang>.html) y el índice issues.json.
Uso: python3 tools/newsletter/build.py
Marcadores que rellena el Worker al enviar: {{NAME}} {{UNSUB}} {{WEB}} {{VOTE_a}}…{{VOTE_d}}"""
import json, os, importlib.util, html
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = 'https://plaigroundmarketing.com'
ISSUES = ['issue01']
FONT = "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif"
DISP = "'Bricolage Grotesque','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"
MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace"

def load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ROOT, 'tools', 'newsletter', name + '.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

def label(emoji, txt, color):
    return f'<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:{color};border-radius:999px;padding:6px 14px;font:800 12px/1 {FONT};letter-spacing:.14em;text-transform:uppercase;color:#14162E">{emoji}&nbsp; {txt}</td></tr></table>'

def email(I, L):
    T = lambda es, en: es if L == 'es' else en
    E = html.escape
    radar = ''
    for r in I.RADAR:
        t, body, take, src, url = r[L]
        radar += f'''<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A1D3F;border-radius:20px;border:1px solid #2A2E5A"><tr>
<td width="112" valign="top" class="stk" style="padding:22px 0 0 22px"><div class="big" style="font:800 40px/1 {DISP};letter-spacing:-.04em;color:{r['color']}">{r['big']}</div></td>
<td valign="top" class="stk" style="padding:20px 22px 20px 14px"><div style="font:800 19px/1.25 {DISP};color:#FFFFFF;letter-spacing:-.01em">{E(t)}</div>
<div style="font:400 15px/1.6 {FONT};color:#C9CCEA;margin-top:8px">{E(body)}</div>
<div style="font:600 14.5px/1.55 {FONT};color:#FFFFFF;margin-top:10px;padding-left:12px;border-left:3px solid {r['color']}">{E(take)}</div>
<div style="font:400 12.5px/1.4 {FONT};color:#7F84B0;margin-top:10px">{T('Fuente','Source')}: <a href="{url}" style="color:#9EA3D6">{src}</a></div></td></tr></table></td></tr>'''
    wt, wb, wsrc, wurl = I.WILDCARD[L]
    X = I.EXP[L]; P = I.PU[L]; Q = I.POLL[L]
    steps = ''.join(f'<tr><td width="34" valign="top" style="padding:0 0 10px"><div style="width:26px;height:26px;border-radius:8px;background:#5F58EC;color:#fff;font:800 13px/26px {FONT};text-align:center">{i+1}</div></td><td valign="top" style="padding:3px 0 10px;font:400 15px/1.55 {FONT};color:#D8DBF5">{E(s)}</td></tr>' for i, s in enumerate(P['steps']))
    opts = ''.join(f'<tr><td style="padding:0 0 10px"><a href="{{{{VOTE_{k}}}}}" style="display:block;background:#1A1D3F;border:1.5px solid #3A3F78;border-radius:16px;padding:15px 18px;font:700 16px/1.2 {FONT};color:#FFFFFF;text-decoration:none">{"ABCD"[i]} &nbsp;·&nbsp; {E(o)} <span style="float:right;color:#8B8CF8">→</span></a></td></tr>' for i, (k, o) in enumerate(Q['opts']))
    return f'''<!DOCTYPE html>
<html lang="{L}" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>{E(I.SUBJECT[L])}</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
body{{margin:0;padding:0;background:#0B0D1F}} a{{color:#B8B9FF}}
.holo{{background:linear-gradient(90deg,#8B8CF8,#FF7A59,#5FE0CF,#B8B9FF,#8B8CF8);background-size:300% 100%;animation:holo 6s linear infinite}}
@keyframes holo{{to{{background-position:300% 0}}}}
@media (max-width:620px){{.wrap{{width:100%!important}} .px{{padding-left:18px!important;padding-right:18px!important}} .stk{{display:block!important;width:auto!important}} .big{{font-size:34px!important}} .h1{{font-size:28px!important}}}}
@media (prefers-reduced-motion:reduce){{.holo{{animation:none}}}}
</style></head>
<body style="margin:0;padding:0;background:#0B0D1F">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">{E(I.PREHEADER[L])}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0B0D1F" style="background:#0B0D1F"><tr><td align="center" style="padding:24px 10px 40px">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px">
<tr><td class="px" style="padding:0 6px 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font:800 24px/1 {DISP};letter-spacing:-.045em;color:#FFFFFF">pl<span style="color:#8B8CF8">ai</span>ground</td>
<td align="right" style="font:600 13px/1.3 {FONT};color:#A3A8CC">{T('Nivel','Level')} {I.ID} · {I.DATE[L]} &nbsp;·&nbsp; <a href="{{{{WEB}}}}" style="color:#B8B9FF">{T('Ver en la web','View on the web')}</a></td></tr></table></td></tr>
<tr><td class="holo" height="4" style="height:4px;line-height:4px;font-size:0;border-radius:4px;background-color:#8B8CF8">&nbsp;</td></tr>
<tr><td style="padding:14px 0 0"><a href="{{{{WEB}}}}"><img src="{BASE}/newsletter/{I.ID}/hero-{L}.gif" width="600" alt="{E(I.HERO_ALT[L])}" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:24px;background:#1A1D3F;color:#FFFFFF;font:800 26px {DISP}"></a></td></tr>
<tr><td class="px" style="padding:26px 8px 8px;font:400 17px/1.65 {FONT};color:#E4E6FB">{I.INTRO[L]}</td></tr>

<tr><td class="px" style="padding:30px 8px 14px">{label('📡', T('Radar · 4 señales del mes','Radar · 4 signals of the month'), '#B8B9FF')}</td></tr>
<tr><td class="px" style="padding:0 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">{radar}</table></td></tr>
<tr><td class="px" style="padding:0 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1.5px dashed #3A3F78;border-radius:20px"><tr><td style="padding:16px 20px;font:400 14.5px/1.6 {FONT};color:#C9CCEA"><b style="color:#FFB8A6">🃏 {E(wt)}.</b> {E(wb)} <span style="color:#7F84B0;font-size:12.5px">({T('Fuente','Source')}: <a href="{wurl}" style="color:#9EA3D6">{wsrc}</a>)</span></td></tr></table></td></tr>

<tr><td class="px" style="padding:38px 8px 14px">{label('🧪', T('Experimento del mes','Experiment of the month'), '#5FE0CF')}</td></tr>
<tr><td class="px h1" style="padding:0 8px 14px;font:800 30px/1.1 {DISP};letter-spacing:-.035em;color:#FFFFFF">{E(X['title'])}</td></tr>
<tr><td style="padding:0"><a href="{BASE}/barometer/"><img src="{BASE}/newsletter/{I.ID}/bars-{L}.gif" width="600" alt="{E(X['alt'])}" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:24px;background:#14162E;color:#FFFFFF;font:600 15px {FONT}"></a></td></tr>
<tr><td class="px" style="padding:18px 8px 0;font:400 16px/1.65 {FONT};color:#D8DBF5">{X['body']}</td></tr>
<tr><td class="px" style="padding:14px 8px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1F2A3F;border-radius:16px"><tr><td style="padding:16px 18px;font:600 15px/1.6 {FONT};color:#FFFFFF;border-left:4px solid #5FE0CF;border-radius:16px">{E(X['take'])}</td></tr></table></td></tr>
<tr><td class="px" style="padding:18px 8px 0"><a href="{BASE}/barometer/" style="display:inline-block;background:#5FE0CF;color:#0B0D1F;text-decoration:none;font:800 15px/1 {FONT};padding:15px 22px;border-radius:999px">{E(X['cta'])} →</a></td></tr>

<tr><td class="px" style="padding:40px 8px 14px">{label('⚡', 'Power-up', '#FFB8A6')}</td></tr>
<tr><td class="px h1" style="padding:0 8px 16px;font:800 30px/1.1 {DISP};letter-spacing:-.035em;color:#FFFFFF">{E(P['title'])}</td></tr>
<tr><td class="px" style="padding:0 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">{steps}</table></td></tr>
<tr><td class="px" style="padding:4px 8px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05060F;border:1px solid #2A2E5A;border-radius:16px"><tr><td style="padding:12px 16px 0;font:700 11px/1 {MONO};letter-spacing:.1em;color:#5FE0CF">● ● ●&nbsp;&nbsp; PROMPT</td></tr><tr><td style="padding:12px 16px 16px;font:400 14.5px/1.65 {MONO};color:#E4E6FB">{E(P['prompt'])}</td></tr></table></td></tr>
<tr><td class="px" style="padding:14px 8px 0;font:400 15px/1.6 {FONT};color:#C9CCEA">{P['tip']}</td></tr>

<tr><td class="px" style="padding:40px 8px 14px">{label('🕹️', T('Jefe final','Final boss'), '#E0A100')}</td></tr>
<tr><td class="px h1" style="padding:0 8px 16px;font:800 26px/1.15 {DISP};letter-spacing:-.03em;color:#FFFFFF">{E(Q['q'])}</td></tr>
<tr><td class="px" style="padding:0 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">{opts}</table></td></tr>
<tr><td class="px" style="padding:2px 8px 0;font:400 13.5px/1.5 {FONT};color:#A3A8CC">{E(Q['note'])}</td></tr>

<tr><td class="px" style="padding:40px 8px 0;font:400 16px/1.65 {FONT};color:#E4E6FB">{I.SIGN[L]}</td></tr>
<tr><td style="padding:34px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="holo" height="2" style="height:2px;line-height:2px;font-size:0;background-color:#3A3F78">&nbsp;</td></tr></table></td></tr>
<tr><td class="px" style="padding:20px 8px 0;font:400 12.5px/1.6 {FONT};color:#7F84B0">{T('Recibes este email porque te suscribiste a la newsletter de plaiground y confirmaste tu suscripción.','You’re receiving this because you subscribed to the plaiground newsletter and confirmed your subscription.')} <a href="{{{{UNSUB}}}}" style="color:#9EA3D6">{T('Darme de baja con un clic','Unsubscribe with one click')}</a> · <a href="{{{{WEB}}}}" style="color:#9EA3D6">{T('Ver en la web','View on the web')}</a> · <a href="{BASE}/legal/privacidad/" style="color:#9EA3D6">{T('Privacidad','Privacy')}</a><br>{T('Remitente','Sender')}: Matías Olivero · plaiground · Madrid ({T('España','Spain')}) · <a href="{BASE}/" style="color:#9EA3D6">plaigroundmarketing.com</a><br>{T('Las noticias resumen fuentes públicas enlazadas; las cifras son de sus autores. Contenido informativo, no es asesoramiento profesional.','News items summarise the linked public sources; figures belong to their authors. Informational content, not professional advice.')}</td></tr>
</table></td></tr></table></body></html>'''

def web(I):
    E = html.escape
    def both(es, en, tag='span'):
        return f'<{tag} lang="es">{es}</{tag}><{tag} lang="en">{en}</{tag}>'
    radar = ''
    for n, r in enumerate(I.RADAR):
        es, en = r['es'], r['en']
        radar += f'<article class="rc rv" style="--c:{r["color"]}"><div class="big" data-n="{E(r["big"])}">{E(r["big"])}</div><div><h3>{both(E(es[0]), E(en[0]))}</h3><p>{both(E(es[1]), E(en[1]))}</p><p class="take">{both(E(es[2]), E(en[2]))}</p><small>{both("Fuente", "Source")}: <a href="{es[4]}" target="_blank" rel="noopener">{es[3]}</a></small></div></article>'
    W = I.WILDCARD
    X = I.EXP; P = I.PU; Q = I.POLL
    steps = ''.join(f'<li>{both(E(a), E(b))}</li>' for a, b in zip(P['es']['steps'], P['en']['steps']))
    opts = ''.join(f'<button type="button" class="opt" data-o="{k}"><span class="l">{"ABCD"[i]}</span>{both(E(a), E(b))}<span class="pct"></span><i class="fill"></i></button>' for i, ((k, a), (_, b)) in enumerate(zip(Q['es']['opts'], Q['en']['opts'])))
    data = json.dumps([('Minecraft',780,8.5),('Pokémon',432,130.7),('One Piece',213,5.6),('Harry Potter',137,35.1),('Star Wars',100,46.7),('Super Mario',90,17.2),('Avatar',86,7.3),('Marvel',53,44.1)], ensure_ascii=False)
    return f"""<!DOCTYPE html>
<html lang="es" data-lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script>(function(){{var q=new URLSearchParams(location.search).get('l'),l=q==='en'||q==='es'?q:null;if(!l){{try{{l=localStorage.getItem('plg-lang')}}catch(e){{}}}}if(l!=='es'&&l!=='en')l=(navigator.language||'es').indexOf('es')===0?'es':'en';document.documentElement.setAttribute('data-lang',l);document.documentElement.lang=l;}})();</script>
<title>{E(I.SUBJECT['es'])} · plaiground</title>
<meta name="description" content="{E(I.PREHEADER['es'])}">
<meta property="og:title" content="{E(I.SUBJECT['es'])}"><meta property="og:description" content="{E(I.PREHEADER['es'])}"><meta property="og:image" content="{BASE}/newsletter/{I.ID}/hero-es.gif"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{{--bg:#0B0D1F;--card:#15183A;--line:rgba(236,238,255,.12);--ink:#ECEEFF;--muted:#A3A8CC;--ind:#8B8CF8;--coral:#FF7A59;--teal:#5FE0CF;--d:"Bricolage Grotesque",system-ui,sans-serif;--b:"DM Sans",system-ui,sans-serif}}
*{{box-sizing:border-box}}html{{scroll-behavior:smooth}}body{{margin:0;background:var(--bg);color:var(--ink);font:17px/1.65 var(--b);-webkit-font-smoothing:antialiased;overflow-x:hidden}}
html[data-lang="en"] [lang="es"],html[data-lang="es"] [lang="en"]{{display:none!important}}
a{{color:#B8B9FF}}
.bgfx{{position:fixed;inset:0;z-index:-1;background:radial-gradient(40% 40% at 10% 0%,rgba(95,88,236,.35),transparent 70%),radial-gradient(35% 35% at 100% 20%,rgba(255,122,89,.22),transparent 70%),radial-gradient(40% 40% at 50% 110%,rgba(25,181,165,.22),transparent 70%)}}
.bgfx::after{{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(236,238,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(236,238,255,.035) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(70% 60% at 50% 30%,#000,transparent)}}
header{{position:sticky;top:0;z-index:10;padding:12px 12px 0}}
.bar{{max-width:900px;margin:0 auto;display:flex;align-items:center;gap:12px;height:58px;padding:0 8px 0 22px;border-radius:999px;background:linear-gradient(160deg,rgba(60,64,130,.32),rgba(21,24,58,.2));backdrop-filter:blur(18px) saturate(180%);-webkit-backdrop-filter:blur(18px) saturate(180%);border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}}
.brand{{font:800 22px var(--d);letter-spacing:-.045em;color:#fff;text-decoration:none}}.brand b{{color:var(--ind)}}
.lvl{{font:700 12px var(--b);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-left:auto}}
.lg{{display:flex;padding:3px;border-radius:999px;background:rgba(255,255,255,.07)}}.lg button{{border:0;background:none;color:var(--muted);font:700 12px var(--b);padding:7px 11px;border-radius:999px;cursor:pointer}}
html[data-lang="es"] .lg [data-l="es"],html[data-lang="en"] .lg [data-l="en"]{{background:#ECEEFF;color:#14162E}}
.prog{{position:fixed;top:0;left:0;height:3px;width:0;z-index:20;background:linear-gradient(90deg,#8B8CF8,#FF7A59,#5FE0CF)}}
main{{max-width:900px;margin:0 auto;padding:26px 20px 80px}}
.hero img{{width:100%;height:auto;display:block;border-radius:28px;box-shadow:0 30px 80px rgba(0,0,0,.45)}}
.intro{{font-size:20px;line-height:1.6;color:#E4E6FB;max-width:720px;margin:34px 0 0}}
.sec{{margin-top:76px}}
.lab{{display:inline-flex;gap:8px;align-items:center;border-radius:999px;padding:7px 15px;font:800 12px var(--b);letter-spacing:.14em;text-transform:uppercase;color:#14162E;background:var(--c)}}
h2{{font:800 clamp(30px,5vw,48px)/1.04 var(--d);letter-spacing:-.04em;margin:16px 0 18px}}
.rc{{display:grid;grid-template-columns:140px 1fr;gap:18px;padding:26px;border-radius:24px;background:var(--card);border:1px solid var(--line);margin-bottom:14px;position:relative;overflow:hidden;transition:transform .25s,border-color .25s}}
.rc:hover{{transform:translateY(-3px);border-color:color-mix(in srgb,var(--c) 60%,transparent)}}
.rc::before{{content:"";position:absolute;inset:-1px;background:radial-gradient(60% 80% at 0% 0%,color-mix(in srgb,var(--c) 18%,transparent),transparent 70%);pointer-events:none}}
.rc .big{{font:800 54px/1 var(--d);letter-spacing:-.05em;color:var(--c)}}
.rc h3{{font:800 22px/1.2 var(--d);margin:0 0 8px;letter-spacing:-.02em}}.rc p{{margin:0 0 10px;color:#C9CCEA}}
.rc .take{{color:#fff;font-weight:500;border-left:3px solid var(--c);padding-left:12px}}.rc small{{color:#7F84B0}}
@media (max-width:640px){{.rc{{grid-template-columns:1fr;gap:6px}}.rc .big{{font-size:44px}}}}
.wild{{border:1.5px dashed rgba(236,238,255,.25);border-radius:20px;padding:18px 20px;color:#C9CCEA;font-size:15.5px}}.wild b{{color:#FFB8A6}}
.chart{{background:var(--card);border:1px solid var(--line);border-radius:24px;padding:22px 22px 14px}}
.chart .row{{display:grid;grid-template-columns:120px 1fr;align-items:center;gap:14px;padding:7px 0;cursor:default}}
.chart .nm{{font-weight:700;font-size:15px}}.chart .tr{{position:relative;height:34px}}
.chart .b{{height:100%;width:0;border-radius:9px;background:#7C6CF8;transition:width 1.2s cubic-bezier(.2,.8,.2,1)}}
.chart .row[data-hl="1"] .b{{background:var(--coral)}}.chart .row[data-hl="2"] .b{{background:var(--teal)}}
.chart .v{{position:absolute;top:50%;transform:translateY(-50%);font:800 17px var(--d);white-space:nowrap;padding-left:10px;transition:left 1.2s cubic-bezier(.2,.8,.2,1)}}.chart .v small{{font:500 13px var(--b);color:var(--muted);margin-left:8px}}
.chart .row:hover .b{{filter:brightness(1.2)}}
.chart .cap{{font-size:13px;color:var(--muted);margin-top:10px}}
.tog{{display:inline-flex;gap:4px;padding:4px;border-radius:999px;background:rgba(255,255,255,.07);margin-bottom:12px}}.tog button{{border:0;background:none;color:var(--muted);font:700 13px var(--b);padding:8px 14px;border-radius:999px;cursor:pointer}}.tog button[aria-pressed="true"]{{background:#ECEEFF;color:#14162E}}
.callout{{margin-top:16px;padding:18px 20px;border-radius:18px;background:rgba(95,224,207,.08);border-left:4px solid var(--teal);font-weight:500}}
.btn{{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:14px 22px;font:800 15px var(--b);text-decoration:none;color:#0B0D1F;background:var(--teal);margin-top:18px}}
ol.st{{counter-reset:s;list-style:none;padding:0;margin:0}}ol.st li{{counter-increment:s;position:relative;padding:0 0 12px 44px;color:#D8DBF5}}ol.st li::before{{content:counter(s);position:absolute;left:0;top:0;width:30px;height:30px;border-radius:9px;background:#5F58EC;color:#fff;display:grid;place-items:center;font:800 14px var(--b)}}
.term{{background:#05060F;border:1px solid var(--line);border-radius:18px;overflow:hidden;margin:6px 0 14px}}
.term .tb{{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);font:700 11px ui-monospace,Menlo,monospace;letter-spacing:.1em;color:var(--teal)}}
.term .tb i{{width:10px;height:10px;border-radius:50%;background:#FF7A59}}.term .tb i:nth-child(2){{background:#E0A100}}.term .tb i:nth-child(3){{background:#19B5A5}}
.term .tb button{{margin-left:auto;border:1px solid var(--line);background:rgba(255,255,255,.06);color:#fff;font:700 12px var(--b);padding:6px 12px;border-radius:999px;cursor:pointer;letter-spacing:0}}
.term pre{{margin:0;padding:16px 18px;white-space:pre-wrap;font:15px/1.65 ui-monospace,Menlo,monospace;color:#E4E6FB;min-height:7.5em}}
.caret{{display:inline-block;width:9px;height:1.1em;background:var(--teal);vertical-align:-3px;animation:bl 1s steps(1) infinite}}@keyframes bl{{50%{{opacity:0}}}}
.poll .opt{{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;width:100%;text-align:left;border:1.5px solid rgba(236,238,255,.16);background:var(--card);color:#fff;font:700 17px var(--b);padding:17px 18px;border-radius:18px;margin-bottom:10px;cursor:pointer;transition:border-color .2s,transform .15s}}
.poll .opt:hover{{transform:translateX(4px);border-color:#E0A100}}
.poll .opt .l{{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:rgba(224,161,0,.18);color:#FFD36B;font:800 14px var(--b);flex:none;position:relative;z-index:1}}
.poll .opt>span[lang]{{position:relative;z-index:1}}
.poll .opt .pct{{margin-left:auto;font:800 17px var(--d);position:relative;z-index:1}}
.poll .opt .fill{{position:absolute;inset:0;width:0;background:linear-gradient(90deg,rgba(224,161,0,.28),rgba(224,161,0,.08));transition:width 1s cubic-bezier(.2,.8,.2,1)}}
.poll .opt.mine{{border-color:#E0A100}}.poll.done .opt{{cursor:default}}.poll.done .opt:hover{{transform:none}}
.pnote{{color:var(--muted);font-size:14px}}
.sign{{margin-top:76px;font-size:19px;color:#E4E6FB}}
footer{{max-width:900px;margin:0 auto;padding:30px 20px 60px;color:#7F84B0;font-size:13px;border-top:1px solid var(--line)}}
.sub{{margin-top:40px;padding:28px;border-radius:24px;background:linear-gradient(120deg,rgba(95,88,236,.3),rgba(255,122,89,.18));border:1px solid rgba(255,255,255,.14)}}.sub h3{{font:800 26px/1.1 var(--d);margin:0 0 6px;letter-spacing:-.03em}}.sub p{{margin:0;color:#D8DBF5}}
.rv{{opacity:0;transform:translateY(18px);transition:opacity .7s,transform .7s}}.rv.in{{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){{.rv{{opacity:1;transform:none;transition:none}}.chart .b,.chart .v,.poll .opt .fill{{transition:none}}html{{scroll-behavior:auto}}}}
</style></head><body>
<div class="bgfx" aria-hidden="true"></div><div class="prog" id="prog" aria-hidden="true"></div>
<header><div class="bar"><a class="brand" href="/">pl<b>ai</b>ground</a><span class="lvl">{both("Nivel", "Level")} {I.ID} · {both(I.DATE['es'], I.DATE['en'])}</span><div class="lg" role="group" aria-label="Idioma / Language"><button type="button" data-l="es">ES</button><button type="button" data-l="en">EN</button></div></div></header>
<main>
<section class="hero"><img lang="es" src="/newsletter/{I.ID}/hero-es.gif" width="1200" height="620" alt="{E(I.HERO_ALT['es'])}"><img lang="en" src="/newsletter/{I.ID}/hero-en.gif" width="1200" height="620" alt="{E(I.HERO_ALT['en'])}"></section>
<p class="intro">{both(I.INTRO['es'].replace(' {{NAME}}', ''), I.INTRO['en'].replace(' {{NAME}}', ''))}</p>
<section class="sec" id="radar"><span class="lab" style="--c:#B8B9FF">📡 {both("Radar · 4 señales del mes", "Radar · 4 signals of the month")}</span><h2>{both("Lo que ha pasado (y lo que significa)", "What happened (and what it means)")}</h2>{radar}
<p class="wild rv"><b>🃏 {both(E(W['es'][0]), E(W['en'][0]))}.</b> {both(E(W['es'][1]), E(W['en'][1]))} <small>({both("Fuente", "Source")}: <a href="{W['es'][3]}" target="_blank" rel="noopener">{W['es'][2]}</a>)</small></p></section>
<section class="sec" id="experimento"><span class="lab" style="--c:#5FE0CF">🧪 {both("Experimento del mes", "Experiment of the month")}</span><h2>{both(E(X['es']['title']), E(X['en']['title']))}</h2>
<div class="chart rv" id="chart"><div class="tog" role="group" aria-label="Métrica"><button type="button" data-m="s" aria-pressed="true">{both("Interés en Google", "Google interest")}</button><button type="button" data-m="r" aria-pressed="false">{both("Ingresos", "Revenue")}</button></div><div id="rows"></div><div class="cap">{both("Fuente: Franchise Brand Barometer (plaiground). Interés: Google Trends, mundial, 12 meses, Star Wars = 100. Ingresos: total de la franquicia en miles de millones de dólares.", "Source: Franchise Brand Barometer (plaiground). Interest: Google Trends, worldwide, 12 months, Star Wars = 100. Revenue: franchise total in billions of US dollars.")}</div></div>
<p>{both(X['es']['body'], X['en']['body'])}</p><div class="callout">{both(E(X['es']['take']), E(X['en']['take']))}</div><a class="btn" href="/barometer/">{both(E(X['es']['cta']), E(X['en']['cta']))} →</a></section>
<section class="sec" id="powerup"><span class="lab" style="--c:#FFB8A6">⚡ Power-up</span><h2>{both(E(P['es']['title']), E(P['en']['title']))}</h2><ol class="st">{steps}</ol>
<div class="term rv"><div class="tb"><i></i><i></i><i></i>&nbsp; PROMPT<button type="button" id="cp">{both("Copiar", "Copy")}</button></div><pre id="pr" data-es="{E(P['es']['prompt'])}" data-en="{E(P['en']['prompt'])}"></pre></div>
<p>{both(P['es']['tip'], P['en']['tip'])}</p></section>
<section class="sec" id="jefe"><span class="lab" style="--c:#E0A100">🕹️ {both("Jefe final", "Final boss")}</span><h2>{both(E(Q['es']['q']), E(Q['en']['q']))}</h2>
<div class="poll" id="poll">{opts}</div><p class="pnote" id="pnote">{both("Un clic y votas. Resultados en vivo.", "One click and you’ve voted. Live results.")}</p></section>
<p class="sign">{both(I.SIGN['es'].replace('Responde a este email', 'Escríbeme a <a href="mailto:matiasjulianolivero@gmail.com">matiasjulianolivero@gmail.com</a>'), I.SIGN['en'].replace('Just reply to this email', 'Write to me at <a href="mailto:matiasjulianolivero@gmail.com">matiasjulianolivero@gmail.com</a>'))}</p>
<div class="sub rv"><h3>{both("¿Te lo han reenviado?", "Did someone forward this?")}</h3><p>{both("Suscríbete gratis desde el formulario de la home (marca la casilla de la newsletter) y recibe el Nivel 02.", "Subscribe for free from the form on the homepage (tick the newsletter box) and get Level 02.")} <a href="/#contacto">{both("Ir al formulario →", "Go to the form →")}</a></p></div>
</main>
<footer>{both("Las noticias resumen fuentes públicas enlazadas; las cifras son de sus autores. Contenido informativo, no es asesoramiento profesional.", "News items summarise the linked public sources; figures belong to their authors. Informational content, not professional advice.")} · <a href="/legal/privacidad/">{both("Privacidad", "Privacy")}</a> · <a href="/">plaigroundmarketing.com</a></footer>
<script>
(function(){{
var H=document.documentElement,L=function(){{return H.getAttribute('data-lang')}},RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('.lg button').forEach(function(b){{b.onclick=function(){{H.setAttribute('data-lang',b.dataset.l);H.lang=b.dataset.l;try{{localStorage.setItem('plg-lang',b.dataset.l)}}catch(e){{}}typeIt(true);drawChart();}}}});
var pg=document.getElementById('prog');addEventListener('scroll',function(){{var m=document.body.scrollHeight-innerHeight;pg.style.width=(m>0?scrollY/m*100:0)+'%'}},{{passive:true}});
var io='IntersectionObserver' in window?new IntersectionObserver(function(es){{es.forEach(function(e){{if(e.isIntersecting){{e.target.classList.add('in');if(e.target.id==='chart')drawChart(true);if(e.target.classList.contains('term'))typeIt();if(e.target.querySelector&&e.target.querySelector('.big'))count(e.target.querySelector('.big'));io.unobserve(e.target);}}}})}},{{threshold:.25}}):null;
document.querySelectorAll('.rv').forEach(function(el){{io?io.observe(el):el.classList.add('in')}});
function count(el){{var t=el.dataset.n,m=t.match(/^(\\d+)(.*)$/);if(!m||RM)return;var to=+m[1],s=performance.now();(function f(n){{var k=Math.min(1,(n-s)/1100),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e)+m[2];if(k<1)requestAnimationFrame(f)}})(s)}}
var D={data},M='s',shown=false;
function fmtR(v){{return L()==='en'?'$'+v.toFixed(1)+' bn':v.toFixed(1).replace('.',',')+' mil M$'}}
function drawChart(first){{if(first)shown=true;var rows=document.getElementById('rows');if(!rows.children.length)rows.innerHTML=D.map(function(d){{return '<div class="row" data-hl="'+(d[0]==='Minecraft'?1:d[0]==='Marvel'?2:0)+'"><div class="nm">'+d[0]+'</div><div class="tr"><div class="b"></div><div class="v"></div></div></div>'}}).join('');
var mx=Math.max.apply(null,D.map(function(d){{return M==='s'?d[1]:d[2]}}));
[].forEach.call(rows.children,function(r,i){{var d=D[i],v=M==='s'?d[1]:d[2],w=shown?v/mx*78:0;r.querySelector('.b').style.width=w+'%';r.querySelector('.v').style.left=w+'%';r.querySelector('.v').innerHTML=(M==='s'?v:fmtR(v))+'<small>'+(M==='s'?fmtR(d[2]):(L()==='en'?'interest ':'interés ')+d[1])+'</small>';}})}}
document.querySelectorAll('.tog button').forEach(function(b){{b.onclick=function(){{M=b.dataset.m;document.querySelectorAll('.tog button').forEach(function(x){{x.setAttribute('aria-pressed',x===b)}});drawChart(true)}}}});
drawChart(!io);
var typing=0;function typeIt(reset){{var pr=document.getElementById('pr'),t=pr.dataset[L()];var id=++typing;if(RM){{pr.textContent=t;return}}var i=reset?t.length:0;(function step(){{if(id!==typing)return;pr.innerHTML='';pr.appendChild(document.createTextNode(t.slice(0,i)));var c=document.createElement('span');c.className='caret';pr.appendChild(c);if(i<t.length){{i+=2;setTimeout(step,18)}}}})()}}
if(!io)typeIt(true);
document.getElementById('cp').onclick=function(){{var t=document.getElementById('pr').dataset[L()],b=this;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){{b.textContent=L()==='en'?'Copied ✓':'Copiado ✓';setTimeout(function(){{b.textContent=L()==='en'?'Copy':'Copiar'}},1800)}}).catch(function(){{}})}};
var poll=document.getElementById('poll'),ISSUE='{I.ID}',KEY='plg-vote-'+ISSUE,q=new URLSearchParams(location.search),mine=q.get('voted');try{{mine=mine||localStorage.getItem(KEY)}}catch(e){{}}
function show(r){{if(!r||!r.counts)return;poll.classList.add('done');[].forEach.call(poll.querySelectorAll('.opt'),function(o){{var n=r.counts[o.dataset.o]||0,p=r.total?Math.round(n/r.total*100):0;o.querySelector('.pct').textContent=p+'%';o.querySelector('.fill').style.width=p+'%';o.classList.toggle('mine',o.dataset.o===mine)}});document.getElementById('pnote').textContent=(L()==='en'?'Votes so far: ':'Votos hasta ahora: ')+r.total}}
function load(){{fetch('/api/newsletter/poll?i='+ISSUE).then(function(r){{return r.json()}}).then(show).catch(function(){{}})}}
if(mine){{try{{localStorage.setItem(KEY,mine)}}catch(e){{}}load()}}
poll.querySelectorAll('.opt').forEach(function(o){{o.onclick=function(){{if(poll.classList.contains('done'))return;mine=o.dataset.o;try{{localStorage.setItem(KEY,mine)}}catch(e){{}}var v='';for(var i=0;i<32;i++)v+=(Math.random()*16|0).toString(16);fetch('/api/newsletter/vote',{{method:'POST',headers:{{'content-type':'application/json'}},body:JSON.stringify({{i:ISSUE,o:mine,v:v}})}}).then(function(r){{return r.json()}}).then(show).catch(load)}}}});
}})();
</script></body></html>"""

def main():
    idx = []
    for name in ISSUES:
        I = load(name)
        d = os.path.join(ROOT, 'public', 'newsletter', I.ID); os.makedirs(d, exist_ok=True)
        for L in ('es', 'en'):
            open(os.path.join(d, f'email-{L}.html'), 'w').write(email(I, L))
        open(os.path.join(d, 'index.html'), 'w').write(web(I))
        idx.append({'id': I.ID, 'subject': I.SUBJECT, 'date': I.DATE, 'poll': {L: {'q': I.POLL[L]['q'], 'opts': I.POLL[L]['opts']} for L in ('es', 'en')}})
    open(os.path.join(ROOT, 'public', 'newsletter', 'issues.json'), 'w').write(json.dumps(idx, ensure_ascii=False, indent=1))
    print('ok', [i['id'] for i in idx])
main()
