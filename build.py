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
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Vantis</title>
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
open('site/index.html','w').write(open('src/landing.html').read())
open('site/config.js','w').write('// gegenereerd door build.py\nwindow.VANTIS_API_ORIGIN='+_json.dumps(API_ORIGIN if NATIVE or API_ORIGIN else '')+';\n')
