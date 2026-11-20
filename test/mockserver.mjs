// Nep-Bitvavo + nep-pushdienst voor lokale tests van de cron-pijplijn
import http from 'node:http'; import fs from 'node:fs';
const D = JSON.parse(fs.readFileSync(new URL('./bvmock.json', import.meta.url)));
const pushes = [];
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const send = (o, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/push') { let n = 0; req.on('data', c => n += c.length); req.on('end', () => { pushes.push({ len: n, enc: req.headers['content-encoding'], auth: (req.headers.authorization || '').slice(0, 12) }); res.writeHead(201); res.end(); }); return; }
  if (u.pathname === '/pushes') return send(pushes);
  if (u.pathname === '/v2/ticker/24h') return send(D.tick);
  if (u.pathname === '/v2/assets') return send(D.assets);
  const m = u.pathname.match(/^\/v2\/([A-Z0-9]+)-EUR\/candles$/); if (m) { const iv = u.searchParams.get('interval'); return send((iv === '1h' ? D.hr : D.cand)[m[1]] || []); }
  send({ error: 'nope' }, 404);
}).listen(8790, '127.0.0.1', () => console.log('mock op 8790'));
