# -*- coding: utf-8 -*-
"""Genera public/legal/*/index.html a partir de content_es.py y content_en.py."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from content_es import PAGES_ES, UPDATED_ES
from content_en import PAGES_EN, UPDATED_EN

OUT = sys.argv[1]
# Datos pendientes: se rellenan aquí y se regenera.
NIF = os.environ.get("PLG_NIF", "")
DOM = os.environ.get("PLG_DOM", "")
PEND_ES = '<mark class="todo">pendiente de completar</mark>'
PEND_EN = '<mark class="todo">to be completed</mark>'

ORDER = [("aviso-legal", "Aviso legal", "Legal notice"),
         ("privacidad", "Privacidad", "Privacy"),
         ("cookies", "Cookies", "Cookies"),
         ("terminos", "Términos de uso", "Terms of use"),
         ("ia", "Transparencia IA", "AI transparency")]

HEAD_SCRIPT = """<script>
(function(){var l;try{l=localStorage.getItem('plg-lang')}catch(e){}
if(l!=='es'&&l!=='en'){l=((navigator.language||'es').toLowerCase().indexOf('es')===0)?'es':'en'}
document.documentElement.setAttribute('data-lang',l);document.documentElement.lang=l;
var t;try{t=localStorage.getItem('plg-theme')}catch(e){}
if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
document.documentElement.setAttribute('data-theme',t);})();
</script>"""

CSS = """
:root{--bg:#F4F5FB;--ink:#14162E;--muted:#555A7A;--line:rgba(20,22,46,.10);--paper:#fff;--ind:#4338CA;--ind2:#8B8CF8;--coral:#FF7A59;--teal:#19B5A5;
--display:"Bricolage Grotesque",system-ui,sans-serif;--body:"DM Sans",system-ui,sans-serif;--cta-bg:#14162E;--cta-fg:#fff;--soft:#E6E8F5;color-scheme:light}
html[data-theme="dark"]{--bg:#0B0D1F;--ink:#ECEEFF;--muted:#A3A8CC;--line:rgba(236,238,255,.12);--paper:#15183A;--ind:#8B8CF8;--cta-bg:#ECEEFF;--cta-fg:#14162E;--soft:#22264F;color-scheme:dark}
html[data-lang="en"] [lang="es"],html[data-lang="es"] [lang="en"]{display:none!important}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:90px}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font:16px/1.65 var(--body);-webkit-font-smoothing:antialiased;transition:background .3s,color .3s}
a{color:var(--ind)}:focus-visible{outline:3px solid var(--ind);outline-offset:3px;border-radius:8px}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
header{position:sticky;top:0;z-index:50;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);background:color-mix(in srgb,var(--bg) 82%,transparent);border-bottom:1px solid var(--line)}
.nav{display:flex;align-items:center;gap:14px;height:68px}
.brand{text-decoration:none;color:var(--ink);font:700 24px var(--display);letter-spacing:-.045em}.brand .ai{color:var(--ind)}
.back{margin-left:auto;text-decoration:none;color:var(--muted);font-weight:500;font-size:15px;padding:8px 12px;border-radius:999px}.back:hover{background:var(--soft);color:var(--ink)}
.lang{display:flex;gap:2px;padding:3px;border-radius:999px;background:var(--paper);border:1px solid var(--line)}
.lang button{border:0;background:transparent;font:700 12px var(--body);letter-spacing:.06em;color:var(--muted);padding:6px 10px;border-radius:999px;cursor:pointer}
.lang button[aria-pressed="true"]{background:var(--cta-bg);color:var(--cta-fg)}
.theme{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--paper);color:var(--ink);display:grid;place-items:center;cursor:pointer}
.theme svg{width:17px;height:17px}.theme .sun{display:none}html[data-theme="dark"] .theme .sun{display:block}html[data-theme="dark"] .theme .moon{display:none}
@media (max-width:520px){.back span.t{display:none}.brand{font-size:21px}.nav{gap:8px}}
.layout{display:grid;grid-template-columns:230px 1fr;gap:48px;padding-top:48px;padding-bottom:80px}
main{min-width:0}
@media (max-width:860px){.layout{grid-template-columns:minmax(0,1fr);gap:20px;padding-top:28px}}
.side{position:sticky;top:96px;align-self:start}
.side h5{font:700 12px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
.side a{display:block;text-decoration:none;color:var(--muted);padding:7px 12px;border-radius:10px;font-weight:500;font-size:15px}
.side a:hover{background:var(--soft);color:var(--ink)}.side a[aria-current="page"]{background:var(--cta-bg);color:var(--cta-fg)}
@media (max-width:860px){.side{position:static}.side nav{display:flex;flex-wrap:wrap;gap:6px}.side a{border:1px solid var(--line);padding:6px 12px;border-radius:999px;font-size:14px}.side h5{display:none}}
article{max-width:760px;min-width:0}
.eyebrow{font-weight:700;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--ind)}
h1{font:800 clamp(34px,4.6vw,52px)/1.02 var(--display);letter-spacing:-.035em;margin:10px 0 14px}
.intro{font-size:18px;color:var(--muted);margin:0 0 6px}
.updated{font-size:13px;color:var(--muted);margin:0 0 32px}
h2{font:700 23px/1.2 var(--display);letter-spacing:-.025em;margin:40px 0 12px}
h3{font:700 17px var(--body);margin:26px 0 8px}
p,li{color:var(--ink)}ul{padding-left:22px}li{margin:6px 0}
.kv{list-style:none;padding:0;margin:0;border:1px solid var(--line);border-radius:16px;background:var(--paper);overflow:hidden}
.kv li{display:grid;grid-template-columns:150px 1fr;gap:14px;padding:12px 18px;margin:0;border-top:1px solid var(--line)}.kv li:first-child{border-top:0}
.kv span{color:var(--muted);font-size:14px}.kv b{font-weight:600;overflow-wrap:anywhere}
@media (max-width:520px){.kv li{grid-template-columns:1fr;gap:2px}}
.callout{border:1px solid var(--line);border-left:4px solid var(--teal);background:var(--paper);border-radius:16px;padding:16px 20px;margin:18px 0}
.callout.warn{border-left-color:var(--coral)}.callout p{margin:6px 0}.callout ul{margin:6px 0}
.table{overflow-x:auto;border:1px solid var(--line);border-radius:16px;background:var(--paper);margin:14px 0}
table{border-collapse:collapse;width:100%;font-size:14px;min-width:620px}
th,td{text-align:left;vertical-align:top;padding:11px 14px;border-top:1px solid var(--line)}
thead th{border-top:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:var(--soft)}
code{font:13px ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--soft);padding:2px 6px;border-radius:6px}
mark.todo{background:#FFE58F;color:#14162E;padding:1px 6px;border-radius:6px;font-weight:700}
.note{font-size:13px;color:var(--muted);font-style:italic;margin-top:36px}
.btn-cc{font:600 14px var(--body);background:var(--cta-bg);color:var(--cta-fg);border:0;border-radius:999px;padding:10px 18px;cursor:pointer}
button.link{font:inherit;background:none;border:0;padding:0;color:var(--ind);text-decoration:underline;cursor:pointer}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;margin-top:24px}
.cards a{display:block;text-decoration:none;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:18px 20px}
.cards a:hover{border-color:var(--ind)}.cards b{display:block;font:700 18px var(--display);letter-spacing:-.02em;margin-bottom:4px}.cards small{color:var(--muted);font-size:14px}
footer{border-top:1px solid var(--line);padding:28px 0 40px;font-size:14px;color:var(--muted)}
footer .row{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center}
footer a,footer button{color:var(--muted);text-decoration:none;font:inherit;background:none;border:0;padding:0;cursor:pointer}footer a:hover,footer button:hover{color:var(--ink);text-decoration:underline}
footer .copy{margin-left:auto}
"""

MOON = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'

def bi(es, en):
    return f'<span lang="es">{es}</span><span lang="en">{en}</span>'

def side(current):
    cur = ' aria-current="page"'
    links = "".join(
        f'<a href="/legal/{slug}/"{cur if slug == current else ""}>{bi(es, en)}</a>'
        for slug, es, en in ORDER)
    return f'<aside class="side"><h5>{bi("Legal", "Legal")}</h5><nav aria-label="Legal">{links}</nav></aside>'

def footer():
    links = "".join(f'<a href="/legal/{slug}/">{bi(es, en)}</a>' for slug, es, en in ORDER)
    return (f'<footer><div class="wrap row">{links}'
            f'<button type="button" data-cookie-settings>{bi("Configurar cookies", "Cookie settings")}</button>'
            f'<span class="copy">© <span id="y">2026</span> Matías Olivero · plaiground</span></div></footer>')

def fill(html, lang):
    pend = PEND_ES if lang == "es" else PEND_EN
    return html.replace("{NIF}", NIF or pend).replace("{DOM}", DOM or pend)

def page(slug, title_es, title_en, desc_es, main_html):
    return f"""<!DOCTYPE html>
<html lang="es" data-lang="es">
<head>
<meta charset="utf-8">
{HEAD_SCRIPT}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title_es} · plaiground</title>
<meta name="description" content="{desc_es}">
<link rel="canonical" href="https://plaigroundmarketing.com/legal/{slug + '/' if slug else ''}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#14162E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>
<header><div class="wrap nav">
<a class="brand" href="/">pl<span class="ai">ai</span>ground</a>
<a class="back" href="/">← <span class="t">{bi("Volver a la web", "Back to site")}</span></a>
<div class="lang" role="group" aria-label="Idioma / Language"><button type="button" data-l="es">ES</button><button type="button" data-l="en">EN</button></div>
<button class="theme" type="button" id="themeBtn" aria-label="Cambiar tema / Toggle theme">{MOON}{SUN}</button>
</div></header>
<div class="wrap layout">
{side(slug)}
<main id="main">{main_html}</main>
</div>
{footer()}
<script>
(function(){{var H=document.documentElement,T={{es:{title_es!r},en:{title_en!r}}};
function setLang(l,s){{H.setAttribute('data-lang',l);H.lang=l;document.title=T[l]+' · plaiground';
document.querySelectorAll('.lang button').forEach(function(b){{b.setAttribute('aria-pressed',b.dataset.l===l)}});
if(s){{try{{localStorage.setItem('plg-lang',l)}}catch(e){{}}}}}}
document.querySelectorAll('.lang button').forEach(function(b){{b.addEventListener('click',function(){{setLang(b.dataset.l,true)}})}});
setLang(H.getAttribute('data-lang')||'es',false);
document.getElementById('themeBtn').addEventListener('click',function(){{var t=H.getAttribute('data-theme')==='dark'?'light':'dark';H.setAttribute('data-theme',t);try{{localStorage.setItem('plg-theme',t)}}catch(e){{}}}});
document.getElementById('y').textContent=new Date().getFullYear();}})();
</script>
<script src="/js/consent.js" defer></script>
</body>
</html>
"""

def article(lang, p, updated):
    lab = "Legal" if lang == "es" else "Legal"
    upd = ("Última actualización: " if lang == "es" else "Last updated: ") + updated
    return (f'<article lang="{lang}"><div class="eyebrow">{lab}</div><h1>{p["title"]}</h1>'
            f'<p class="intro">{p["intro"]}</p><p class="updated">{upd}</p>{fill(p["body"], lang)}</article>')

for slug, _, _ in ORDER:
    es, en = PAGES_ES[slug], PAGES_EN[slug]
    html = page(slug, es["title"], en["title"], es["intro"].replace('"', "&quot;"),
                article("es", es, UPDATED_ES) + article("en", en, UPDATED_EN))
    d = os.path.join(OUT, "legal", slug)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(html)

# Índice /legal/
cards_es = "".join(f'<a href="/legal/{s}/"><b>{PAGES_ES[s]["title"]}</b><small>{PAGES_ES[s]["intro"]}</small></a>' for s, _, _ in ORDER)
cards_en = "".join(f'<a href="/legal/{s}/"><b>{PAGES_EN[s]["title"]}</b><small>{PAGES_EN[s]["intro"]}</small></a>' for s, _, _ in ORDER)
idx = (f'<article lang="es"><div class="eyebrow">Legal</div><h1>Información legal</h1>'
       f'<p class="intro">plaiground es un proyecto personal y experimental de Matías Olivero. Aquí tienes toda la información legal, de privacidad y sobre el uso de IA.</p>'
       f'<div class="cards">{cards_es}</div></article>'
       f'<article lang="en"><div class="eyebrow">Legal</div><h1>Legal information</h1>'
       f'<p class="intro">plaiground is a personal, experimental project by Matías Olivero. Here you will find all legal, privacy and AI-use information.</p>'
       f'<div class="cards">{cards_en}</div></article>')
os.makedirs(os.path.join(OUT, "legal"), exist_ok=True)
open(os.path.join(OUT, "legal", "index.html"), "w", encoding="utf-8").write(
    page("", "Información legal", "Legal information", "Información legal, privacidad, cookies y uso de IA en plaiground.", idx))
print("ok")
