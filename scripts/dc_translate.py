# Zet oude Nederlandse berichten van de Vantis-bot (kanalen, webhook en DM's) om naar het Engels.
import os, json, time, urllib.request, urllib.error
T = os.environ['T']; K = os.environ['K']; G = os.environ.get('G', '1573692320757321861')
API = 'https://discord.com/api/v10'; APP = 'https://vantis.rijnstadmarketing.workers.dev'
def req(method, url, body=None, headers=None, tries=5):
    h = {'Content-Type': 'application/json', 'User-Agent': 'VantisBot (https://vantis.rijnstadmarketing.workers.dev, 1)'}; h.update(headers or {})
    data = json.dumps(body).encode() if body is not None else None
    for _ in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, method=method, headers=h)) as r:
                t = r.read(); return r.status, (json.loads(t) if t else None)
        except urllib.error.HTTPError as e:
            t = e.read()
            if e.code == 429:
                time.sleep(float(json.loads(t or b'{}').get('retry_after', 1)) + .2); continue
            return e.code, (json.loads(t) if t else None)
    return 429, None
bot = lambda m, path, body=None: req(m, API + path, body, {'Authorization': 'Bot ' + T})
def translate(items, want=False):
    s, d = req('POST', APP + '/api/discord/translate', {'items': items, 'wantLinks': want}, {'x-setup-key': K}); return d or {}
def clean(m):
    em = [{k: e[k] for k in ('title', 'description', 'url', 'color', 'timestamp', 'fields') if k in e} | ({'footer': {'text': e['footer']['text']}} if e.get('footer') else {}) for e in m.get('embeds') or []]
    return {'content': m.get('content') or '', 'embeds': em}
me = bot('GET', '/users/@me')[1]['id']; changed = 0
def fix_channel(cid, hooks):
    global changed
    s, msgs = bot('GET', f'/channels/{cid}/messages?limit=100')
    if s != 200 or not msgs: return
    mine = [m for m in msgs if m['author']['id'] == me or (m.get('webhook_id') and m['webhook_id'] in hooks)]
    print('  berichten van Vantis:', len(mine))
    if not mine: return
    tr = translate([clean(m) for m in mine]).get('items', [])
    for m, new in zip(mine, tr):
        old = clean(m)
        if new == old:
            print('  onvertaald:', json.dumps(old, ensure_ascii=False)[:600]); continue
        body = {k: v for k, v in new.items() if v or k == 'embeds'}
        if m.get('webhook_id'): st, _ = req('PATCH', f"{API}/webhooks/{m['webhook_id']}/{hooks[m['webhook_id']]}/messages/{m['id']}", body)
        else: st, _ = bot('PATCH', f"/channels/{cid}/messages/{m['id']}", body)
        changed += st == 200; print('  bijgewerkt', m['id'], st); time.sleep(.35)
chs = bot('GET', f'/guilds/{G}/channels')[1]
for c in chs:
    if c['type'] != 0: continue
    hooks = {w['id']: w['token'] for w in (bot('GET', f"/channels/{c['id']}/webhooks")[1] or []) if w.get('token')}
    print('#' + c['name']); fix_channel(c['id'], hooks)
links = translate([], True).get('links') or []
print('gekoppelde leden:', len(links))
for l in links:
    if l['lang'] == 'nl': continue
    dm = l.get('dm') or (bot('POST', '/users/@me/channels', {'recipient_id': l['id']})[1] or {}).get('id')
    if dm: print('DM', l['id']); fix_channel(dm, {})
print('klaar, berichten bijgewerkt:', changed)
