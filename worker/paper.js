// Oefenhandel met virtueel geld: markt-, limiet- en stoporders, winst nemen / stop-loss (OCO),
// aandelen en crypto in euro, gerealiseerd resultaat en waardehistorie. Geen echte transacties.
import { json, err, readJSON, kvPutStmt, DAY, HOUR, MIN } from './lib.js';
import { lookupPrice, lookupStock, usdPerEur, cachedPx, budget, STOCK_ALL } from './market.js';

export const START = 10000, FEE = 0.0025;
const r2 = n => Math.round(n * 100) / 100;
const KIND = (sym, kind) => (kind === 'stock' && STOCK_ALL.includes(sym)) ? 'stock' : 'crypto';
const nl = n => n == null ? '—' : n.toLocaleString('nl-NL', { maximumFractionDigits: n < 1 ? 6 : 2, minimumFractionDigits: n < 1 ? 2 : 2 });

async function loadKV(env, keys) {
  const r = await env.DB.prepare(`SELECT key,val,ts FROM kv WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all();
  const st = {}; for (const row of r.results) st[row.key] = JSON.parse(row.val); return st;
}

/* koers in euro, voor een order nu: eerst wat de server heeft, anders direct opvragen */
export async function priceFor(env, sym, kind, st) {
  st = st || await loadKV(env, ['tickers', 'xquotes', 'stocks', 'fx']);
  const c = cachedPx(st, sym, kind, 10 * MIN); if (c) return c;
  const b = budget(12); let r;
  if (kind === 'stock') r = await lookupStock(env, sym, b, await usdPerEur(env, b, st));
  else r = await lookupPrice(env, sym, b, st.tickers?.usdt);
  if (r.p) { const k = kind === 'stock' ? 'S:' + sym : sym; st.xquotes = { ...(st.xquotes || {}), [k]: r }; await kvPutStmt(env, 'xquotes', st.xquotes).run(); }
  return r;
}

async function account(env, uid) {
  let a = await env.DB.prepare('SELECT cash,holdings,realized,fees,created FROM paper WHERE user_id=?').bind(uid).first();
  if (!a) { const now = Date.now(); a = { cash: START, holdings: '{}', realized: 0, fees: 0, created: now };
    await env.DB.batch([env.DB.prepare('INSERT INTO paper(user_id,cash,holdings,updated,realized,fees,created) VALUES(?,?,?,?,0,0,?) ON CONFLICT(user_id) DO NOTHING').bind(uid, START, '{}', now, now),
      env.DB.prepare('INSERT OR REPLACE INTO paper_hist(user_id,t,value) VALUES(?,?,?)').bind(uid, now, START)]); }
  return a;
}
function valueOf(H, st, override) {
  let v = 0; for (const [sym, h] of Object.entries(H)) { const p = override && override[sym] != null ? override[sym] : cachedPx(st, sym, h.k || 'crypto', 6 * HOUR)?.p; v += p != null ? p * h.qty : h.cost; } return v;
}

/* één transactie uitvoeren tegen koers q.p */
async function execTrade(env, uid, o, q, via, st) {
  const a = await account(env, uid); const H = JSON.parse(a.holdings || '{}'); const kind = o.kind || 'crypto';
  const h = H[o.sym] || { qty: 0, cost: 0, k: kind, t: Date.now() }; const price = q.p; let cash = a.cash, eur, qty, fee, pnl = null;
  if (!(price > 0)) throw new Error('Geen geldige koers.');
  if (o.side === 'buy') {
    eur = r2(o.eur != null ? o.eur : o.qty * price); if (!(eur >= 1)) throw new Error('Minimaal € 1.');
    fee = r2(eur * FEE); if (eur + fee > cash + 1e-9) throw new Error(`Onvoldoende virtueel saldo: je hebt ${nl(cash)} euro, nodig is ${nl(eur + fee)} euro inclusief 0,25% kosten.`);
    qty = eur / price; h.qty += qty; h.cost += eur + fee; h.k = kind; cash -= eur + fee; H[o.sym] = h;
  } else {
    if (!h.qty) throw new Error(`Je hebt geen ${o.sym} in je oefenportefeuille.`);
    qty = o.all ? h.qty : o.qty != null ? o.qty : o.eur / price; if (!(qty > 0)) throw new Error('Kies een bedrag of aantal.');
    if (qty > h.qty * (1 + 1e-6)) throw new Error(`Je hebt maar ${nl(h.qty)} ${o.sym}; dat is ${nl(h.qty * price)} euro.`);
    qty = Math.min(qty, h.qty); eur = r2(qty * price); fee = r2(eur * FEE); const basis = h.cost * (qty / h.qty); pnl = r2(eur - fee - basis);
    h.cost -= basis; h.qty -= qty; cash += eur - fee; if (h.qty < 1e-12 || h.qty * price < 0.005) delete H[o.sym]; else H[o.sym] = h;
  }
  const now = Date.now(); const realized = (a.realized || 0) + (pnl || 0), fees = (a.fees || 0) + fee;
  const value = cash + valueOf(H, st || {}, { [o.sym]: price });
  await env.DB.batch([
    env.DB.prepare('UPDATE paper SET cash=?,holdings=?,updated=?,realized=?,fees=? WHERE user_id=?').bind(cash, JSON.stringify(H), now, realized, fees, uid),
    env.DB.prepare('INSERT INTO paper_trades(user_id,sym,side,eur,qty,price,t,kind,fee,pnl,src,via) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(uid, o.sym, o.side, eur, qty, price, now, kind, fee, pnl, q.src || null, via),
    env.DB.prepare('INSERT OR REPLACE INTO paper_hist(user_id,t,value) VALUES(?,?,?)').bind(uid, now, r2(value)),
  ]);
  return { sym: o.sym, kind, side: o.side, eur, qty, price, fee, pnl, src: q.src || null, via, t: now };
}

async function snapshot(env, uid, extra = {}) {
  const st = await loadKV(env, ['tickers', 'xquotes', 'stocks', 'fx']);
  const a = await account(env, uid); const H = JSON.parse(a.holdings || '{}');
  const px = {}; for (const [sym, h] of Object.entries(H)) { const q = cachedPx(st, sym, h.k || 'crypto', 6 * HOUR); if (q) px[sym] = { p: q.p, o: q.o ?? null, src: q.src, u: q.u, native: q.native ?? null, cur: q.cur || 'EUR' }; }
  const [tr, od, hi] = await env.DB.batch([
    env.DB.prepare('SELECT id,sym,kind,side,eur,qty,price,t,fee,pnl,src,via FROM paper_trades WHERE user_id=? ORDER BY t DESC LIMIT 300').bind(uid),
    env.DB.prepare("SELECT id,sym,kind,type,side,eur,qty,allq,lvl,oco,status,created,done,price,note FROM paper_orders WHERE user_id=? AND (status='open' OR created>?) ORDER BY created DESC LIMIT 80").bind(uid, Date.now() - 30 * DAY),
    env.DB.prepare('SELECT t,value FROM paper_hist WHERE user_id=? ORDER BY t DESC LIMIT 720').bind(uid),
  ]);
  return { start: START, fee: FEE, cash: a.cash, holdings: H, realized: a.realized || 0, fees: a.fees || 0, created: a.created || null, px,
    trades: tr.results, orders: od.results, hist: hi.results.reverse(), ...extra };
}

/* ---------- API ---------- */
export async function handlePaper(req, env, s, p, m, url) {
  const uid = s.user_id;
  if (p === '/api/paper' && m === 'GET') return json(await snapshot(env, uid));
  if (p === '/api/paper/reset' && m === 'POST') { const now = Date.now();
    await env.DB.batch([env.DB.prepare('INSERT INTO paper(user_id,cash,holdings,updated,realized,fees,created) VALUES(?,?,?,?,0,0,?) ON CONFLICT(user_id) DO UPDATE SET cash=excluded.cash,holdings=excluded.holdings,updated=excluded.updated,realized=0,fees=0,created=excluded.created').bind(uid, START, '{}', now, now),
      env.DB.prepare('DELETE FROM paper_trades WHERE user_id=?').bind(uid), env.DB.prepare('DELETE FROM paper_orders WHERE user_id=?').bind(uid), env.DB.prepare('DELETE FROM paper_hist WHERE user_id=?').bind(uid),
      env.DB.prepare('INSERT INTO paper_hist(user_id,t,value) VALUES(?,?,?)').bind(uid, now, START)]);
    return json(await snapshot(env, uid)); }
  if (p === '/api/paper/order' && m === 'POST') {
    const b = await readJSON(req); const sym = String(b.sym || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); if (!sym) return err(400, 'Kies een asset.');
    const kind = KIND(sym, b.kind); const side = b.side === 'sell' ? 'sell' : 'buy'; const type = ['limit', 'stop'].includes(b.type) ? b.type : 'market';
    const eur = b.eur != null && b.eur !== '' ? r2(+b.eur) : null; const qty = b.qty != null && b.qty !== '' ? +b.qty : null; const all = side === 'sell' && !!b.all;
    if (!all && !(eur > 0) && !(qty > 0)) return err(400, 'Vul een bedrag of aantal in.');
    if (side === 'buy' && eur != null && eur < 1) return err(400, 'Minimaal € 1.');
    const q = await priceFor(env, sym, kind);
    if (type === 'market') {
      if (!q.p) return err(409, `Geen actuele koers voor ${sym} gevonden${kind === 'stock' ? ' (Yahoo Finance / Stooq)' : ' bij Bitvavo, Kraken, Gate, MEXC of OKX'}. Probeer het over een paar minuten opnieuw.`);
      let t; try { t = await execTrade(env, uid, { sym, kind, side, eur, qty, all }, q, 'market'); } catch (e) { return err(400, e.message); }
      const made = [];
      if (side === 'buy') { const tp = +b.tp || null, sl = +b.sl || null;
        if (tp && tp <= t.price) made.push('Winst nemen-niveau lag niet boven de aankoopkoers en is overgeslagen.');
        if (sl && sl >= t.price) made.push('Stop-loss-niveau lag niet onder de aankoopkoers en is overgeslagen.');
        const legs = []; if (tp && tp > t.price) legs.push(['limit', tp]); if (sl && sl < t.price) legs.push(['stop', sl]);
        let oco = null; for (const [ty, lvl] of legs) { const r = await env.DB.prepare('INSERT INTO paper_orders(user_id,sym,kind,type,side,qty,lvl,oco,created,note) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(uid, sym, kind, ty, 'sell', t.qty, lvl, oco, Date.now(), ty === 'limit' ? 'Winst nemen' : 'Stop-loss').run();
          if (legs.length > 1 && oco == null) { oco = r.meta.last_row_id; await env.DB.prepare('UPDATE paper_orders SET oco=? WHERE id=?').bind(oco, oco).run(); } } }
      return json(await snapshot(env, uid, { last: t, notes: made }));
    }
    const lvl = +b.lvl; if (!(lvl > 0)) return err(400, 'Vul de koers in waarop de order moet worden uitgevoerd.');
    const n = await env.DB.prepare("SELECT COUNT(*) n FROM paper_orders WHERE user_id=? AND status='open'").bind(uid).first(); if (n.n >= 40) return err(400, 'Maximaal 40 open orders.');
    if (side === 'sell') { const a = await account(env, uid); const h = JSON.parse(a.holdings || '{}')[sym]; if (!h) return err(400, `Je hebt geen ${sym} om te verkopen.`); }
    if (q.p && type === 'stop' && (side === 'sell' ? q.p <= lvl : q.p >= lvl)) return err(400, `De koers (${nl(q.p)} euro) staat al ${side === 'sell' ? 'onder' : 'boven'} dit stopniveau. Kies een ander niveau of plaats een marktorder.`);
    if (q.p && type === 'limit' && (side === 'buy' ? q.p <= lvl : q.p >= lvl)) { // meteen uitvoerbaar: tegen de (betere) marktkoers
      try { const t = await execTrade(env, uid, { sym, kind, side, eur, qty, all }, q, 'limit'); return json(await snapshot(env, uid, { last: t, notes: ['De limiet was meteen haalbaar, dus de order is direct uitgevoerd tegen de marktkoers.'] })); } catch (e) { return err(400, e.message); } }
    await env.DB.prepare('INSERT INTO paper_orders(user_id,sym,kind,type,side,eur,qty,allq,lvl,created,note) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(uid, sym, kind, type, side, eur, qty, all ? 1 : 0, lvl, Date.now(), String(b.note || '').slice(0, 60) || null).run();
    return json(await snapshot(env, uid, { placed: { sym, type, side, lvl }, notes: [q.p ? null : 'De server heeft nu geen koers voor deze asset; de order wordt gecontroleerd zodra die er is.'].filter(Boolean) }));
  }
  const om = p.match(/^\/api\/paper\/orders\/(\d+)$/);
  if (om && m === 'DELETE') { await env.DB.prepare("UPDATE paper_orders SET status='cancelled',done=? WHERE id=? AND user_id=? AND status='open'").bind(Date.now(), +om[1], uid).run(); return json(await snapshot(env, uid)); }
  if (p === '/api/quote' && m === 'GET') { const sym = String(url.searchParams.get('sym') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); const kind = KIND(sym, url.searchParams.get('kind'));
    const q = await priceFor(env, sym, kind); return q.p ? json({ sym, kind, p: q.p, o: q.o ?? null, h: q.h ?? null, l: q.l ?? null, native: q.native ?? null, cur: q.cur || 'EUR', src: q.src, u: q.u, ts: q.ts || q.u }) : err(404, 'Geen koers gevonden.', { tried: q.tried }); }
  return null;
}

/* ---------- cron: open orders uitvoeren, waardehistorie bijhouden ---------- */
export async function paperCron(env, st, status) {
  const now = Date.now(); const msgs = {}; const add = (uid, msg) => (msgs[uid] = msgs[uid] || []).push(msg);
  const rows = (await env.DB.prepare("SELECT * FROM paper_orders WHERE status='open' ORDER BY created").all()).results;
  const skip = new Set(); let filled = 0, checked = 0;
  for (const o of rows) { if (skip.has(o.id) || filled >= 10) continue; const q = cachedPx(st, o.sym, o.kind); if (!q) continue; checked++;
    const hit = o.type === 'limit' ? (o.side === 'buy' ? q.p <= o.lvl : q.p >= o.lvl) : (o.side === 'buy' ? q.p >= o.lvl : q.p <= o.lvl); if (!hit) continue;
    try { const t = await execTrade(env, o.user_id, { sym: o.sym, kind: o.kind, side: o.side, eur: o.eur, qty: o.qty, all: !!o.allq }, q, o.note === 'Stop-loss' ? 'stop-loss' : o.note === 'Winst nemen' ? 'take-profit' : o.type, st); filled++;
      const ops = [env.DB.prepare("UPDATE paper_orders SET status='filled',done=?,price=? WHERE id=?").bind(now, t.price, o.id)];
      if (o.oco) { ops.push(env.DB.prepare("UPDATE paper_orders SET status='cancelled',done=?,note=COALESCE(note,'')||' · vervallen (andere order uitgevoerd)' WHERE oco=? AND id<>? AND status='open'").bind(now, o.oco, o.id)); rows.filter(x => x.oco === o.oco).forEach(x => skip.add(x.id)); }
      await env.DB.batch(ops);
      const what = o.note === 'Stop-loss' ? 'Stop-loss geraakt' : o.note === 'Winst nemen' ? 'Winst genomen' : (o.type === 'limit' ? 'Limietorder' : 'Stoporder') + ' uitgevoerd';
      add(o.user_id, { key: 'order:' + o.id, tag: 'order-' + o.id, cat: 'order', force: true, url: '/#handel', title: `${what}: ${o.side === 'buy' ? 'koop' : 'verkoop'} ${o.sym}`,
        body: `${nl(t.qty)} ${o.sym} tegen ${nl(t.price)} euro (${nl(t.eur)} euro)${t.pnl != null ? ` · resultaat ${t.pnl >= 0 ? '+' : '−'}${nl(Math.abs(t.pnl))} euro` : ''} · oefengeld` });
    } catch (e) { await env.DB.prepare("UPDATE paper_orders SET status='failed',done=?,note=? WHERE id=?").bind(now, String(e.message).slice(0, 160), o.id).run();
      add(o.user_id, { key: 'orderfail:' + o.id, tag: 'order-' + o.id, cat: 'order', force: true, url: '/#handel', title: `Order ${o.sym} niet uitgevoerd`, body: e.message }); }
  }
  // elk uur een waardepunt per oefenportefeuille
  let hist = 0;
  if (!st.phT || now - st.phT > HOUR - 2 * MIN) {
    const acc = (await env.DB.prepare('SELECT user_id,cash,holdings FROM paper').all()).results; const t = Math.floor(now / HOUR) * HOUR; const ops = [];
    for (const a of acc) { const H = JSON.parse(a.holdings || '{}'); if (!Object.keys(H).length) continue; ops.push(env.DB.prepare('INSERT OR REPLACE INTO paper_hist(user_id,t,value) VALUES(?,?,?)').bind(a.user_id, t, r2(a.cash + valueOf(H, st)))); }
    if (ops.length) await env.DB.batch(ops.slice(0, 40)); hist = ops.length; await kvPutStmt(env, 'phT', now).run();
  }
  status.orders = { ok: true, open: rows.length, checked, filled, hist };
  return msgs;
}
export async function paperNeed(env) { // welke koersen de cron apart moet bijhouden
  const [al, pa, po] = await env.DB.batch([env.DB.prepare('SELECT DISTINCT sym FROM price_alerts WHERE active=1'), env.DB.prepare('SELECT holdings FROM paper'), env.DB.prepare("SELECT DISTINCT sym,kind FROM paper_orders WHERE status='open'")]);
  const need = new Set(al.results.map(r => r.sym));
  for (const r of pa.results) for (const [k, h] of Object.entries(JSON.parse(r.holdings || '{}'))) need.add(h.k === 'stock' ? 'S:' + k : k);
  for (const r of po.results) need.add(r.kind === 'stock' ? 'S:' + r.sym : r.sym);
  return need;
}
