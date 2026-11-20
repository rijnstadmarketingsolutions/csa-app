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

async function account(env, uid, st) {
  let a = await env.DB.prepare('SELECT cash,holdings,realized,fees,created,board,nick FROM paper WHERE user_id=?').bind(uid).first();
  if (!a) { const now = Date.now(); a = { cash: START, holdings: '{}', realized: 0, fees: 0, created: now, board: 0, nick: null }; st = st || await loadKV(env, ['tickers', 'xquotes', 'stocks', 'fx']);
    await env.DB.batch([env.DB.prepare('INSERT INTO paper(user_id,cash,holdings,updated,realized,fees,created) VALUES(?,?,?,?,0,0,?) ON CONFLICT(user_id) DO NOTHING').bind(uid, START, '{}', now, now), histStmt(env, uid, now, START, st)]); }
  return a;
}
const bench = st => ({ btc: cachedPx(st || {}, 'BTC', 'crypto', 6 * HOUR)?.p ?? null, spy: cachedPx(st || {}, 'SPY', 'stock', 6 * HOUR)?.p ?? null });
const histStmt = (env, uid, t, value, st) => { const b = bench(st); return env.DB.prepare('INSERT OR REPLACE INTO paper_hist(user_id,t,value,btc,spy) VALUES(?,?,?,?,?)').bind(uid, t, value, b.btc, b.spy); };
function valueOf(H, st, override) {
  let v = 0; for (const [sym, h] of Object.entries(H)) { const p = override && override[sym] != null ? override[sym] : cachedPx(st, sym, h.k || 'crypto', 6 * HOUR)?.p; v += p != null ? p * h.qty : h.cost; } return v;
}

/* één transactie uitvoeren tegen koers q.p */
async function execTrade(env, uid, o, q, via, st) {
  st = st || await loadKV(env, ['tickers', 'xquotes', 'stocks', 'fx']); const a = await account(env, uid, st); const H = JSON.parse(a.holdings || '{}'); const kind = o.kind || 'crypto';
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
    env.DB.prepare('INSERT INTO paper_trades(user_id,sym,side,eur,qty,price,t,kind,fee,pnl,src,via,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(uid, o.sym, o.side, eur, qty, price, now, kind, fee, pnl, q.src || null, via, o.note ? String(o.note).slice(0, 280) : null),
    histStmt(env, uid, now, r2(value), st),
  ]);
  return { sym: o.sym, kind, side: o.side, eur, qty, price, fee, pnl, src: q.src || null, via, t: now, note: o.note || null };
}

async function snapshot(env, uid, extra = {}) {
  const st = await loadKV(env, ['tickers', 'xquotes', 'stocks', 'fx']);
  const a = await account(env, uid, st); const H = JSON.parse(a.holdings || '{}');
  const px = {}; for (const [sym, h] of Object.entries(H)) { const q = cachedPx(st, sym, h.k || 'crypto', 6 * HOUR); if (q) px[sym] = { p: q.p, o: q.o ?? null, src: q.src, u: q.u, native: q.native ?? null, cur: q.cur || 'EUR' }; }
  const [tr, od, hi, dc] = await env.DB.batch([
    env.DB.prepare('SELECT id,sym,kind,side,eur,qty,price,t,fee,pnl,src,via,note FROM paper_trades WHERE user_id=? ORDER BY t DESC LIMIT 300').bind(uid),
    env.DB.prepare("SELECT id,sym,kind,type,side,eur,qty,allq,lvl,oco,status,created,done,price,note,trail,peak FROM paper_orders WHERE user_id=? AND (status='open' OR created>?) ORDER BY created DESC LIMIT 80").bind(uid, Date.now() - 30 * DAY),
    env.DB.prepare('SELECT t,value,btc,spy FROM paper_hist WHERE user_id=? ORDER BY t DESC LIMIT 720').bind(uid),
    env.DB.prepare('SELECT id,sym,kind,eur,every,next,active,created,last,runs,note FROM paper_dca WHERE user_id=? ORDER BY created DESC').bind(uid),
  ]);
  const bn = bench(st); if (!px.BTC && bn.btc) px.BTC = { p: bn.btc, src: 'bench' };
  return { start: START, fee: FEE, cash: a.cash, holdings: H, realized: a.realized || 0, fees: a.fees || 0, created: a.created || null, px, board: !!a.board, nick: a.nick || null, bench: bn,
    trades: tr.results, orders: od.results, hist: hi.results.reverse(), dca: dc.results, ...extra };
}

/* ---------- API ---------- */
export async function handlePaper(req, env, s, p, m, url) {
  const uid = s.user_id;
  if (p === '/api/paper' && m === 'GET') return json(await snapshot(env, uid));
  if (p === '/api/paper/reset' && m === 'POST') { const now = Date.now();
    await env.DB.batch([env.DB.prepare('INSERT INTO paper(user_id,cash,holdings,updated,realized,fees,created) VALUES(?,?,?,?,0,0,?) ON CONFLICT(user_id) DO UPDATE SET cash=excluded.cash,holdings=excluded.holdings,updated=excluded.updated,realized=0,fees=0,created=excluded.created').bind(uid, START, '{}', now, now),
      env.DB.prepare('DELETE FROM paper_trades WHERE user_id=?').bind(uid), env.DB.prepare('DELETE FROM paper_orders WHERE user_id=?').bind(uid), env.DB.prepare('DELETE FROM paper_hist WHERE user_id=?').bind(uid), env.DB.prepare('DELETE FROM paper_dca WHERE user_id=?').bind(uid),
      histStmt(env, uid, now, START, await loadKV(env, ['tickers', 'xquotes', 'stocks', 'fx']))]);
    return json(await snapshot(env, uid)); }
  if (p === '/api/paper/order' && m === 'POST') {
    const b = await readJSON(req); const sym = String(b.sym || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); if (!sym) return err(400, 'Kies een asset.');
    const kind = KIND(sym, b.kind); const side = b.side === 'sell' ? 'sell' : 'buy'; const type = ['limit', 'stop', 'trail'].includes(b.type) ? b.type : 'market'; const note = b.note ? String(b.note).slice(0, 280) : null;
    if (type === 'trail' && side !== 'sell') return err(400, 'Een trailing stop is er alleen om te verkopen.');
    const eur = b.eur != null && b.eur !== '' ? r2(+b.eur) : null; const qty = b.qty != null && b.qty !== '' ? +b.qty : null; const all = side === 'sell' && !!b.all;
    if (!all && !(eur > 0) && !(qty > 0)) return err(400, 'Vul een bedrag of aantal in.');
    if (side === 'buy' && eur != null && eur < 1) return err(400, 'Minimaal € 1.');
    const q = await priceFor(env, sym, kind);
    if (type === 'market') {
      if (!q.p) return err(409, `Geen actuele koers voor ${sym} gevonden${kind === 'stock' ? ' (Yahoo Finance / Stooq)' : ' bij Bitvavo, Kraken, Gate, MEXC of OKX'}. Probeer het over een paar minuten opnieuw.`);
      let t; try { t = await execTrade(env, uid, { sym, kind, side, eur, qty, all, note }, q, 'market'); } catch (e) { return err(400, e.message); }
      const made = [];
      if (side === 'buy') { const tp = +b.tp || null, sl = +b.sl || null;
        if (tp && tp <= t.price) made.push('Winst nemen-niveau lag niet boven de aankoopkoers en is overgeslagen.');
        if (sl && sl >= t.price) made.push('Stop-loss-niveau lag niet onder de aankoopkoers en is overgeslagen.');
        const legs = []; if (tp && tp > t.price) legs.push(['limit', tp]); if (sl && sl < t.price) legs.push(['stop', sl]);
        let oco = null; for (const [ty, lvl] of legs) { const r = await env.DB.prepare('INSERT INTO paper_orders(user_id,sym,kind,type,side,qty,lvl,oco,created,note) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(uid, sym, kind, ty, 'sell', t.qty, lvl, oco, Date.now(), ty === 'limit' ? 'Winst nemen' : 'Stop-loss').run();
          if (legs.length > 1 && oco == null) { oco = r.meta.last_row_id; await env.DB.prepare('UPDATE paper_orders SET oco=? WHERE id=?').bind(oco, oco).run(); } } }
      return json(await snapshot(env, uid, { last: t, notes: made }));
    }
    if (type === 'trail') { const tr = +b.trail; if (!(tr >= 0.5 && tr <= 50)) return err(400, 'Kies een afstand tussen 0,5% en 50%.'); if (!q.p) return err(409, 'Geen actuele koers; probeer het zo opnieuw.');
      const a = await account(env, uid); if (!JSON.parse(a.holdings || '{}')[sym]) return err(400, `Je hebt geen ${sym} om te verkopen.`);
      await env.DB.prepare('INSERT INTO paper_orders(user_id,sym,kind,type,side,eur,qty,allq,lvl,created,note,trail,peak) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(uid, sym, kind, 'trail', 'sell', eur, qty, all ? 1 : 0, q.p * (1 - tr / 100), Date.now(), 'Trailing stop', tr, q.p).run();
      return json(await snapshot(env, uid, { placed: { sym, type, side, lvl: q.p * (1 - tr / 100), trail: tr } })); }
    const lvl = +b.lvl; if (!(lvl > 0)) return err(400, 'Vul de koers in waarop de order moet worden uitgevoerd.');
    const n = await env.DB.prepare("SELECT COUNT(*) n FROM paper_orders WHERE user_id=? AND status='open'").bind(uid).first(); if (n.n >= 40) return err(400, 'Maximaal 40 open orders.');
    if (side === 'sell') { const a = await account(env, uid); const h = JSON.parse(a.holdings || '{}')[sym]; if (!h) return err(400, `Je hebt geen ${sym} om te verkopen.`); }
    if (q.p && type === 'stop' && (side === 'sell' ? q.p <= lvl : q.p >= lvl)) return err(400, `De koers (${nl(q.p)} euro) staat al ${side === 'sell' ? 'onder' : 'boven'} dit stopniveau. Kies een ander niveau of plaats een marktorder.`);
    if (q.p && type === 'limit' && (side === 'buy' ? q.p <= lvl : q.p >= lvl)) { // meteen uitvoerbaar: tegen de (betere) marktkoers
      try { const t = await execTrade(env, uid, { sym, kind, side, eur, qty, all, note }, q, 'limit'); return json(await snapshot(env, uid, { last: t, notes: ['De limiet was meteen haalbaar, dus de order is direct uitgevoerd tegen de marktkoers.'] })); } catch (e) { return err(400, e.message); } }
    await env.DB.prepare('INSERT INTO paper_orders(user_id,sym,kind,type,side,eur,qty,allq,lvl,created,note) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(uid, sym, kind, type, side, eur, qty, all ? 1 : 0, lvl, Date.now(), note).run();
    return json(await snapshot(env, uid, { placed: { sym, type, side, lvl }, notes: [q.p ? null : 'De server heeft nu geen koers voor deze asset; de order wordt gecontroleerd zodra die er is.'].filter(Boolean) }));
  }
  const tm = p.match(/^\/api\/paper\/trades\/(\d+)$/);
  if (tm && m === 'PUT') { const b = await readJSON(req); await env.DB.prepare('UPDATE paper_trades SET note=? WHERE id=? AND user_id=?').bind(String(b.note || '').slice(0, 280) || null, +tm[1], uid).run(); return json(await snapshot(env, uid)); }
  if (p === '/api/paper/dca' && m === 'POST') { const b = await readJSON(req); const sym = String(b.sym || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); const kind = KIND(sym, b.kind); const eur = r2(+b.eur); const every = ['day', 'week', 'month'].includes(b.every) ? b.every : 'week';
    if (!sym || !(eur >= 5)) return err(400, 'Kies een asset en een bedrag van minimaal € 5.'); const n = await env.DB.prepare('SELECT COUNT(*) n FROM paper_dca WHERE user_id=? AND active=1').bind(uid).first(); if (n.n >= 20) return err(400, 'Maximaal 20 actieve plannen.');
    const start = +b.start > Date.now() ? +b.start : Date.now(); await env.DB.prepare('INSERT INTO paper_dca(user_id,sym,kind,eur,every,next,created,note) VALUES(?,?,?,?,?,?,?,?)').bind(uid, sym, kind, eur, every, start, Date.now(), b.note ? String(b.note).slice(0, 80) : null).run();
    return json(await snapshot(env, uid, { notes: [start <= Date.now() + MIN ? 'De eerste aankoop gebeurt in de volgende scanronde (binnen 5 minuten).' : null].filter(Boolean) })); }
  const dm = p.match(/^\/api\/paper\/dca\/(\d+)$/);
  if (dm && m === 'DELETE') { await env.DB.prepare('DELETE FROM paper_dca WHERE id=? AND user_id=?').bind(+dm[1], uid).run(); return json(await snapshot(env, uid)); }
  if (dm && m === 'PUT') { const b = await readJSON(req); await env.DB.prepare('UPDATE paper_dca SET active=?, next=CASE WHEN ?=1 AND next<? THEN ? ELSE next END WHERE id=? AND user_id=?').bind(b.active ? 1 : 0, b.active ? 1 : 0, Date.now(), Date.now(), +dm[1], uid).run(); return json(await snapshot(env, uid)); }
  if (p === '/api/paper/board' && m === 'POST') { const b = await readJSON(req); const nick = String(b.nick || '').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 24);
    if (b.on && nick.length < 2) return err(400, 'Kies een schermnaam van minimaal 2 tekens.'); await account(env, uid);
    if (b.on) { const taken = await env.DB.prepare('SELECT user_id FROM paper WHERE board=1 AND lower(nick)=lower(?) AND user_id<>?').bind(nick, uid).first(); if (taken) return err(400, 'Deze schermnaam is al in gebruik.'); }
    await env.DB.prepare('UPDATE paper SET board=?, nick=COALESCE(?,nick) WHERE user_id=?').bind(b.on ? 1 : 0, nick || null, uid).run(); return json(await snapshot(env, uid)); }
  if (p === '/api/board' && m === 'GET') { const st = await loadKV(env, ['tickers', 'xquotes', 'stocks', 'fx']); const now = new Date(); const ms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const [rows, firsts] = await env.DB.batch([env.DB.prepare('SELECT user_id,cash,holdings,nick,created FROM paper WHERE board=1 LIMIT 200'), env.DB.prepare('SELECT h.user_id,h.value FROM paper_hist h JOIN paper p ON p.user_id=h.user_id AND p.board=1 WHERE h.t=(SELECT MIN(t) FROM paper_hist x WHERE x.user_id=h.user_id AND x.t>=?)').bind(ms)]);
    const first = Object.fromEntries(firsts.results.map(r => [r.user_id, r.value]));
    const L = rows.results.map(r => { const H = JSON.parse(r.holdings || '{}'); const v = r.cash + valueOf(H, st); const m0 = first[r.user_id] || START; return { nick: r.nick, me: r.user_id === uid, value: r2(v), ret: (v / START - 1) * 100, month: (v / m0 - 1) * 100, pos: Object.keys(H).length, since: r.created }; });
    return json({ all: L.slice().sort((a, b) => b.ret - a.ret), month: L.slice().sort((a, b) => b.month - a.month), monthStart: ms }); }
  const om = p.match(/^\/api\/paper\/orders\/(\d+)$/);
  if (om && m === 'DELETE') { await env.DB.prepare("UPDATE paper_orders SET status='cancelled',done=? WHERE id=? AND user_id=? AND status='open'").bind(Date.now(), +om[1], uid).run(); return json(await snapshot(env, uid)); }
  if (p === '/api/history' && m === 'GET') { const sym = String(url.searchParams.get('sym') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); if (!STOCK_ALL.includes(sym)) return err(400, 'Alleen voor aandelen en ETF\'s.');
    const key = 'hist:' + sym; const c = await env.DB.prepare('SELECT val,ts FROM kv WHERE key=?').bind(key).first(); if (c && Date.now() - c.ts < 12 * HOUR) return json(JSON.parse(c.val));
    const Y = { ASML: 'ASML.AS', ADYEN: 'ADYEN.AS', INGA: 'INGA.AS', SHELL: 'SHELL.AS', MC: 'MC.PA', SAP: 'SAP.DE', SIE: 'SIE.DE' }; const b = budget(4); const st = await loadKV(env, ['fx', 'tickers']); const fx = await usdPerEur(env, b, st);
    try { const j = await (await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(Y[sym] || sym)}?range=5y&interval=1d`, { headers: { 'user-agent': 'Mozilla/5.0 Vantis' } })).json(); const r = j.chart?.result?.[0]; const cur = r?.meta?.currency || 'USD';
      const t = r?.timestamp || [], cl = r?.indicators?.quote?.[0]?.close || []; const k = cur === 'EUR' ? 1 : fx ? 1 / fx : null; if (!t.length || !k) throw new Error('geen historie');
      const out = { sym, cur, fxNote: cur === 'EUR' ? null : 'Omgerekend tegen de huidige dollarkoers', d: t.map((x, i) => [x * 1000, cl[i] != null ? Math.round(cl[i] * k * 1e4) / 1e4 : null]).filter(x => x[1] != null) };
      await kvPutStmt(env, key, out).run(); return json(out); } catch (e) { return err(502, 'Historie niet beschikbaar: ' + e.message); } }
  if (p === '/api/quote' && m === 'GET') { const sym = String(url.searchParams.get('sym') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); const kind = KIND(sym, url.searchParams.get('kind'));
    const q = await priceFor(env, sym, kind); return q.p ? json({ sym, kind, p: q.p, o: q.o ?? null, h: q.h ?? null, l: q.l ?? null, native: q.native ?? null, cur: q.cur || 'EUR', src: q.src, u: q.u, ts: q.ts || q.u }) : err(404, 'Geen koers gevonden.', { tried: q.tried }); }
  return null;
}

/* ---------- cron: open orders uitvoeren, waardehistorie bijhouden ---------- */
export async function paperCron(env, st, status) {
  const now = Date.now(); const msgs = {}; const add = (uid, msg) => (msgs[uid] = msgs[uid] || []).push(msg);
  const rows = (await env.DB.prepare("SELECT * FROM paper_orders WHERE status='open' ORDER BY created").all()).results;
  const skip = new Set(); let filled = 0, checked = 0;
  const trailOps = [];
  for (const o of rows) { if (skip.has(o.id) || filled >= 10) continue; const q = cachedPx(st, o.sym, o.kind); if (!q) continue; checked++;
    if (o.type === 'trail' && q.p > (o.peak || 0)) { o.peak = q.p; o.lvl = q.p * (1 - o.trail / 100); trailOps.push(env.DB.prepare('UPDATE paper_orders SET peak=?,lvl=? WHERE id=?').bind(o.peak, o.lvl, o.id)); }
    const hit = o.type === 'trail' ? q.p <= o.lvl : o.type === 'limit' ? (o.side === 'buy' ? q.p <= o.lvl : q.p >= o.lvl) : (o.side === 'buy' ? q.p >= o.lvl : q.p <= o.lvl); if (!hit) continue;
    try { const t = await execTrade(env, o.user_id, { sym: o.sym, kind: o.kind, side: o.side, eur: o.eur, qty: o.qty, all: !!o.allq }, q, o.type === 'trail' ? 'trailing' : o.note === 'Stop-loss' ? 'stop-loss' : o.note === 'Winst nemen' ? 'take-profit' : o.type, st); filled++;
      const ops = [env.DB.prepare("UPDATE paper_orders SET status='filled',done=?,price=? WHERE id=?").bind(now, t.price, o.id)];
      if (o.oco) { ops.push(env.DB.prepare("UPDATE paper_orders SET status='cancelled',done=?,note=COALESCE(note,'')||' · vervallen (andere order uitgevoerd)' WHERE oco=? AND id<>? AND status='open'").bind(now, o.oco, o.id)); rows.filter(x => x.oco === o.oco).forEach(x => skip.add(x.id)); }
      await env.DB.batch(ops);
      const what = o.type === 'trail' ? 'Trailing stop geraakt' : o.note === 'Stop-loss' ? 'Stop-loss geraakt' : o.note === 'Winst nemen' ? 'Winst genomen' : (o.type === 'limit' ? 'Limietorder' : 'Stoporder') + ' uitgevoerd';
      add(o.user_id, { key: 'order:' + o.id, tag: 'order-' + o.id, cat: 'order', force: true, url: '/#handel', title: `${what}: ${o.side === 'buy' ? 'koop' : 'verkoop'} ${o.sym}`,
        body: `${nl(t.qty)} ${o.sym} tegen ${nl(t.price)} euro (${nl(t.eur)} euro)${t.pnl != null ? ` · resultaat ${t.pnl >= 0 ? '+' : '−'}${nl(Math.abs(t.pnl))} euro` : ''} · oefengeld` });
    } catch (e) { await env.DB.prepare("UPDATE paper_orders SET status='failed',done=?,note=? WHERE id=?").bind(now, String(e.message).slice(0, 160), o.id).run();
      add(o.user_id, { key: 'orderfail:' + o.id, tag: 'order-' + o.id, cat: 'order', force: true, url: '/#handel', title: `Order ${o.sym} niet uitgevoerd`, body: e.message }); }
  }
  if (trailOps.length) await env.DB.batch(trailOps.slice(0, 40));
  // periodiek kopen
  let dcaRuns = 0; const STEP = { day: DAY, week: 7 * DAY, month: 30 * DAY };
  const due = (await env.DB.prepare('SELECT * FROM paper_dca WHERE active=1 AND next<=? ORDER BY next LIMIT 8').bind(now).all()).results;
  for (const d of due) { const q = cachedPx(st, d.sym, d.kind); if (!q) continue; let next = d.next; while (next <= now) next += d.every === 'month' ? (new Date(next).setUTCMonth(new Date(next).getUTCMonth() + 1) - next) : STEP[d.every];
    try { const t = await execTrade(env, d.user_id, { sym: d.sym, kind: d.kind, side: 'buy', eur: d.eur }, q, 'periodiek', st); dcaRuns++;
      await env.DB.prepare('UPDATE paper_dca SET next=?,last=?,runs=runs+1 WHERE id=?').bind(next, now, d.id).run();
      add(d.user_id, { key: 'dca:' + d.id + ':' + now, tag: 'dca-' + d.id, cat: 'order', url: '/#handel', title: `Periodieke aankoop: ${d.sym} voor ${nl(d.eur)} euro`, body: `${nl(t.qty)} ${d.sym} tegen ${nl(t.price)} euro · aankoop ${d.runs + 1} · oefengeld` }); }
    catch (e) { await env.DB.prepare('UPDATE paper_dca SET active=0,note=? WHERE id=?').bind(String(e.message).slice(0, 120), d.id).run();
      add(d.user_id, { key: 'dcafail:' + d.id, tag: 'dca-' + d.id, cat: 'order', force: true, url: '/#handel', title: `Periodiek kopen ${d.sym} gepauzeerd`, body: e.message }); } }
  // elk uur een waardepunt per oefenportefeuille
  let hist = 0;
  if (!st.phT || now - st.phT > HOUR - 2 * MIN) {
    const acc = (await env.DB.prepare('SELECT user_id,cash,holdings FROM paper').all()).results; const t = Math.floor(now / HOUR) * HOUR; const ops = [];
    for (const a of acc) { const H = JSON.parse(a.holdings || '{}'); if (!Object.keys(H).length) continue; ops.push(histStmt(env, a.user_id, t, r2(a.cash + valueOf(H, st)), st)); }
    if (ops.length) await env.DB.batch(ops.slice(0, 40)); hist = ops.length; await kvPutStmt(env, 'phT', now).run();
  }
  status.orders = { ok: true, open: rows.length, checked, filled, trailMoved: trailOps.length, dca: dcaRuns, hist };
  return msgs;
}
export async function paperNeed(env) { // welke koersen de cron apart moet bijhouden
  const [al, pa, po] = await env.DB.batch([env.DB.prepare('SELECT DISTINCT sym FROM price_alerts WHERE active=1'), env.DB.prepare('SELECT holdings FROM paper'), env.DB.prepare("SELECT DISTINCT sym,kind FROM paper_orders WHERE status='open'")]);
  const need = new Set(al.results.map(r => r.sym));
  for (const r of pa.results) for (const [k, h] of Object.entries(JSON.parse(r.holdings || '{}'))) need.add(h.k === 'stock' ? 'S:' + k : k);
  for (const r of po.results) need.add(r.kind === 'stock' ? 'S:' + r.sym : r.sym);
  if (pa.results.length) need.add('S:SPY');
  try { for (const r of (await env.DB.prepare('SELECT DISTINCT sym,kind FROM paper_dca WHERE active=1').all()).results) need.add(r.kind === 'stock' ? 'S:' + r.sym : r.sym); } catch { }
  return need;
}
