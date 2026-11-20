import base64, os, sys, json as _json
NATIVE='--native' in sys.argv
API_ORIGIN=os.environ.get('CSA_API_ORIGIN','')
P='src/'
inner=open('assets/logo_inner.txt').read()
css=open(P+'styles.css').read()
body=open(P+'body.html').read()
js='\n'.join(open(P+f).read() for f in ['engine.js','api.js','ui-core.js','ui-viz.js','ui-pages.js','ui-pages2.js']).replace('__LOGO__',inner.replace('`','\\`'))
icon=base64.b64encode(open('assets/icon180.png','rb').read()).decode()
fav=base64.b64encode(open('assets/logo_icon.svg','rb').read()).decode()
html=f'''<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Crypto Signal AI</title>
<meta name="description" content="Crypto Signal AI: AI Market Intelligence voor crypto en aandelen.">
<meta name="theme-color" content="#17243A">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="CSA">
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
open('site/index.html','w').write(html)
print(len(html))
open('site/config.js','w').write('// gegenereerd door build.py\nwindow.CSA_API_ORIGIN='+_json.dumps(API_ORIGIN if NATIVE or API_ORIGIN else '')+';\n')
