// CSA worker — marktdata (alleen gratis bronnen), analyse, gebeurtenissen, backtest
import { DAY, HOUR, MIN, kvPutStmt } from './lib.js';

export const BV_DEFAULT = 'https://api.bitvavo.com/v2';
export const STABLE = new Set(['USDC', 'USDT', 'EURC', 'DAI', 'EURT', 'TUSD', 'PYUSD', 'FDUSD', 'USDE', 'EURI', 'RLUSD', 'USD1', 'EURQ', 'EURR']);
export const STOCK_SYMS = ['SPY', 'QQQ', 'DIA', 'IWM', 'XLK', 'SMH', 'XLE', 'XLF', 'XLV', 'XLY', 'XLI', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'AVGO', 'PLTR', 'JPM', 'GS', 'V', 'XOM', 'CVX', 'LLY', 'COIN', 'MSTR'];
export const RADAR = [
  { id: 'nfp-2026-11', t: '2026-12-04T14:30:00+01:00', title: 'Banenrapport (NFP), november', type: 'NFP' },
  { id: 'fomc-2026-12', t: '2026-12-09T20:00:00+01:00', title: 'Fed rentebesluit + projecties', type: 'FOMC' },
  { id: 'cpi-2026-11', t: '2026-12-10T14:30:00+01:00', title: 'Inflatie (CPI), november', type: 'CPI' },
  { id: 'ecb-2026-12', t: '2026-12-17T14:15:00+01:00', title: 'ECB rentebesluit + projecties', type: 'ECB' },
  { id: 'min-2026-12', t: '2026-12-30T20:00:00+01:00', title: 'Notulen Fed-vergadering 8–9 december', type: 'MIN' },
  { id: 'nfp-2026-12', t: '2027-01-08T14:30:00+01:00', title: 'Banenrapport (NFP), december', type: 'NFP' },
  { id: 'cpi-2026-12', t: '2027-01-13T14:30:00+01:00', title: 'Inflatie (CPI), december', type: 'CPI' }
].map(e => ({ ...e, t: new Date(e.t).getTime() }));

const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const sd = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const nl = (n, d = 1) => Number(n).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = n => (n > 0 ? '+' : n < 0 ? '−' : '') + nl(Math.abs(n), 2) + '%';

/* ---------- Impact Score: dezelfde methode als in de app ---------- */
export const IW = { M: .25, B: .15, V: .15, R: .15, S: .10, H: .10, Q: .10 };
export function impact(f) { let s = 0; for (const k in IW) s += IW[k] * clamp(f[k] ?? 0, 0, 1); return Math.round(100 * s); }
const relOf = vq => clamp(Math.log10(Math.max(vq || 1, 1) / 1e5) / 3, 0, 1);

/* ---------- budget voor subrequests (gratis plan: 50 per uitvoering) ---------- */
export function budget(n = 45) { let left = n; return { take(k = 1) { if (left < k) return false; left -= k; return true; }, get left() { return left; } }; }
const UA = 'CSA-CryptoSignalAI/1.1 (+https://csa.rijnstadmarketing.workers.dev; info@rijnstadmarketing.nl)';
async function getJSON(url, b, init = {}) { if (b && !b.take()) throw new Error('budget op'); const r = await fetch(url, { ...init, headers: { 'user-agent': UA, accept: 'application/json', ...(init.headers || {}) } }); if (!r.ok) throw new Error(new URL(url).hostname + ' HTTP ' + r.status); return r.json(); }
async function getText(url, b) { if (b && !b.take()) throw new Error('budget op'); const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' } }); if (!r.ok) throw new Error(new URL(url).hostname + ' HTTP ' + r.status); return r.text(); }
/* ---------- gratis nieuws via RSS (geen sleutel nodig), meerdere onafhankelijke bronnen ---------- */
export const FEEDS = [
  ['CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/'],
  ['Cointelegraph', 'https://cointelegraph.com/rss'],
  ['Decrypt', 'https://decrypt.co/feed'],
  ['Bitcoin Magazine', 'https://bitcoinmagazine.com/.rss/full/'],
  ['The Block', 'https://www.theblock.co/rss.xml'],
  ['CNBC Markets', 'https://www.cnbc.com/id/100003114/device/rss/rss.html'],
  ['MarketWatch', 'https://feeds.content.dowjones.io/public/rss/mw_topstories'],
  ['Yahoo Finance', 'https://finance.yahoo.com/news/rssindex']
];
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const unent = t => t.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] ?? m));
const tag = (x, n) => { const m = x.match(new RegExp('<' + n + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + n + '>', 'i')); return m ? unent(m[1]).trim() : ''; };
export function parseRSS(xml, src) {
  const out = []; const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const it of items.slice(0, 30)) {
    const title = tag(it, 'title').replace(/<[^>]+>/g, '').trim(); let link = tag(it, 'link'); if (!link) { const m = it.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ''; }
    const when = Date.parse(tag(it, 'pubDate') || tag(it, 'dc:date') || tag(it, 'published') || tag(it, 'updated'));
    const body = (tag(it, 'description') || tag(it, 'summary')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (title && /^https?:\/\//.test(link)) out.push({ id: 'rss' + hashStr(link), title, body, url: link, src, t: isFinite(when) ? when : Date.now(), feed: 'RSS' });
  }
  return out;
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

/* ---------- koersbronnen: Bitvavo, met CoinGecko en Kraken als reserve ---------- */
function fromBitvavo(t24) { return t24.filter(d => /-EUR$/.test(d.market) && d.last != null).map(d => ({ s: d.market.split('-')[0], p: +d.last, o: +d.open || null, h: +d.high || null, l: +d.low || null, vq: +d.volumeQuote || 0 })); }
async function fromCoinGecko(env, b) {
  const h = env.COINGECKO_KEY ? { headers: { 'x-cg-demo-api-key': env.COINGECKO_KEY } } : undefined;
  const rows = await getJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=150&page=1&price_change_percentage=24h', b, h);
  const seen = new Set(); const out = [];
  for (const c of rows) { const s = String(c.symbol || '').toUpperCase(); if (!s || seen.has(s) || c.current_price == null) continue; seen.add(s);
    const ch = c.price_change_percentage_24h; out.push({ s, name: c.name, p: c.current_price, o: ch != null ? c.current_price / (1 + ch / 100) : null, h: c.high_24h, l: c.low_24h, vq: c.total_volume || 0 }); }
  if (!out.length) throw new Error('CoinGecko gaf geen koersen'); return out;
}
async function fromKraken(b) {
  const j = await getJSON('https://api.kraken.com/0/public/Ticker', b); if (j.error && j.error.length) throw new Error('Kraken: ' + j.error.join(', '));
  const MAP = { XBT: 'BTC', XDG: 'DOGE' }; const out = []; const seen = new Set();
  for (const [k, v] of Object.entries(j.result || {})) { if (!/Z?EUR$/.test(k) || /\.d$/.test(k)) continue; let base = k.replace(/Z?EUR$/, ''); if (base.length === 4 && base[0] === 'X') base = base.slice(1); base = MAP[base] || base;
    if (seen.has(base)) continue; seen.add(base); const p = +v.c[0]; out.push({ s: base, p, o: +v.o || null, h: +v.h[1] || null, l: +v.l[1] || null, vq: (+v.v[1] || 0) * (+v.p[1] || p) }); }
  if (!out.length) throw new Error('Kraken gaf geen EUR-koersen'); return out;
}

/* ---------- verversen: één cron-tik, elke stap los en direct opgeslagen ---------- */
export async function refreshMarket(env, state, b, status = {}) {
  const BV = env.BV_BASE || BV_DEFAULT; const now = Date.now();
  const save = (k, v) => kvPutStmt(env, k, v).run();
  const step = async (name, fn) => { const t = Date.now(); try { const r = await fn(); status[name] = { ok: true, ms: Date.now() - t, ...(r || {}) }; } catch (e) { status[name] = { ok: false, ms: Date.now() - t, err: String(e && e.message || e).slice(0, 240) }; } };
  // 1. koersen: Bitvavo, anders CoinGecko, anders Kraken
  await step('tickers', async () => {
    let list = null, src = 'Bitvavo'; const tried = {};
    try { list = fromBitvavo(await getJSON(BV + '/ticker/24h', b)); } catch (e) { tried.Bitvavo = e.message; }
    if (!list) { try { list = await fromCoinGecko(env, b); src = 'CoinGecko (reserve)'; } catch (e) { tried.CoinGecko = e.message; } }
    if (!list) { try { list = await fromKraken(b); src = 'Kraken (reserve)'; } catch (e) { tried.Kraken = e.message; } }
    if (!list) throw new Error('Geen enkele koersbron bereikbaar: ' + JSON.stringify(tried));
    list = list.filter(x => !STABLE.has(x.s) && x.p > 0).sort((a, b2) => b2.vq - a.vq);
    if (list.some(x => x.name)) { state.names = { ...(state.names || {}), ...Object.fromEntries(list.filter(x => x.name).map(x => [x.s, x.name])) }; }
    state.tickers = { t: now, src, list: list.map(({ name, ...x }) => x) }; await save('tickers', state.tickers);
    const hist = state.ticks || { t: [], p: {} }; hist.t.push(now);
    for (const x of list.slice(0, 40)) (hist.p[x.s] = hist.p[x.s] || []).push(x.p);
    while (hist.t.length > 13) { hist.t.shift(); for (const k in hist.p) hist.p[k].shift(); }
    for (const k in hist.p) { if (hist.p[k].length > hist.t.length) hist.p[k] = hist.p[k].slice(-hist.t.length); if (!hist.p[k].length) delete hist.p[k]; }
    state.ticks = hist; await save('ticks', hist);
    state.priceSrc = src; return { n: list.length, src, tried };
  });
  const bitvavoOk = status.tickers?.ok && state.priceSrc === 'Bitvavo';
  // 2. namen (dagelijks, alleen van Bitvavo)
  if (bitvavoOk && (!state.names || now - (state.namesTs || 0) > DAY)) await step('names', async () => { const a = await getJSON(BV + '/assets', b); state.names = { ...(state.names || {}), ...Object.fromEntries(a.map(x => [x.symbol, x.name])) }; await save('names', state.names); return { n: a.length }; });
  else if (state.names && !bitvavoOk && status.tickers?.ok) await save('names', state.names);
  // 3. dagcandles (Bitvavo): per tik max. 6 verouderde markten
  if (bitvavoOk) await step('candles', async () => {
    const C = state.candles || {}; const deep = (state.tickers.list || []).slice(0, 40).map(x => x.s);
    const stale = deep.filter(s => !C[s] || now - C[s].u > HOUR).slice(0, 6); let ok = 0, last = '';
    await Promise.all(stale.map(async s => { try { const r = await getJSON(`${BV}/${s}-EUR/candles?interval=1d&limit=32`, b); const rows = r.map(x => x.map(Number)).sort((x, y) => x[0] - y[0]).filter(x => x[0] + DAY <= now);
      C[s] = { u: now, t: rows.map(x => x[0]), c: rows.map(x => x[4]), h: rows.map(x => x[2]), l: rows.map(x => x[3]), vq: rows.map(x => x[5] * x[4]) }; ok++; } catch (e) { last = e.message; } }));
    for (const k of Object.keys(C)) if (!deep.includes(k) && now - C[k].u > DAY) delete C[k];
    state.candles = C; if (ok) await save('candles', C); return { refreshed: ok, of: stale.length, have: Object.keys(C).length, ...(last ? { lastErr: last } : {}) };
  });
  // 4. nieuws: per tik 2 RSS-bronnen (roterend), plus optioneel CryptoCompare/Finnhub elk kwartier
  await step('news', async () => {
    const N = state.news || { items: [], sources: {} }; const idx = (N.idx || 0) % FEEDS.length; const pick = [FEEDS[idx], FEEDS[(idx + 1) % FEEDS.length]];
    const fresh = []; N.sources = N.sources || {};
    await Promise.all(pick.map(async ([name, url]) => { try { const got = parseRSS(await getText(url, b), name); fresh.push(...got); N.sources[name] = got.length; } catch (e) { N.sources[name] = 'fout: ' + e.message; } }));
    if (now - (N.extraT || 0) > 15 * MIN) { N.extraT = now;
      if (env.CRYPTOCOMPARE_KEY) { try { const j = await getJSON('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&api_key=' + env.CRYPTOCOMPARE_KEY, b); const d = (j.Data || []).slice(0, 50); fresh.push(...d.map(x => ({ id: 'cc' + x.id, title: x.title, body: (x.body || '').slice(0, 300), url: x.url, src: (x.source_info && x.source_info.name) || x.source, t: x.published_on * 1000, feed: 'CryptoCompare' }))); N.sources.CryptoCompare = d.length; } catch (e) { N.sources.CryptoCompare = 'fout: ' + e.message; } }
      if (env.FINNHUB_KEY) { for (const cat of ['general', 'crypto']) { try { const l = await getJSON(`https://finnhub.io/api/v1/news?category=${cat}&token=${env.FINNHUB_KEY}`, b); fresh.push(...l.slice(0, 40).map(x => ({ id: 'fh' + x.id, title: x.headline, body: (x.summary || '').slice(0, 300), url: x.url, src: x.source, t: x.datetime * 1000, feed: 'Finnhub' }))); N.sources['Finnhub ' + cat] = l.length; } catch (e) { N.sources['Finnhub ' + cat] = 'fout: ' + e.message; } } } }
    const cut = now - 3 * DAY; const seen = new Set();
    N.items = [...fresh, ...(N.items || [])].filter(x => x && x.title && x.url && x.t > cut && !seen.has(x.id) && seen.add(x.id)).sort((p, q) => q.t - p.t).slice(0, 200);
    N.idx = (idx + 2) % FEEDS.length; N.t = now; state.news = N; await save('news', N);
    return { items: N.items.length, fetched: pick.map(p => p[0]).join(', '), sources: N.sources };
  });
  // 5. extra marktcijfers (elke 10 min): CoinGecko + Fear & Greed
  if (now - (state.extraTs || 0) > 10 * MIN || !state.extra || !state.extra.global) await step('extra', async () => {
    const ex = { ...(state.extra || {}) }; const h = env.COINGECKO_KEY ? { headers: { 'x-cg-demo-api-key': env.COINGECKO_KEY } } : undefined;
    delete ex.globalErr; delete ex.trendErr; delete ex.fngErr;
    try { const g = (await getJSON('https://api.coingecko.com/api/v3/global', b, h)).data; ex.global = { cap: g.total_market_cap?.eur, vol: g.total_volume?.eur, capCh: g.market_cap_change_percentage_24h_usd, btcDom: g.market_cap_percentage?.btc, ethDom: g.market_cap_percentage?.eth, coins: g.active_cryptocurrencies, t: now }; } catch (e) { ex.globalErr = e.message; }
    try { const tr = await getJSON('https://api.coingecko.com/api/v3/search/trending', b, h); ex.trending = (tr.coins || []).slice(0, 10).map(c => ({ s: (c.item.symbol || '').toUpperCase(), name: c.item.name, rank: c.item.market_cap_rank, ch: c.item.data?.price_change_percentage_24h?.eur ?? null })); ex.trendT = now; } catch (e) { ex.trendErr = e.message; }
    try { const f = await getJSON('https://api.alternative.me/fng/?limit=8', b); ex.fng = (f.data || []).map(d => ({ v: +d.value, l: d.value_classification, t: +d.timestamp * 1000 })); } catch (e) { ex.fngErr = e.message; }
    state.extra = ex; await save('extra', ex); return { global: !!ex.global, trending: !!ex.trending, fng: !!ex.fng, errors: [ex.globalErr, ex.trendErr, ex.fngErr].filter(Boolean) };
  });
  // 6. aandelen via Finnhub (alleen met FINNHUB_KEY), roterend
  if (env.FINNHUB_KEY) await step('stocks', async () => {
    const Q = state.stocks || {}; const order = STOCK_SYMS.slice().sort((a, b2) => (Q[a]?.u || 0) - (Q[b2]?.u || 0)).slice(0, Math.max(0, Math.min(8, b.left - 6))); let ok = 0;
    await Promise.all(order.map(async s => { try { const q = await getJSON(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${env.FINNHUB_KEY}`, b); if (q && q.c) { Q[s] = { p: q.c, dp: q.dp, o: q.o, h: q.h, l: q.l, pc: q.pc, ts: q.t * 1000, u: now }; ok++; } } catch { } }));
    state.stocks = Q; await save('stocks', Q); return { refreshed: ok };
  });
  return status;
}

/* ---------- analyse op serverdata ---------- */
export function analyse(state) {
  const C = state.candles || {}, L = (state.tickers?.list || []).slice(0, 40), names = state.names || {};
  const btcRets = C.BTC ? rets(C.BTC.c) : null;
  const A = L.map(x => {
    const c = C[x.s]; const ch = x.o ? (x.p / x.o - 1) * 100 : null; const a = { s: x.s, name: names[x.s] || x.s, p: x.p, ch, vq: x.vq, h: x.h, l: x.l };
    if (c && c.c.length >= 10) {
      const r = rets(c.c); a.vol = sd(r) * 100; a.avgVq = mean(c.vq.slice(-30)); a.vr = a.avgVq ? x.vq / a.avgVq : null; a.z = a.vol && ch != null ? ch / a.vol : null;
      a.hi = Math.max(...c.h); a.lo = Math.min(...c.l); a.sma = mean(c.c.slice(-20)); a.ch7 = (x.p / c.c[Math.max(0, c.c.length - 7)] - 1) * 100;
      if (btcRets && x.s !== 'BTC') { const n = Math.min(r.length, btcRets.length); a.corr = corr(r.slice(-n), btcRets.slice(-n)); } else if (x.s === 'BTC') a.corr = 1;
    }
    const tk = state.ticks; if (tk && tk.p[x.s] && tk.p[x.s].length >= 4) { const arr = tk.p[x.s]; a.ch15 = (x.p / arr[arr.length - 4] - 1) * 100; }
    return a;
  }).filter(a => a.ch != null);
  const w = A.reduce((s, a) => s + a.vq, 0) || 1;
  const mk = { n: A.length, breadth: A.filter(a => a.ch > 0).length / (A.length || 1), vw: A.reduce((s, a) => s + a.ch * a.vq, 0) / w, volRegime: A.reduce((s, a) => s + a.vq, 0) / (A.reduce((s, a) => s + (a.avgVq || a.vq), 0) || 1) };
  const btc = A.find(a => a.s === 'BTC'); mk.zMove = btc && btc.vol ? mk.vw / btc.vol : 0;
  return { A, mk };
}
function rets(c) { const r = []; for (let i = 1; i < c.length; i++) r.push(Math.log(c[i] / c[i - 1])); return r; }
function corr(a, b) { const n = Math.min(a.length, b.length); if (n < 8) return null; const ma = mean(a), mb = mean(b); let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; } return va && vb ? c / Math.sqrt(va * vb) : null; }

export function detect({ A, mk }) {
  const day = new Date().toISOString().slice(0, 10), hour = new Date().toISOString().slice(0, 13); const out = [];
  for (const a of A) {
    if (!a.vol) continue;
    const same = A.filter(x => x.z != null && Math.sign(x.ch) === Math.sign(a.ch) && Math.abs(x.z) > 1).length / A.length;
    const B = a.s === 'BTC' || a.s === 'ETH' ? Math.max(same, .5) : (a.corr > .7 ? same * .8 : .2);
    const dir = a.ch >= 0 ? 1 : -1; const R = relOf(a.vq); const V = (a.vr - 1) / 2;
    if (a.z != null && Math.abs(a.z) >= 2) out.push({ id: `move:${a.s}:${day}`, type: 'move', cat: 'move', s: a.s, dir, score: impact({ M: Math.abs(a.z) / 4, B, V, R, S: .3, H: .6, Q: 1 }), title: `${a.name} ${dir > 0 ? 'stijgt' : 'daalt'} ${pct(Math.abs(a.ch)).replace('+', '')} in 24 uur`, body: `${nl(Math.abs(a.z))}× de normale dagbeweging (${nl(a.vol)}% per dag).` });
    if (a.vr >= 2.2 && a.vq > 2e5) out.push({ id: `volume:${a.s}:${day}`, type: 'volume', cat: 'volume', s: a.s, dir: Math.abs(a.ch) < .5 ? 0 : dir, score: impact({ M: Math.abs(a.z || 0) / 4, B, V, R, S: .3, H: .5, Q: 1 }), title: `Ongebruikelijk handelsvolume in ${a.name}`, body: `${nl(a.vr)}× het 30-daags gemiddelde, koers ${pct(a.ch)}.` });
    if (a.p > a.hi || a.p < a.lo) { const up = a.p > a.hi; out.push({ id: `brk:${a.s}:${day}`, type: up ? 'breakout' : 'breakdown', cat: 'breakout', s: a.s, dir: up ? 1 : -1, score: impact({ M: Math.max(.35, Math.abs(a.z || 0) / 4), B, V, R, S: .3, H: .55, Q: 1 }), title: `${a.name} ${up ? 'breekt boven het 30-daags hoogste punt' : 'zakt onder het 30-daags laagste punt'}`, body: `Koers ${pct(a.ch)} in 24 uur.` }); }
    if (a.ch15 != null && Math.abs(a.ch15) >= Math.max(1.5, a.vol * .6)) out.push({ id: `sudden:${a.s}:${hour}`, type: 'sudden', cat: 'sudden', s: a.s, dir: a.ch15 > 0 ? 1 : -1, score: impact({ M: Math.abs(a.ch15) / a.vol / 2, B, V, R, S: 1, H: .55, Q: 1 }), title: `Plotselinge beweging: ${a.name} ${pct(a.ch15)} in 15 minuten`, body: 'Gemeten op live Bitvavo-koersen.' });
  }
  if (mk.n && (mk.breadth >= .8 || mk.breadth <= .2) && Math.abs(mk.zMove) >= 1) out.push({ id: `market:${day}`, type: 'market', cat: 'market', s: null, dir: mk.vw > 0 ? 1 : -1, score: impact({ M: Math.abs(mk.zMove) / 3, B: Math.max(mk.breadth, 1 - mk.breadth), V: (mk.volRegime - 1) / 2, R: 1, S: .3, H: .8, Q: 1 }), title: `Brede cryptomarkt ${mk.vw > 0 ? 'in de plus' : 'onder druk'}`, body: `${Math.round(mk.breadth * 100)}% van de top-${mk.n} stijgt; volumegewogen ${pct(mk.vw)}.` });
  return out;
}

/* ---------- backtest: hoe reageerde de markt na gebeurtenissen met een hoge score? ---------- */
export async function backtest(env, b, topSyms) {
  const BV = env.BV_BASE || BV_DEFAULT;
  const series = {};
  await Promise.all(topSyms.slice(0, 20).map(async s => { try { const r = await getJSON(`${BV}/${s}-EUR/candles?interval=1d&limit=400`, b); series[s] = r.map(x => x.map(Number)).sort((a, b) => a[0] - b[0]).filter(x => x[0] + DAY <= Date.now()); } catch { } }));
  const syms = Object.keys(series); if (!syms.length) throw new Error('geen historie');
  // per dag: z-scores voor breedte
  const zByDay = {};
  const ev = [];
  for (const s of syms) {
    const rows = series[s]; const c = rows.map(x => x[4]), vq = rows.map(x => x[5] * x[4]);
    const avgAll = mean(vq);
    for (let i = 31; i < rows.length; i++) {
      const r = []; for (let k = i - 30; k < i; k++) r.push(Math.log(c[k] / c[k - 1]));
      const vol = sd(r) * 100; const ch = (c[i] / c[i - 1] - 1) * 100; const z = vol ? ch / vol : 0;
      (zByDay[rows[i][0]] = zByDay[rows[i][0]] || []).push(z);
      if (Math.abs(z) < 2) continue;
      const vr = vq[i] / (mean(vq.slice(i - 30, i)) || 1);
      const f1 = i + 1 < c.length ? (c[i + 1] / c[i] - 1) * 100 : null, f3 = i + 3 < c.length ? (c[i + 3] / c[i] - 1) * 100 : null, f7 = i + 7 < c.length ? (c[i + 7] / c[i] - 1) * 100 : null;
      ev.push({ s, t: rows[i][0], ch, z, vol, vr, R: relOf(avgAll), f1, f3, f7 });
    }
  }
  for (const e of ev) {
    const zs = zByDay[e.t] || []; const same = zs.filter(z => Math.sign(z) === Math.sign(e.z) && Math.abs(z) > 1).length / (zs.length || 1);
    e.score = impact({ M: Math.abs(e.z) / 4, B: same, V: (e.vr - 1) / 2, R: e.R, S: .3, H: .6, Q: 1 });
  }
  const buckets = [[0, 39, '< 40'], [40, 59, '40–59'], [60, 79, '60–79'], [80, 100, '80+']].map(([lo, hi, label]) => {
    const E = ev.filter(e => e.score >= lo && e.score <= hi && e.f3 != null);
    const dirF = k => E.filter(e => e[k] != null).map(e => Math.sign(e.ch) * e[k]);
    return { label, n: E.length, absNext: mean(E.filter(e => e.f1 != null).map(e => Math.abs(e.f1))), absNextRel: mean(E.filter(e => e.f1 != null).map(e => Math.abs(e.f1) / e.vol)),
      cont1: E.length ? E.filter(e => e.f1 != null && Math.sign(e.f1) === Math.sign(e.ch)).length / E.filter(e => e.f1 != null).length : null,
      follow3: mean(dirF('f3')), follow7: mean(dirF('f7')) };
  });
  const recent = ev.filter(e => e.f3 != null).sort((a, b) => b.t - a.t).slice(0, 20).map(e => ({ s: e.s, t: e.t, ch: e.ch, score: e.score, f1: e.f1, f3: e.f3, f7: e.f7 }));
  return { t: Date.now(), days: Math.min(...syms.map(s => series[s].length)), assets: syms, events: ev.length, buckets, recent,
    method: 'Gebeurtenis = dagbeweging ≥ 2× de 30-daagse volatiliteit. Score met dezelfde formule als live (snelheid onbekend → 0,3; historische invloed 0,6). Vervolg = koersverandering na 1, 3 en 7 dagen, positief als de beweging doorzette.' };
}

/* ---------- koersalerts ---------- */
export const ALERT_KINDS = { above: 'koers boven', below: 'koers onder', up1h: 'stijgt in 1 uur met', down1h: 'daalt in 1 uur met', up24h: 'stijgt in 24 uur met', down24h: 'daalt in 24 uur met' };
export function quote(state, sym) {
  const t = (state.tickers?.list || []).find(x => x.s === sym);
  if (t) { const arr = state.ticks?.p?.[sym]; return { p: t.p, cur: 'EUR', ch24: t.o ? (t.p / t.o - 1) * 100 : null, ch1h: arr && arr.length >= 13 ? (t.p / arr[arr.length - 13] - 1) * 100 : null, name: state.names?.[sym] || sym }; }
  const q = state.stocks?.[sym]; if (q) return { p: q.p, cur: 'USD', ch24: q.dp, ch1h: null, name: sym };
  return null;
}
export function alertHit(a, q) {
  if (!q) return false;
  switch (a.kind) {
    case 'above': return q.p >= a.value; case 'below': return q.p <= a.value;
    case 'up1h': return q.ch1h != null && q.ch1h >= a.value; case 'down1h': return q.ch1h != null && q.ch1h <= -a.value;
    case 'up24h': return q.ch24 != null && q.ch24 >= a.value; case 'down24h': return q.ch24 != null && q.ch24 <= -a.value;
  } return false;
}
export function alertText(a, q) {
  const money = v => (q.cur === 'USD' ? '$ ' : '€ ') + Number(v).toLocaleString('nl-NL', { maximumFractionDigits: v < 1 ? 6 : 2 });
  if (a.kind === 'above' || a.kind === 'below') return { title: `${q.name} ${a.kind === 'above' ? 'boven' : 'onder'} ${money(a.value)}`, body: `Koers nu ${money(q.p)} (${pct(q.ch24 ?? 0)} in 24 uur). Je koersalert is uitgegaan.` };
  const w = a.kind.endsWith('1h') ? '1 uur' : '24 uur', ch = a.kind.endsWith('1h') ? q.ch1h : q.ch24;
  return { title: `${q.name} ${pct(ch)} in ${w}`, body: `Koers nu ${money(q.p)}. Je alert stond op ${a.kind.startsWith('up') ? '+' : '−'}${nl(a.value, 1)}% in ${w}.` };
}

/* ---------- dagelijkse briefing (volgens vaste regels, zonder AI) ---------- */
const STOPW = new Set('the a an and or of to in on for with as at by is are be was were from after over its it this that than new says will could may into amid ahead'.split(' '));
const tk = t => new Set(t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOPW.has(w)));
function topNews(items, n = 5) {
  const cl = [];
  for (const it of (items || []).filter(x => Date.now() - x.t < 24 * HOUR)) { const k = tk(it.title); let hit = null;
    for (const c of cl) { let i = 0; k.forEach(w => { if (c.k.has(w)) i++; }); if (i / (k.size + c.k.size - i || 1) >= .4) { hit = c; break; } }
    if (hit) { hit.src.add(it.src); } else cl.push({ k, title: it.title, url: it.url, src: new Set([it.src]), t: it.t }); }
  return cl.sort((a, b) => b.src.size - a.src.size || b.t - a.t).slice(0, n).map(c => ({ title: c.title, url: c.url, sources: [...c.src], t: c.t }));
}
export function buildBriefing(state, events, an) {
  const { A, mk } = an; const btc = A.find(a => a.s === 'BTC'), eth = A.find(a => a.s === 'ETH');
  const now = Date.now(); const day = new Date(now).toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam', weekday: 'long', day: 'numeric', month: 'long' });
  const tone = mk.breadth >= .65 && mk.vw > 0 ? 'positief' : mk.breadth <= .35 && mk.vw < 0 ? 'negatief' : 'gemengd';
  let headline;
  if (!btc) headline = 'Marktdata nog niet beschikbaar';
  else if (Math.abs(btc.ch) < 1.5 && Math.abs(mk.vw) < 1.5) headline = `Rustige markt: Bitcoin ${pct(btc.ch)}, ${Math.round(mk.breadth * 100)}% van de top-${mk.n} in de plus`;
  else headline = `Crypto ${tone === 'positief' ? 'in de lift' : tone === 'negatief' ? 'onder druk' : 'verdeeld'}: Bitcoin ${pct(btc.ch)}, ${Math.round(mk.breadth * 100)}% van de top-${mk.n} in de plus`;
  const sorted = A.slice().sort((a, b) => b.ch - a.ch);
  const tz = d => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' });
  const today = tz(now), tomorrow = tz(now + DAY);
  const agenda = RADAR.filter(e => [today, tomorrow].includes(tz(e.t))).map(e => ({ title: e.title, t: e.t, today: tz(e.t) === today }));
  const ex = state.extra || {};
  const points = [];
  if (btc) points.push(`Bitcoin staat op ${pct(btc.ch)} in 24 uur${btc.vol ? `, ${nl(Math.abs(btc.z || 0))}× de normale dagbeweging` : ''}.`);
  if (mk.n) points.push(`De brede markt is ${tone}: ${Math.round(mk.breadth * 100)}% van de top-${mk.n} stijgt, volumegewogen ${pct(mk.vw)}. Handelsvolume ${nl(mk.volRegime, 2)}× normaal.`);
  if (ex.fng && ex.fng[0]) points.push(`Fear & Greed-index: ${ex.fng[0].v}/100 (${ex.fng[0].l}).`);
  if (events.length) points.push(`${events.length} opvallende gebeurtenis${events.length > 1 ? 'sen' : ''} in de afgelopen 24 uur; de hoogste Impact Score is ${Math.max(...events.map(e => e.score))}.`);
  if (agenda.length) points.push(`Op de agenda: ${agenda.map(e => e.title + ' (' + new Date(e.t).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', weekday: 'short', hour: '2-digit', minute: '2-digit' }) + ')').join('; ')}.`);
  return { t: now, day, headline, tone, points,
    market: { btc: btc ? { p: btc.p, ch: btc.ch } : null, eth: eth ? { p: eth.p, ch: eth.ch } : null, breadth: mk.breadth, vw: mk.vw, n: mk.n, volRegime: mk.volRegime },
    up: sorted.slice(0, 3).map(a => ({ s: a.s, name: a.name, ch: a.ch, p: a.p })), down: sorted.slice(-3).reverse().map(a => ({ s: a.s, name: a.name, ch: a.ch, p: a.p })),
    events: events.slice().sort((a, b) => b.score - a.score).slice(0, 5).map(e => ({ title: e.title, score: e.score, s: e.s, t: e.t })),
    news: topNews(state.news?.items), agenda, extra: ex.global ? { cap: ex.global.cap, capCh: ex.global.capCh, btcDom: ex.global.btcDom } : null,
    note: 'Automatisch samengesteld uit marktdata volgens vaste regels. Geen beleggingsadvies.' };
}
