import base64, os, sys, json as _json
NATIVE='--native' in sys.argv
API_ORIGIN=os.environ.get('VANTIS_API_ORIGIN','')
P='src/'
inner=open('assets/logo_inner.txt').read()
import urllib.parse as _u
def _svguri(f): return 'url("data:image/svg+xml,'+_u.quote(open('assets/'+f).read().replace('"',"'"),safe=" =:/'<>.-,()")+'")'
css=open(P+'styles.css').read().replace('__VMARK__',_svguri('vantis-mark.svg')).replace('__VWORD__',_svguri('vantis-word.svg')).replace('__VFULL__',_svguri('vantis-full.svg'))
body=open(P+'body.html').read()
js='\n'.join(open(P+f).read() for f in ['engine.js','api.js','ui-core.js','ui-viz.js','ui-pages.js','ui-pages2.js','ui-v3.js','ui-v4.js','ui-v5.js','ui-v6.js','ui-v7.js','ui-v8.js','ui-v9.js','academy-data.js','ui-v10.js','ui-v11.js','ui-v12.js','ui-v13.js']).replace('__LOGO__',inner.replace('`','\\`'))
icon=base64.b64encode(open('assets/icon180.png','rb').read()).decode()
fav=base64.b64encode(open('assets/logo_icon.svg','rb').read()).decode()
html=f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Vantis</title>
<script>try{{var R0=document.documentElement,st0=JSON.parse(localStorage.getItem("vantis.settings")||"{{}}"),lq=(location.search.match(/[?&]lang=(en|nl)/)||[])[1];if(lq&&st0.lang!==lq){{st0.lang=lq;localStorage.setItem("vantis.settings",JSON.stringify(st0))}}if(st0.lang!=="nl"){{R0.classList.add("i18nwait");setTimeout(function(){{R0.classList.remove("i18nwait")}},2500)}}else R0.lang="nl"}}catch(e){{}}</script>
<script>try{{var v=localStorage.getItem("vantis.skin"),k=(v&&JSON.parse(v))||"luxdark",R=document.documentElement;R.dataset.skin=k;if(["luxdark","oled","navygold","emerald","bordeaux","noirblue","noirgreen"].indexOf(k)>=0)R.dataset.theme="dark";else if(["luxlight","arctic"].indexOf(k)>=0)R.dataset.theme="light"}}catch(e){{document.documentElement.dataset.skin="luxdark";document.documentElement.dataset.theme="dark"}}</script>
<meta name="description" content="Vantis: Crypto Intelligence voor crypto en aandelen.">
<meta name="theme-color" content="#050505">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Vantis">
<link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,{fav}">
<link rel="apple-touch-icon" href="data:image/png;base64,{icon}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@500;600;700&display=swap" rel="stylesheet">
<script src="config.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" defer></script>
<style>
{css}
</style>
</head>
<body>
{body}
<script>
{{
'use strict';
{js}
}}
</script>
</body>
</html>
'''
open('site/app.html','w').write(html)
print(len(html))
# landingspagina op /, de app op /app
import json as _j, re as _re, os as _os
_L = open('src/landing.html').read()
_SW = '<a class="txtlink lgsw" href="{h}" hreflang="{l}" lang="{l}" aria-label="{a}">{t}</a>'
_ALT = '<link rel="alternate" hreflang="en" href="https://vantis.rijnstadmarketing.workers.dev/"><link rel="alternate" hreflang="nl" href="https://vantis.rijnstadmarketing.workers.dev/nl/"><link rel="alternate" hreflang="x-default" href="https://vantis.rijnstadmarketing.workers.dev/">'
# Engels (standaard) op /
_E = _L; _T = _j.load(open('src/landing.en.json'))
for _k in sorted(_T, key=len, reverse=True):
    _v = _T[_k]
    if len(_k) >= 14 or not _k[0].isalpha(): _E = _E.replace(_k, _v)
    else:
        for _a, _b in (('>', '<'), ('"', '"'), ("'", "'")): _E = _E.replace(_a + _k + _b, _a + _v + _b)
_E = _E.replace("esc(p.label.replace(/ per maand$/,''))", "esc(p.label.replace(/ per maand$/,'').replace(/€\\s?(\\d+),(\\d+)/,'€$1.$2'))").replace("' dagen gratis'", "' days free'")
_E = _re.sub(r'€\s?(\d+),(\d{2})', r'€\1.\2', _E)
_E = _E.replace('<div class="acts">', '<div class="acts">' + _SW.format(h='/nl/', l='nl', a='Nederlands', t='NL'), 1).replace('</head>', _ALT + '</head>', 1)
open('site/index.html', 'w').write(_E)
# Nederlands op /nl/
_N = _L
for _a in ('src="', 'href="', 'srcset="', 'url('): _N = _N.replace(_a + 'landing/', _a + '/landing/')
for _f in ('apple-touch-icon.png', 'icon-192.png', 'manifest.webmanifest'): _N = _N.replace('href="' + _f + '"', 'href="/' + _f + '"')
_N = _N.replace('href="/app"', 'href="/app?lang=nl"').replace('href="/app?start=register"', 'href="/app?start=register&lang=nl"')
_N = _N.replace('<div class="acts">', '<div class="acts">' + _SW.format(h='/', l='en', a='English', t='EN'), 1).replace('</head>', _ALT + '</head>', 1).replace('href="/" aria-label="Vantis, naar het begin"', 'href="/nl/" aria-label="Vantis, naar het begin"')
_os.makedirs('site/nl', exist_ok=True); open('site/nl/index.html', 'w').write(_N)
open('site/config.js','w').write('// gegenereerd door build.py\nwindow.VANTIS_API_ORIGIN='+_json.dumps(API_ORIGIN if NATIVE or API_ORIGIN else '')+';\n')
