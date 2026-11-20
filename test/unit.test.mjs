import test from 'node:test';
import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';
import ece from 'http_ece';
import { encryptPayload } from '../worker/push.js';
import { b64u, totp, hashPassword, verifyPassword } from '../worker/lib.js';
import { impact, analyse, detect } from '../worker/market.js';

test('Web Push: aes128gcm-payload is te ontsleutelen door een onafhankelijke implementatie (http_ece)', async () => {
  const ua = nodeCrypto.createECDH('prime256v1'); ua.generateKeys();
  const auth = nodeCrypto.randomBytes(16);
  const sub = { p256dh: b64u.enc(ua.getPublicKey()), auth: b64u.enc(auth) };
  const msg = JSON.stringify({ title: 'Bitcoin daalt 3,4%', body: 'Impact 76/100' });
  const body = await encryptPayload(sub, new TextEncoder().encode(msg));
  const plain = ece.decrypt(Buffer.from(body), { version: 'aes128gcm', privateKey: ua, authSecret: auth });
  assert.equal(plain.toString(), msg);
});
test('TOTP volgt RFC 6238 (testvector)', async () => {
  assert.equal(await totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59000), '287082');
  assert.equal(await totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1111111109000), '081804');
});
test('wachtwoord-hash controleert juist en fout wachtwoord', async () => {
  const h = await hashPassword('Geheim123!');
  assert.ok(await verifyPassword('Geheim123!', h));
  assert.ok(!(await verifyPassword('geheim123!', h)));
});
test('Impact Score: vaste weging, begrensd 0–100', () => {
  assert.equal(impact({ M: 1, B: 1, V: 1, R: 1, S: 1, H: 1, Q: 1 }), 100);
  assert.equal(impact({}), 0);
  assert.equal(impact({ M: 9, B: -3 }), 25);
});
test('scanner herkent een ongewone daling met hoog volume', () => {
  const now = Date.now(), DAY = 864e5; const t = [], c = [], h = [], l = [], vq = [];
  for (let i = 0; i < 30; i++) { const p = 100 * (1 + 0.01 * Math.sin(i)); t.push(now - (30 - i) * DAY); c.push(p); h.push(p * 1.01); l.push(p * 0.99); vq.push(1e7); }
  const state = { tickers: { list: [{ s: 'BTC', p: 90, o: 100, h: 101, l: 89, vq: 4e7 }] }, candles: { BTC: { t, c, h, l, vq } }, names: { BTC: 'Bitcoin' } };
  const ev = detect(analyse(state)).map(e => e.type);
  assert.ok(ev.includes('move')); assert.ok(ev.includes('volume')); assert.ok(ev.includes('breakdown'));
});
import { parseRSS } from '../worker/market.js';
test('RSS: titel, link, datum en tekst worden netjes uitgelezen (CDATA, entities, Atom)', () => {
  const rss = parseRSS('<rss><channel><item><title><![CDATA[Bitcoin falls &amp; ETF outflows]]></title><link>https://ex.com/a</link><pubDate>Thu, 19 Nov 2026 22:10:00 GMT</pubDate><description>&lt;p&gt;Spot ETFs saw outflows&lt;/p&gt;</description></item></channel></rss>', 'CoinDesk');
  assert.equal(rss[0].title, 'Bitcoin falls & ETF outflows'); assert.equal(rss[0].body, 'Spot ETFs saw outflows'); assert.equal(rss[0].src, 'CoinDesk'); assert.equal(rss[0].t, Date.parse('2026-11-19T22:10:00Z'));
  const atom = parseRSS('<feed><entry><title>ETH upgrade</title><link href="https://ex.com/b"/><updated>2026-11-19T10:00:00Z</updated><summary>Done</summary></entry></feed>', 'X');
  assert.equal(atom[0].url, 'https://ex.com/b');
});
