// Ronde 4/5: beheerpagina, white-label huisstijl en widgetgegevens.
import { json, err, readJSON, kvPutStmt, DAY, HOUR } from './lib.js';
import { quote } from './market.js';

export const isAdmin = (env, s) => !!s && String(env.ADMIN_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean).includes(String(s.email || '').toLowerCase());
const BRAND_DEFAULT = { name: 'Vantis', short: 'Vantis', tagline: 'Crypto Intelligence', navy: '#17243A', accent: '#17243A', logo: null, support: 'info@rijnstadmarketing.nl', footer: null };
async function kv(env, keys) { const r = await env.DB.prepare(`SELECT key,val,ts FROM kv WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all(); const o = {}; for (const x of r.results) { o[x.key] = JSON.parse(x.val); o[x.key + 'Ts'] = x.ts; } return o; }
const cleanHost = h => String(h || '').toLowerCase().replace(/[^a-z0-9.-]/g, '').slice(0, 100);
const hex = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v : null;

export async function brandFor(env, host) { const h = cleanHost(host); const st = await kv(env, ['brand', 'brand:' + h]); return { ...BRAND_DEFAULT, ...(st.brand || {}), ...(st['brand:' + h] || {}), host: h }; }

export async function adminApi(req, env, s, p, m, url) {
  if (p === '/api/brand' && m === 'GET') return json(await brandFor(env, url.searchParams.get('host') || url.hostname));
  if (p === '/api/widget' && m === 'GET') { // marktgegevens voor widgets; met ?key= ook je oefenportefeuille
    const st = await kv(env, ['tickers', 'xquotes', 'names', 'ticks']); const q = s2 => { const x = quote(st, s2); return x ? { sym: s2, name: x.name, p: x.p, ch24: x.ch24 } : null; };
    const syms = String(url.searchParams.get('syms') || 'BTC,ETH,SOL').toUpperCase().split(',').map(x => x.replace(/[^A-Z0-9]/g, '')).filter(Boolean).slice(0, 6);
    const out = { t: Date.now(), prices: syms.map(q).filter(Boolean) }; const key = url.searchParams.get('key');
    if (key) { const k = await env.DB.prepare('SELECT user_id FROM widget_keys WHERE key=?').bind(key).first(); if (k) { const a = await env.DB.prepare('SELECT cash,holdings FROM paper WHERE user_id=?').bind(k.user_id).first();
      if (a) { const H = JSON.parse(a.holdings || '{}'); let v = a.cash; for (const [sy, h] of Object.entries(H)) { const x = quote(st, sy); v += x ? x.p * h.qty : h.cost; } out.paper = { value: Math.round(v * 100) / 100, ret: (v / 10000 - 1) * 100, positions: Object.keys(H).length }; } } }
    if (url.searchParams.get('fmt') === 'card') { const f = n => n == null ? '—' : Number(n).toLocaleString('nl-NL', { minimumFractionDigits: n >= 1 ? 2 : 4, maximumFractionDigits: n >= 1 ? 2 : 6 }); const pc = n => n == null ? '' : (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toLocaleString('nl-NL', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + '%';
      return json({ title: 'Vantis', rows: out.prices.map(x => ({ name: x.sym, price: '€ ' + f(x.p), ch: pc(x.ch24), color: (x.ch24 || 0) >= 0 ? 'good' : 'attention' })), paper: out.paper ? `Oefenportefeuille € ${f(out.paper.value)} (${pc(out.paper.ret)})` : '', updated: new Date().toLocaleTimeString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' }) }, 200, { 'access-control-allow-origin': '*' }); }
    return json(out, 200, { 'cache-control': 'public, max-age=60', 'access-control-allow-origin': '*' }); }
  if (!s) return null;
  if (p === '/api/widget/key' && m === 'POST') { const key = [...crypto.getRandomValues(new Uint8Array(18))].map(b => b.toString(16).padStart(2, '0')).join('');
    await env.DB.batch([env.DB.prepare('DELETE FROM widget_keys WHERE user_id=?').bind(s.user_id), env.DB.prepare('INSERT INTO widget_keys(key,user_id,created) VALUES(?,?,?)').bind(key, s.user_id, Date.now())]); return json({ key }); }
  if (p === '/api/widget/key' && m === 'DELETE') { await env.DB.prepare('DELETE FROM widget_keys WHERE user_id=?').bind(s.user_id).run(); return json({ ok: true }); }
  if (!p.startsWith('/api/admin/')) return null;
  if (!isAdmin(env, s)) return err(403, 'Alleen voor beheerders.');
  if (p === '/api/admin/stats' && m === 'GET') { const now = Date.now();
    const q1 = sql => env.DB.prepare(sql);
    const [tot, plans, new30, act1, act7, subs, tg, paper, trades, alerts, orders, dca, perDay] = await env.DB.batch([
      q1('SELECT COUNT(*) n FROM users'), q1('SELECT plan, COUNT(*) n FROM users GROUP BY plan'), q1('SELECT COUNT(*) n FROM users WHERE created>?').bind(now - 30 * DAY),
      q1('SELECT COUNT(*) n FROM users WHERE last_seen>?').bind(now - DAY), q1('SELECT COUNT(*) n FROM users WHERE last_seen>?').bind(now - 7 * DAY),
      q1('SELECT COUNT(*) n FROM push_subs'), q1('SELECT COUNT(*) n FROM dc_links'), q1('SELECT COUNT(*) n FROM paper'), q1('SELECT COUNT(*) n FROM paper_trades WHERE t>?').bind(now - 30 * DAY),
      q1('SELECT COUNT(*) n FROM price_alerts WHERE active=1'), q1("SELECT COUNT(*) n FROM paper_orders WHERE status='open'"), q1('SELECT COUNT(*) n FROM paper_dca WHERE active=1'),
      q1("SELECT (created/86400000) d, COUNT(*) n FROM users WHERE created>? GROUP BY d ORDER BY d").bind(now - 30 * DAY)]);
    const st = await kv(env, ['scanstatus', 'mailstatus', 'tickers', 'unlocks']);
    return json({ users: tot.results[0].n, plans: Object.fromEntries(plans.results.map(r => [r.plan, r.n])), new30: new30.results[0].n, active1: act1.results[0].n, active7: act7.results[0].n,
      push: subs.results[0].n, discord: tg.results[0].n, paper: paper.results[0].n, trades30: trades.results[0].n, alerts: alerts.results[0].n, orders: orders.results[0].n, dca: dca.results[0].n,
      signups: perDay.results.map(r => [r.d * DAY, r.n]), scan: st.scanstatus || null, mail: st.mailstatus || null, prices: st.tickers ? { src: st.tickers.src, n: st.tickers.list.length, t: st.tickers.t } : null, unlocks: st.unlocks ? { n: st.unlocks.events.length, t: st.unlocks.t } : null,
      config: { stripe: !!env.STRIPE_SECRET_KEY, discord: !!(env.DISCORD_BOT_TOKEN && env.DISCORD_APP_ID), mail: !!(env.RESEND_API_KEY && env.MAIL_FROM), finnhub: !!env.FINNHUB_KEY, premiumEnforced: env.PREMIUM_ENFORCED === 'true' } }); }
  if (p === '/api/admin/users' && m === 'GET') { const q = '%' + String(url.searchParams.get('q') || '').toLowerCase().replace(/[%_]/g, '') + '%';
    const r = await env.DB.prepare('SELECT u.id,u.email,u.name,u.plan,u.created,u.last_seen,(SELECT COUNT(*) FROM paper_trades t WHERE t.user_id=u.id) trades,(SELECT COUNT(*) FROM push_subs ps WHERE ps.user_id=u.id) devices FROM users u WHERE lower(u.email) LIKE ? OR lower(u.name) LIKE ? ORDER BY u.created DESC LIMIT 100').bind(q, q).all();
    return json({ users: r.results }); }
  const um = p.match(/^\/api\/admin\/users\/([\w-]+)$/);
  if (um && m === 'PUT') { const b = await readJSON(req); if (!['free', 'premium', 'pro'].includes(b.plan)) return err(400, 'Onbekend abonnement.'); await env.DB.prepare('UPDATE users SET plan=? WHERE id=?').bind(b.plan, um[1]).run(); return json({ ok: true }); }
  if (p === '/api/admin/brand' && m === 'GET') { const r = await env.DB.prepare("SELECT key,val FROM kv WHERE key='brand' OR key LIKE 'brand:%'").all(); return json({ default: BRAND_DEFAULT, brands: r.results.map(x => ({ host: x.key === 'brand' ? '' : x.key.slice(6), ...JSON.parse(x.val) })) }); }
  if (p === '/api/admin/brand' && m === 'PUT') { const b = await readJSON(req, 256 * 1024); const host = cleanHost(b.host); const key = host ? 'brand:' + host : 'brand';
    if (b.remove) { await env.DB.prepare('DELETE FROM kv WHERE key=?').bind(key).run(); return json({ ok: true }); }
    const logo = typeof b.logo === 'string' && (b.logo.startsWith('data:image/') || /^https:\/\//.test(b.logo)) && b.logo.length < 200000 ? b.logo : null;
    const v = { name: String(b.name || '').slice(0, 40) || BRAND_DEFAULT.name, short: String(b.short || '').slice(0, 8) || BRAND_DEFAULT.short, tagline: String(b.tagline || '').slice(0, 60), navy: hex(b.navy) || BRAND_DEFAULT.navy, accent: hex(b.accent) || hex(b.navy) || BRAND_DEFAULT.accent, logo, support: String(b.support || '').slice(0, 80), footer: String(b.footer || '').slice(0, 300) || null };
    await kvPutStmt(env, key, v).run(); return json({ ok: true, brand: v }); }
  return null;
}
