// CSA worker — API, statische app en 24/7 scanner (cron)
import { json, err, readJSON, hashPassword, verifyPassword, b32enc, rand, totpCheck, newSession, sessionFrom, sessionByToken, sha256, seal, open,
  limited, bump, clearAttempts, kvGet, kvPutStmt, randToken, DAY, HOUR, MIN } from './lib.js';
import { vapidKeys, sendPush } from './push.js';
import { indFor, IND_KINDS, NOVAL, refreshMarket, lookupPrice, lookupStock, usdPerEur, analyse, detect, backtest, budget, RADAR, STOCK_SYMS, ALERT_KINDS, quote, alertHit, alertText, buildBriefing } from './market.js';
import { checkout, portal, webhook, stripeReady } from './billing.js';
import { handlePaper, paperCron, paperNeed } from './paper.js';

const VERSION = '1.4.0';
const NATIVE_ORIGINS = ['capacitor://localhost', 'http://localhost', 'https://localhost', 'ionic://localhost'];
const DEFAULT_SETTINGS = { notify: true, briefing: true, minScore: 60, scope: 'all', quiet: false, quietFrom: '23:00', quietTo: '07:00', cats: {} };
const EMAIL_RX = /^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$/;

function cors(req, res) {
  const o = req.headers.get('origin'); if (!o || !NATIVE_ORIGINS.includes(o)) return res;
  const h = new Headers(res.headers); h.set('access-control-allow-origin', o); h.set('vary', 'origin');
  h.set('access-control-allow-headers', 'authorization, content-type'); h.set('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS'); h.set('access-control-max-age', '86400');
  return new Response(res.body, { status: res.status, headers: h });
}
const premiumOnly = (env, s) => env.PREMIUM_ENFORCED === 'true' && s.plan !== 'premium';
const ip = req => req.headers.get('cf-connecting-ip') || 'local';
const userOut = s => ({ email: s.email, name: s.name, plan: s.plan, totp: !!s.totp_on });

async function loadState(env, keys) {
  const r = await env.DB.prepare(`SELECT key,val,ts FROM kv WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all();
  const st = {}; for (const row of r.results) { st[row.key] = JSON.parse(row.val); st[row.key + 'Ts'] = row.ts; } return st;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.method === 'OPTIONS') return cors(request, new Response(null, { status: 204 }));
    try { return cors(request, await api(request, env, ctx, url)); }
    catch (e) { console.error(e); return cors(request, err(500, 'Serverfout: ' + e.message)); }
  },
  async scheduled(event, env, ctx) {
    if (event.cron === '17 3 * * *') ctx.waitUntil(daily(env)); else if (event.cron === '0 7 * * *') ctx.waitUntil(morning(env)); else ctx.waitUntil(tick(env));
  }
};

/* =================================================================== API */
async function api(req, env, ctx, url) {
  const p = url.pathname, m = req.method;
  if (p === '/api/health') { const st = await loadState(env, ['market', 'extra', 'news', 'scanstatus', 'scanstart', 'tickers']);
    if (url.searchParams.has('diag')) { const probe = {}; for (const sy of (url.searchParams.get('probe') || '').toUpperCase().split(',').filter(Boolean).slice(0, 4)) { const r = await lookupPrice(env, sy, budget(10), st.tickers?.usdt); probe[sy] = r.p ? { p: r.p, src: r.src, tried: r.tried } : { p: null, tried: r.tried }; }
      if (url.searchParams.get('probestock')) { const ps = await loadState(env, ['fx', 'tickers']); const b2 = budget(12); const fx = await usdPerEur(env, b2, ps); for (const sy of url.searchParams.get('probestock').toUpperCase().split(',').slice(0, 3)) { const r = await lookupStock(env, sy, b2, fx); probe['S:' + sy] = r.p ? { p: r.p, native: r.native, cur: r.cur, src: r.src, tried: r.tried } : { p: null, tried: r.tried }; } probe.fx = fx; }
      const xq = await loadState(env, ['xquotes']); return json({ probe, xquotes: Object.fromEntries(Object.entries(xq.xquotes || {}).map(([k, v]) => [k, v.p ? { p: v.p, src: v.src, age: Date.now() - v.u } : { miss: v.tried }])), version: VERSION, now: Date.now(), scanstart: st.scanstart || null, scan: st.scanstatus || null, prices: st.tickers ? { src: st.tickers.src || 'Bitvavo', n: (st.tickers.list || []).length, age: Date.now() - st.tickers.t, sample: Object.fromEntries(['BTC', 'ETH', 'SOL', 'XRP'].map(s => [s, (st.tickers.list || []).find(x => x.s === s)?.p ?? null])) } : null }); }
    return json({ ok: true, version: VERSION, lastScan: st.marketTs || null, prices: st.tickers ? { src: st.tickers.src || 'Bitvavo', n: (st.tickers.list || []).length, t: st.tickers.t } : null, scanOk: st.scanstatus ? Object.fromEntries(Object.entries(st.scanstatus).filter(([, v]) => v && typeof v === 'object' && 'ok' in v).map(([k, v]) => [k, v.ok])) : null, data: { extra: st.extra ? { global: !!st.extra.global, fng: !!(st.extra.fng && st.extra.fng.length), trending: !!(st.extra.trending && st.extra.trending.length), errors: [st.extra.globalErr, st.extra.trendErr, st.extra.fngErr].filter(Boolean) } : null, news: st.news ? { items: (st.news.items || []).length, sources: st.news.sources || {} } : null }, features: { accounts: true, push: true, stripe: stripeReady(env), finnhub: !!env.FINNHUB_KEY, ai: false, premiumEnforced: env.PREMIUM_ENFORCED === 'true' } }); }

  /* ---------- account ---------- */
  if (p === '/api/auth/register' && m === 'POST') {
    const b = await readJSON(req); const email = String(b.email || '').trim().toLowerCase(); const pw = String(b.password || '');
    if (!EMAIL_RX.test(email)) return err(400, 'Vul een geldig e-mailadres in.');
    if (pw.length < 8) return err(400, 'Kies een wachtwoord van minimaal 8 tekens.');
    const wait = await limited(env, 'reg:' + ip(req), 5, HOUR); if (wait) return err(429, 'Te veel registraties vanaf dit netwerk. Probeer het later opnieuw.');
    await bump(env, 'reg:' + ip(req), HOUR);
    const exists = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first(); if (exists) return err(409, 'Er bestaat al een account met dit e-mailadres. Log in.');
    const id = crypto.randomUUID(); const secret = b32enc(rand(20));
    const name = String(b.name || email.split('@')[0]).slice(0, 60);
    await env.DB.prepare('INSERT INTO users(id,email,name,pw,totp,created) VALUES(?,?,?,?,?,?)').bind(id, email, name, await hashPassword(pw), await seal(env, secret), Date.now()).run();
    const pend = await newSession(env, id, 'pending', 20 * MIN);
    return json({ pending: pend.token, setup: { secret, uri: `otpauth://totp/CSA:${encodeURIComponent(email)}?secret=${secret}&issuer=Crypto%20Signal%20AI&digits=6&period=30` } });
  }
  if (p === '/api/auth/login' && m === 'POST') {
    const b = await readJSON(req); const email = String(b.email || '').trim().toLowerCase();
    const k = 'login:' + email; const wait = await limited(env, k, 6); if (wait) return err(429, `Te veel pogingen. Probeer het over ${Math.ceil(wait / 60)} minuten opnieuw.`);
    const u = await env.DB.prepare('SELECT id,pw,totp,totp_on,email FROM users WHERE email=?').bind(email).first();
    if (!u || !(await verifyPassword(String(b.password || ''), u.pw))) { await bump(env, k); return err(401, 'E-mailadres of wachtwoord klopt niet.'); }
    const pend = await newSession(env, u.id, 'pending', 10 * MIN);
    if (!u.totp_on) { const secret = await open(env, u.totp); return json({ pending: pend.token, setup: { secret, uri: `otpauth://totp/CSA:${encodeURIComponent(u.email)}?secret=${secret}&issuer=Crypto%20Signal%20AI&digits=6&period=30` } }); }
    return json({ pending: pend.token, need: 'totp' });
  }
  if (p === '/api/auth/verify' && m === 'POST') {
    const b = await readJSON(req); const s = await sessionByToken(env, String(b.pending || ''), 'pending'); if (!s) return err(401, 'Sessie verlopen. Log opnieuw in.');
    const k = 'otp:' + s.user_id; const wait = await limited(env, k, 6); if (wait) return err(429, 'Te veel onjuiste codes. Probeer het later opnieuw.');
    const u = await env.DB.prepare('SELECT totp,totp_on,backup FROM users WHERE id=?').bind(s.user_id).first();
    const code = String(b.code || '').replace(/\s/g, ''); let ok = await totpCheck(await open(env, u.totp), code); let backup = null;
    if (!ok && u.totp_on && /^[a-z0-9]{10}$/i.test(code)) { const list = JSON.parse(u.backup || '[]'); const h = await sha256(code.toLowerCase()); if (list.includes(h)) { ok = true; await env.DB.prepare('UPDATE users SET backup=? WHERE id=?').bind(JSON.stringify(list.filter(x => x !== h)), s.user_id).run(); } }
    if (!ok) { await bump(env, k); return err(401, 'Onjuiste code.'); }
    await clearAttempts(env, k); await clearAttempts(env, 'login:' + s.email);
    if (!u.totp_on) { backup = Array.from({ length: 8 }, () => [...rand(5)].map(x => x.toString(16).padStart(2, '0')).join(''));
      await env.DB.prepare('UPDATE users SET totp_on=1, backup=? WHERE id=?').bind(JSON.stringify(await Promise.all(backup.map(x => sha256(x)))), s.user_id).run(); }
    await env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(await sha256(s.token)).run();
    const full = await newSession(env, s.user_id, 'full', b.trust ? 30 * DAY : 12 * HOUR);
    return json({ token: full.token, expires: full.expires, backup, user: { email: s.email, name: s.name, plan: s.plan, totp: true } });
  }

  const s = await sessionFrom(env, req);
  const needAuth = () => err(401, 'Log in om dit te gebruiken.');

  if (p === '/api/auth/logout' && m === 'POST') { if (s) await env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(await sha256(s.token)).run(); return json({ ok: true }); }
  if (p === '/api/me' && m === 'GET') { if (!s) return needAuth(); return json({ user: userOut(s) }); }
  if (p === '/api/me' && m === 'DELETE') { if (!s) return needAuth(); const id = s.user_id;
    await env.DB.batch(['sessions', 'prefs', 'push_subs', 'positions', 'paper', 'paper_trades', 'paper_orders', 'paper_hist', 'sent', 'price_alerts', 'notif'].map(t => env.DB.prepare(`DELETE FROM ${t} WHERE user_id=?`).bind(id)).concat([env.DB.prepare('DELETE FROM users WHERE id=?').bind(id)]));
    return json({ ok: true, deleted: true }); }

  /* ---------- voorkeuren ---------- */
  if (p === '/api/prefs') { if (!s) return needAuth();
    if (m === 'GET') { const r = await env.DB.prepare('SELECT settings,watch,rem,updated FROM prefs WHERE user_id=?').bind(s.user_id).first(); return json(r ? { settings: JSON.parse(r.settings || '{}'), watch: JSON.parse(r.watch || '[]'), rem: JSON.parse(r.rem || '{}'), updated: r.updated } : { settings: null }); }
    if (m === 'PUT') { const b = await readJSON(req); const settings = { ...(b.settings || {}) }; delete settings.fhKey;
      await env.DB.prepare('INSERT INTO prefs(user_id,settings,watch,rem,updated) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET settings=excluded.settings,watch=excluded.watch,rem=excluded.rem,updated=excluded.updated')
        .bind(s.user_id, JSON.stringify(settings), JSON.stringify((b.watch || []).slice(0, 200)), JSON.stringify(b.rem || {}), Date.now()).run(); return json({ ok: true }); } }

  /* ---------- push ---------- */
  if (p === '/api/push/key') return json({ key: (await vapidKeys(env)).pub });
  if (p === '/api/push/subscribe') { if (!s) return needAuth(); if (premiumOnly(env, s)) return err(402, 'Pushmeldingen 24/7 zijn onderdeel van Premium.');
    const b = await readJSON(req);
    if (m === 'POST') { if (!(/^https:\/\//.test(b.endpoint || '') || (env.DEV_ALLOW_HTTP_PUSH === 'true' && /^http:\/\/127\.0\.0\.1/.test(b.endpoint || ''))) || !b.keys?.p256dh || !b.keys?.auth) return err(400, 'Ongeldig abonnement');
      await env.DB.prepare('INSERT INTO push_subs(endpoint,user_id,p256dh,auth,created) VALUES(?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,fails=0').bind(b.endpoint, s.user_id, b.keys.p256dh, b.keys.auth, Date.now()).run(); return json({ ok: true }); }
    if (m === 'DELETE') { await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=? AND user_id=?').bind(b.endpoint || '', s.user_id).run(); return json({ ok: true }); } }
  if (p === '/api/push/test' && m === 'POST') { if (!s) return needAuth();
    const subs = (await env.DB.prepare('SELECT * FROM push_subs WHERE user_id=?').bind(s.user_id).all()).results; if (!subs.length) return err(400, 'Dit account heeft nog geen apparaat voor pushmeldingen.');
    const res = []; for (const sub of subs) { const r = await sendPush(env, sub, { title: 'CSA testmelding', body: 'Pushmeldingen werken. Zo krijg je straks belangrijke marktgebeurtenissen binnen.', url: '/#impact', tag: 'test' }); res.push(r); if (r === 'gone') await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(sub.endpoint).run(); }
    return json({ results: res }); }

  /* ---------- marktdata (openbaar) ---------- */
  if (p === '/api/market' && m === 'GET') {
    const st = await loadState(env, ['tickers', 'extra', 'stocks', 'news']);
    const ev = (await env.DB.prepare('SELECT data FROM events WHERE first>? ORDER BY score DESC LIMIT 60').bind(Date.now() - 2 * DAY).all()).results.map(r => JSON.parse(r.data));
    return json({ t: Date.now(), tickers: st.tickers || null, tickersTs: st.tickersTs || null, extra: st.extra || null, stocks: st.stocks || null, news: st.news || null, events: ev, radar: RADAR }, 200, { 'cache-control': 'public, max-age=20' });
  }
  if (p === '/api/backtest' && m === 'GET') { const r = await kvGet(env, 'backtest'); if (!r) return json({ pending: true });
    const out = r.val; if (s && premiumOnly(env, s) || (!s && env.PREMIUM_ENFORCED === 'true')) return json({ ...out, recent: [], locked: true }); return json(out); }
  if (p === '/api/ai/briefing') return json({ status: 'later', message: 'De AI-laag wordt in een volgende fase gekoppeld.' }, 501);

  /* ---------- eigen portefeuille ---------- */
  if (p === '/api/portfolio') { if (!s) return needAuth();
    if (m === 'GET') return json({ positions: (await env.DB.prepare('SELECT id,sym,kind,qty,avg,note,created FROM positions WHERE user_id=? ORDER BY created').bind(s.user_id).all()).results });
    if (m === 'POST') { const b = await readJSON(req); const sym = String(b.sym || '').toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 12); const qty = Number(b.qty), avg = b.avg == null || b.avg === '' ? null : Number(b.avg);
      if (!sym || !(qty > 0) || (avg != null && !(avg >= 0))) return err(400, 'Vul een geldig symbool, aantal en (optioneel) aankoopprijs in.');
      const n = await env.DB.prepare('SELECT COUNT(*) n FROM positions WHERE user_id=?').bind(s.user_id).first(); if (n.n >= 200) return err(400, 'Maximaal 200 posities.');
      const r = await env.DB.prepare('INSERT INTO positions(user_id,sym,kind,qty,avg,note,created) VALUES(?,?,?,?,?,?,?)').bind(s.user_id, sym, b.kind === 'stock' ? 'stock' : 'crypto', qty, avg, String(b.note || '').slice(0, 120), Date.now()).run();
      return json({ ok: true, id: r.meta.last_row_id }); } }
  const pm = p.match(/^\/api\/portfolio\/(\d+)$/);
  if (pm && m === 'DELETE') { if (!s) return needAuth(); await env.DB.prepare('DELETE FROM positions WHERE id=? AND user_id=?').bind(+pm[1], s.user_id).run(); return json({ ok: true }); }

  /* ---------- oefenportefeuille (virtueel geld, koersen van de server) ---------- */
  if (p.startsWith('/api/paper') || p === '/api/quote' || p === '/api/board' || p === '/api/history') { if (!s && p !== '/api/quote' && p !== '/api/history') return needAuth();
    const r = await handlePaper(req, env, s || {}, p, m, url); if (r) return r; }

  if (p === '/api/unlocks' && m === 'GET') { const st = await loadState(env, ['unlocks']); return json(st.unlocks ? { ...st.unlocks, events: st.unlocks.events.filter(e => e.t > Date.now() - DAY) } : { pending: true, events: [] }); }

  /* ---------- koersalerts ---------- */
  if (p === '/api/alerts') { if (!s) return needAuth();
    if (m === 'GET') return json({ alerts: (await env.DB.prepare('SELECT id,sym,kind,value,active,created,fired,note FROM price_alerts WHERE user_id=? ORDER BY created DESC').bind(s.user_id).all()).results, kinds: ALERT_KINDS });
    if (m === 'POST') { const b = await readJSON(req); const sym = String(b.sym || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); const value = NOVAL.has(b.kind) ? 1 : Number(b.value);
      if (!sym || !ALERT_KINDS[b.kind] || !(value > 0)) return err(400, 'Kies een asset, een soort alert en een geldige waarde.');
      if (/1h|24h/.test(b.kind) && value > 90) return err(400, 'Kies een percentage tot 90%.');
      if (/^rsi/.test(b.kind) && !(value >= 1 && value <= 99)) return err(400, 'Kies een RSI-waarde tussen 1 en 99.');
      if (b.kind === 'volx' && !(value >= 1.1 && value <= 20)) return err(400, 'Kies een factor tussen 1,1 en 20.');
      const n = await env.DB.prepare('SELECT COUNT(*) n FROM price_alerts WHERE user_id=? AND active=1').bind(s.user_id).first(); if (n.n >= 50) return err(400, 'Maximaal 50 actieve koersalerts.');
      const st = await loadState(env, ['tickers', 'stocks', 'names', 'xquotes', 'candles']); let q = quote(st, sym);
      if (IND_KINDS.has(b.kind)) { const ind = q ? indFor(st, sym, q.p) : null; if (!ind) return err(400, `Voor ${sym} heeft de server nog geen dagkoersen, dus indicator-alerts kunnen niet. Ze werken voor de 40 grootste munten.`);
        if (alertHit({ kind: b.kind, value }, q, ind)) return err(400, 'Deze voorwaarde geldt nu al. Kies een andere waarde of soort alert.'); }
      if (!q && !STOCK_SYMS.includes(sym)) { const r = await quoteNow(env, sym); if (r.q) q = { p: r.q.p, src: r.q.src }; }
      if (q && b.kind === 'above' && q.p >= value) return err(400, `De koers staat al boven deze waarde (nu ${q.p.toLocaleString('nl-NL')}).`);
      if (q && b.kind === 'below' && q.p <= value) return err(400, `De koers staat al onder deze waarde (nu ${q.p.toLocaleString('nl-NL')}).`);
      if (!q && !/^[A-Z0-9]{2,10}$/.test(sym)) return err(400, 'Onbekend symbool.');
      const r = await env.DB.prepare('INSERT INTO price_alerts(user_id,sym,kind,value,active,created,note) VALUES(?,?,?,?,1,?,?)').bind(s.user_id, sym, b.kind, value, Date.now(), String(b.note || '').slice(0, 80)).run();
      return json({ ok: true, id: r.meta.last_row_id, pending: !q, message: q ? null : `De server heeft op dit moment geen koers voor ${sym}. Je alert is opgeslagen en wordt gecontroleerd zodra er een koers is.` }); } }
  const am = p.match(/^\/api\/alerts\/(\d+)$/);
  if (am && m === 'DELETE') { if (!s) return needAuth(); await env.DB.prepare('DELETE FROM price_alerts WHERE id=? AND user_id=?').bind(+am[1], s.user_id).run(); return json({ ok: true }); }
  if (am && m === 'PUT') { if (!s) return needAuth(); const b = await readJSON(req); await env.DB.prepare('UPDATE price_alerts SET active=?, fired=NULL WHERE id=? AND user_id=?').bind(b.active ? 1 : 0, +am[1], s.user_id).run(); return json({ ok: true }); }

  /* ---------- meldingen (ook wat binnenkwam terwijl de app dicht was) ---------- */
  if (p === '/api/notifications' && m === 'GET') { if (!s) return needAuth();
    return json({ items: (await env.DB.prepare('SELECT id,title,body,url,cat,score,t FROM notif WHERE user_id=? ORDER BY t DESC LIMIT 150').bind(s.user_id).all()).results }); }

  /* ---------- dagelijkse briefing ---------- */
  if (p === '/api/briefing' && m === 'GET') {
    const r = await kvGet(env, 'briefing'); if (r && Date.now() - r.ts < 20 * HOUR) return json({ ...r.val, edition: true });
    const st = await loadState(env, ['tickers', 'ticks', 'names', 'candles', 'news', 'extra']); if (!st.tickers) return json({ pending: true });
    const ev = (await env.DB.prepare('SELECT data FROM events WHERE first>?').bind(Date.now() - DAY).all()).results.map(x => JSON.parse(x.data));
    return json({ ...buildBriefing(st, ev, analyse(st)), edition: false }); }

  /* ---------- premium / Stripe ---------- */
  if (p === '/api/billing/status') return json({ ready: stripeReady(env), enforced: env.PREMIUM_ENFORCED === 'true', plan: s ? s.plan : null, price: env.PREMIUM_PRICE_LABEL || null });
  if (p === '/api/billing/checkout' && m === 'POST') { if (!s) return needAuth(); return checkout(env, s, url.origin); }
  if (p === '/api/billing/portal' && m === 'POST') { if (!s) return needAuth(); return portal(env, s, url.origin); }
  if (p === '/api/billing/webhook' && m === 'POST') return webhook(env, req);

  return err(404, 'Onbekend endpoint');
}

/* =================================================================== CRON */
async function quoteNow(env, sym) {
  const st = await loadState(env, ['tickers', 'stocks', 'names', 'xquotes']); const fresh = st.tickers && Date.now() - st.tickers.t < 15 * MIN;
  const t = fresh && (st.tickers.list || []).find(x => x.s === sym); if (t) return { q: { p: t.p, src: st.tickers.src || 'Bitvavo' }, st };
  const x = st.xquotes?.[sym]; if (x && x.p && Date.now() - x.u < 10 * MIN) return { q: { p: x.p, src: x.src }, st };
  if (STOCK_SYMS.includes(sym)) return { q: null, st };
  const r = await lookupPrice(env, sym, budget(12), st.tickers?.usdt);
  if (r.p) { const X = st.xquotes || {}; X[sym] = r; await kvPutStmt(env, 'xquotes', X).run(); return { q: { p: r.p, src: r.src }, st }; }
  return { q: null, st, tried: r.tried };
}
async function tick(env) {
  const b = budget(45); const status = { t: Date.now() };
  await kvPutStmt(env, 'scanstart', { t: status.t }).run();
  const state = await loadState(env, ['tickers', 'ticks', 'names', 'candles', 'news', 'extra', 'stocks', 'xquotes', 'fx', 'phT']);
  try { state.need = await paperNeed(env); } catch (e) { status.need = { ok: false, err: e.message }; }
  await refreshMarket(env, state, b, status);
  try {
    const an = analyse(state); const found = detect(an); status.analyse = { ok: true, assets: an.A.length, withHistory: an.A.filter(a => a.vol).length, events: found.length };
    const prev = new Set((await env.DB.prepare('SELECT id FROM events WHERE first>?').bind(Date.now() - 2 * DAY).all()).results.map(r => r.id));
    const now = Date.now(); const writes = [];
    for (const e of found) { e.t = now; writes.push(env.DB.prepare('INSERT INTO events(id,data,score,first,updated) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,score=excluded.score,updated=excluded.updated').bind(e.id, JSON.stringify(e), e.score, now, now)); }
    writes.push(kvPutStmt(env, 'market', { t: now, mk: an.mk, src: state.tickers?.src || null }));
    await env.DB.batch(writes);
    let extra = {}; try { extra = await paperCron(env, state, status); } catch (e) { status.orders = { ok: false, err: e.message }; }
    try { await dispatch(env, found.filter(e => !prev.has(e.id)), b, state, extra); status.push = { ok: true }; } catch (e) { status.push = { ok: false, err: e.message }; }
  } catch (e) { status.analyse = { ok: false, err: e.message }; }
  status.done = Date.now(); status.subrequestsLeft = b.left;
  await kvPutStmt(env, 'scanstatus', status).run();
}
function localHM(tz = 'Europe/Amsterdam') { const p = new Intl.DateTimeFormat('nl-NL', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); return +p.find(x => x.type === 'hour').value * 60 + +p.find(x => x.type === 'minute').value; }
function inQuiet(st) { if (!st.quiet) return false; const m = localHM(); const [fh, fm] = (st.quietFrom || '23:00').split(':').map(Number), [th, tm] = (st.quietTo || '07:00').split(':').map(Number); const f = fh * 60 + fm, t = th * 60 + tm; return f < t ? (m >= f && m < t) : (m >= f || m < t); }
async function dispatch(env, fresh, b, state, extra = {}) {
  const now = Date.now(); const ops = []; const gone = new Set();
  const subsRows = (await env.DB.prepare('SELECT s.endpoint,s.user_id,s.p256dh,s.auth,p.settings,p.watch,p.rem,u.plan FROM push_subs s JOIN users u ON u.id=s.user_id LEFT JOIN prefs p ON p.user_id=s.user_id').all()).results;
  const subsBy = {}; for (const r of subsRows) (subsBy[r.user_id] = subsBy[r.user_id] || []).push(r);
  const out = {}; // user_id -> [{key,title,body,url,tag,cat,score,force}]
  const add = (uid, msg) => (out[uid] = out[uid] || []).push(msg);
  for (const [uid, L] of Object.entries(extra)) for (const msg of L) add(uid, msg);
  // 1. koersalerts (voor iedereen met een account; push als er een apparaat is)
  const alerts = (await env.DB.prepare('SELECT * FROM price_alerts WHERE active=1').all()).results;
  for (const a of alerts) {
    if (/1h|24h/.test(a.kind) && a.fired && now - a.fired < 6 * HOUR) continue;
    const q = quote(state, a.sym); const ind = IND_KINDS.has(a.kind) && q ? indFor(state, a.sym, q.p) : null; if (!alertHit(a, q, ind)) continue;
    const t = alertText(a, q, ind); add(a.user_id, { key: 'alert:' + a.id + ':' + now, title: t.title, body: t.body, url: '/#asset-' + a.sym.toLowerCase(), tag: 'alert-' + a.id, cat: 'alert', score: null, force: true });
    ops.push(/1h|24h/.test(a.kind) ? env.DB.prepare('UPDATE price_alerts SET fired=? WHERE id=?').bind(now, a.id) : env.DB.prepare('UPDATE price_alerts SET active=0, fired=? WHERE id=?').bind(now, a.id));
  }
  // 2. gebeurtenissen en herinneringen (gebruikers met pushmeldingen)
  const sentRows = (await env.DB.prepare('SELECT user_id,key FROM sent WHERE t>?').bind(now - 3 * HOUR).all()).results; const sent = new Set(sentRows.map(r => r.user_id + '|' + r.key));
  const radarDue = []; for (const e of RADAR) for (const off of [1440, 60, 15]) { const at = e.t - off * MIN; if (now >= at && now < at + 6 * MIN) radarDue.push({ e, off }); }
  for (const [uid, subs] of Object.entries(subsBy)) {
    const r = subs[0]; if (env.PREMIUM_ENFORCED === 'true' && r.plan !== 'premium') continue;
    const st = { ...DEFAULT_SETTINGS, ...JSON.parse(r.settings || '{}') }; const watch = JSON.parse(r.watch || '[]'); const rem = JSON.parse(r.rem || '{}'); const cats = st.cats || {};
    for (const { e, off } of radarDue) if ((rem[e.id] || []).includes(off)) add(uid, { key: `rem:${e.id}:${off}`, title: `Over ${off >= 60 ? off / 60 + ' uur' : off + ' minuten'}: ${e.title}`, body: new Date(e.t).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), url: '/#radar', tag: 'rem-' + e.id, cat: 'reminder', force: true });
    if (st.notify !== false && !inQuiet(st)) for (const e of fresh.slice().sort((x, y) => y.score - x.score)) {
      if (e.score < (st.minScore ?? 60) || cats[e.cat] === false) continue;
      if (st.scope === 'watch' && e.s && !watch.includes(e.s)) continue;
      if (sent.has(uid + '|' + e.type + ':' + (e.s || 'market'))) continue;
      add(uid, { key: e.type + ':' + (e.s || 'market'), title: e.title, body: `Impact ${e.score}/100 · ${e.body}`, url: e.s ? '/#asset-' + e.s.toLowerCase() : '/#impact', tag: e.id, cat: 'impact', score: e.score });
    }
  }
  // 3. versturen + loggen in het meldingencentrum
  for (const [uid, msgs] of Object.entries(out)) {
    for (const msg of msgs.slice(0, 4)) {
      ops.push(env.DB.prepare('INSERT OR IGNORE INTO notif(id,user_id,title,body,url,cat,score,t) VALUES(?,?,?,?,?,?,?,?)').bind(msg.tag + ':' + now, uid, msg.title, msg.body || '', msg.url || '/', msg.cat || '', msg.score ?? null, now));
      if (msg.cat !== 'alert' && msg.cat !== 'reminder' && msg.cat !== 'order') ops.push(env.DB.prepare('INSERT INTO sent(user_id,key,t) VALUES(?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET t=excluded.t').bind(uid, msg.key, now));
      for (const sub of subsBy[uid] || []) { if (gone.has(sub.endpoint) || !b.take()) continue;
        const res = await sendPush(env, sub, { title: msg.title, body: msg.body, url: msg.url, tag: msg.tag, urgency: msg.cat === 'alert' || msg.cat === 'order' ? 'high' : 'normal', cat: msg.cat, score: msg.score ?? null, important: msg.cat === 'alert' || msg.cat === 'order' || (msg.score || 0) >= 80 }).catch(e => 'fail:' + e.message);
        if (res === 'gone') { gone.add(sub.endpoint); ops.push(env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(sub.endpoint)); } }
    }
  }
  if (ops.length) await env.DB.batch(ops);
}
async function morning(env) {
  const st = await loadState(env, ['tickers', 'ticks', 'names', 'candles', 'news', 'extra']); if (!st.tickers) return;
  const ev = (await env.DB.prepare('SELECT data FROM events WHERE first>?').bind(Date.now() - DAY).all()).results.map(x => JSON.parse(x.data));
  const br = buildBriefing(st, ev, analyse(st)); await kvPutStmt(env, 'briefing', br).run();
  const rows = (await env.DB.prepare('SELECT s.endpoint,s.user_id,s.p256dh,s.auth,p.settings,u.plan FROM push_subs s JOIN users u ON u.id=s.user_id LEFT JOIN prefs p ON p.user_id=s.user_id').all()).results;
  const b = budget(45); const ops = []; const logged = new Set(); const now = Date.now();
  for (const r of rows) { const st2 = { ...DEFAULT_SETTINGS, ...JSON.parse(r.settings || '{}') }; if (st2.briefing === false) continue; if (env.PREMIUM_ENFORCED === 'true' && r.plan !== 'premium') continue;
    if (!logged.has(r.user_id)) { logged.add(r.user_id); ops.push(env.DB.prepare('INSERT OR IGNORE INTO notif(id,user_id,title,body,url,cat,score,t) VALUES(?,?,?,?,?,?,?,?)').bind('brief:' + br.day, r.user_id, 'Ochtendbriefing · ' + br.day, br.headline, '/#briefing', 'briefing', null, now)); }
    if (!b.take()) continue; const res = await sendPush(env, r, { title: 'CSA ochtendbriefing', body: br.headline, url: '/#briefing', tag: 'briefing' }).catch(() => 'fail');
    if (res === 'gone') ops.push(env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(r.endpoint)); }
  if (ops.length) await env.DB.batch(ops);
}
async function daily(env) {
  const now = Date.now();
  await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(now), env.DB.prepare('DELETE FROM events WHERE first<?').bind(now - 7 * DAY), env.DB.prepare('DELETE FROM sent WHERE t<?').bind(now - 2 * DAY), env.DB.prepare('DELETE FROM attempts WHERE until<?').bind(now), env.DB.prepare('DELETE FROM paper_hist WHERE t<?').bind(now - 365 * DAY), env.DB.prepare("DELETE FROM paper_orders WHERE status<>'open' AND done<?").bind(now - 90 * DAY), env.DB.prepare('DELETE FROM notif WHERE t<?').bind(now - 30 * DAY)]);
  const t = await kvGet(env, 'tickers'); const top = (t?.val?.list || []).slice(0, 20).map(x => x.s);
  if (!top.length) return;
  try { const bt = await backtest(env, budget(45), top); await kvPutStmt(env, 'backtest', bt).run(); } catch (e) { console.error('backtest', e.message); }
}
export { STOCK_SYMS };
