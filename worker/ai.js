// Vantis AI: voorspellingsmodel per munt of aandeel, chat-assistent en de autopilot (oefengeld).
import { json, err, readJSON, kvPutStmt, limited, bump, tierRank, DAY, HOUR, MIN } from './lib.js';
import { quote, getJSON, budget, BV_DEFAULT, STOCK_ALL, usdPerEur } from './market.js';
import { execTrade, account } from './paper.js';
import { notifyUser } from './social.js';

const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const r2 = n => Math.round(n * 100) / 100;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
async function kv(env, keys) { const r = await env.DB.prepare(`SELECT key,val,ts FROM kv WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all(); const o = {}; for (const x of r.results) { o[x.key] = JSON.parse(x.val); o[x.key + 'Ts'] = x.ts; } return o; }

/* ---------- het model ----------
   Kenmerken per dag: trend (koers t.o.v. 20- en 50-daags gemiddelde), momentum (30 dagen), RSI(14) en
   beweeglijkheid. Score -100..100. De trefkans wordt eerlijk gemeten op de eigen historie:
   hoe vaak ging de koers 7 dagen na een positieve (of negatieve) score echt omhoog (of omlaag)? */
function feats(c, i) {
  if (i < 50) return null; const p = c[i];
  const sma20 = mean(c.slice(i - 19, i + 1)), sma50 = mean(c.slice(i - 49, i + 1));
  const r = []; for (let k = i - 29; k <= i; k++) r.push(Math.log(c[k] / c[k - 1])); const vol = sd(r) || 1e-6;
  let g = 0, l = 0; for (let k = i - 13; k <= i; k++) { const d = c[k] - c[k - 1]; d > 0 ? g += d : l -= d; } const rsi = l ? 100 - 100 / (1 + g / l) : 100;
  const mom30 = Math.log(p / c[i - 30]), mom7 = Math.log(p / c[i - 7]);
  const trend = clamp((p / sma50 - 1) / (vol * 5), -1, 1) * .45 + clamp((sma20 / sma50 - 1) / (vol * 3), -1, 1) * .25;
  const momentum = clamp(mom30 / (vol * Math.sqrt(30)), -2, 2) / 2 * .2;
  const stretch = rsi > 75 ? -(rsi - 75) / 25 : rsi < 25 ? (25 - rsi) / 25 : 0; // overkocht/oververkocht: kleine tegenkracht
  const score = Math.round(clamp(trend + momentum + stretch * .2 - clamp(mom7 / (vol * Math.sqrt(7)), -2, 2) / 2 * .1, -1, 1) * 100);
  return { score, rsi, vol, sma20, sma50, mom30: (Math.exp(mom30) - 1) * 100, mom7: (Math.exp(mom7) - 1) * 100 };
}
export function forecastFrom(c, H = 7) {
  if (!c || c.length < 60) return null; const n = c.length - 1; const f = feats(c, n); if (!f) return null;
  let hit = 0, tot = 0, upAfterPos = [], upAfterNeg = [];
  for (let i = 50; i + H <= n; i++) { const x = feats(c, i); if (!x || Math.abs(x.score) < 15) continue; const fwd = c[i + H] / c[i] - 1; tot++; if ((x.score > 0) === (fwd > 0)) hit++; (x.score > 0 ? upAfterPos : upAfterNeg).push(fwd); }
  const hitRate = tot >= 20 ? hit / tot : null;
  const base = tot >= 20 ? clamp(hitRate, .5, .62) : .52; // was het signaal historisch niet beter dan toeval, dan blijft de kans rond 50% // hoe goed het signaal historisch was
  const pUp = clamp(.5 + (f.score / 100) * (base - .5) * 2 + (f.score === 0 ? 0 : 0), .3, .7);
  const sig = f.vol * Math.sqrt(H); const drift = (pUp - .5) * sig * 1.2;
  const lo = (Math.exp(drift - 1.28 * sig) - 1) * 100, hi = (Math.exp(drift + 1.28 * sig) - 1) * 100, exp = (Math.exp(drift) - 1) * 100;
  const label = f.score >= 35 ? 'positief' : f.score >= 12 ? 'licht positief' : f.score <= -35 ? 'negatief' : f.score <= -12 ? 'licht negatief' : 'neutraal';
  const conf = tot < 20 ? 'laag' : Math.abs(f.score) >= 40 && hitRate > .55 ? 'redelijk' : 'laag';
  return { horizon: H, score: f.score, label, pUp: r2(pUp * 100), exp: r2(exp), range: [r2(lo), r2(hi)], hitRate: hitRate != null ? r2(hitRate * 100) : null, tested: tot, confidence: conf,
    rsi: Math.round(f.rsi), trend: c[n] > f.sma50 ? (f.sma20 > f.sma50 ? 'boven 20- en 50-daags gemiddelde' : 'boven 50-daags gemiddelde') : 'onder 50-daags gemiddelde', mom30: r2(f.mom30), mom7: r2(f.mom7), volDay: r2(f.vol * 100) };
}

/* koershistorie: crypto via Bitvavo (1 jaar), aandelen via de bestaande historie-cache */
async function series(env, sym, st, b) {
  const isStock = STOCK_ALL.includes(sym) && !(st.tickers?.list || []).some(x => x.s === sym);
  const key = 'fc:' + sym; const c = await env.DB.prepare('SELECT val,ts FROM kv WHERE key=?').bind(key).first(); if (c && Date.now() - c.ts < 6 * HOUR) return JSON.parse(c.val);
  let out = null;
  try {
    if (isStock) { const h = await env.DB.prepare('SELECT val,ts FROM kv WHERE key=?').bind('hist:' + sym).first();
      if (h && Date.now() - h.ts < 24 * HOUR) out = JSON.parse(h.val).d.slice(-400).map(x => x[1]);
      else if (b.take()) { const Y = { ASML: 'ASML.AS', ADYEN: 'ADYEN.AS', INGA: 'INGA.AS', SHELL: 'SHELL.AS', MC: 'MC.PA', SAP: 'SAP.DE', SIE: 'SIE.DE' };
        const j = await (await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(Y[sym] || sym)}?range=2y&interval=1d`, { headers: { 'user-agent': 'Mozilla/5.0 Vantis' } })).json(); const r = j.chart?.result?.[0];
        out = (r?.indicators?.quote?.[0]?.close || []).filter(x => x != null).slice(-400); }
    } else { const r = await getJSON(`${env.BV_BASE || BV_DEFAULT}/${sym}-EUR/candles?interval=1d&limit=400`, b); out = r.map(x => x.map(Number)).sort((a, b2) => a[0] - b2[0]).map(x => x[4]); const t = (st.tickers?.list || []).find(x => x.s === sym); if (t && out.length && Math.abs(t.p / out[out.length - 1] - 1) < .15) out.push(t.p); }
  } catch (e) { out = null; }
  if (!out || out.length < 60) { const C = st.candles?.[sym]; if (C && C.c && C.c.length >= 55) out = C.c.slice(); }
  if (out && out.length >= 60) await kvPutStmt(env, key, out).run();
  return out;
}
export async function forecast(env, sym, st, b) { const c = await series(env, sym, st, b || budget(6)); const f = forecastFrom(c); if (!f) return null; const q = quote(st, sym); return { sym, name: q?.name || st.names?.[sym] || sym, price: q?.p ?? c[c.length - 1], cur: q?.cur || 'EUR', ch24: q?.ch24 ?? null, kind: STOCK_ALL.includes(sym) && !(st.tickers?.list || []).some(x => x.s === sym) ? 'stock' : 'crypto', ...f }; }

/* ranglijst over een vaste set (gecachet), voor "wat moet ik kopen" en de autopilot */
const STOCK_PICK = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'ASML', 'JPM'];
export async function ranking(env, st, opts = {}) {
  const c = await env.DB.prepare("SELECT val,ts FROM kv WHERE key='fcrank'").first(); if (c && Date.now() - c.ts < 3 * HOUR && !opts.fresh) return JSON.parse(c.val);
  const b = budget(opts.budget || 26); const crypto = (st.tickers?.list || []).filter(x => !['USDC', 'USDT', 'EURC', 'DAI'].includes(x.s)).slice(0, 14).map(x => x.s);
  const out = []; for (const s of [...crypto, ...STOCK_PICK]) { try { const f = await forecast(env, s, st, b); if (f) out.push(f); } catch (e) { } }
  out.sort((a, b2) => b2.score - a.score); const R = { t: Date.now(), list: out }; await kvPutStmt(env, 'fcrank', R).run(); return R;
}

/* ---------- welke symbolen noemt iemand? ---------- */
const ALIAS = { bitcoin: 'BTC', btc: 'BTC', ethereum: 'ETH', ether: 'ETH', solana: 'SOL', ripple: 'XRP', cardano: 'ADA', dogecoin: 'DOGE', doge: 'DOGE', apple: 'AAPL', microsoft: 'MSFT', nvidia: 'NVDA', google: 'GOOGL', alphabet: 'GOOGL', amazon: 'AMZN', meta: 'META', facebook: 'META', tesla: 'TSLA', asml: 'ASML', 'sp500': 'SPY', 's&p': 'SPY', 'nasdaq': 'QQQ', coinbase: 'COIN', palantir: 'PLTR', amd: 'AMD', netflix: 'NFLX' };
function symbolsIn(text, st) {
  const known = new Set([...(st.tickers?.list || []).map(x => x.s), ...STOCK_ALL]); const out = []; const add = s => { if (s && known.has(s) && !out.includes(s)) out.push(s); };
  for (const m of text.matchAll(/\b[A-Z]{2,6}\b/g)) add(m[0]);
  const low = text.toLowerCase(); for (const [k, v] of Object.entries(ALIAS)) if (low.includes(k)) add(v);
  const names = st.names || {}; for (const [s, n] of Object.entries(names)) if (n && n.length > 3 && low.includes(n.toLowerCase())) add(s);
  return out.slice(0, 4);
}
const WANTS_PICKS = /welke?\s+(stock|aandeel|aandelen|munt|munten|coin|crypto)|wat\s+(moet|zou|kan)\s+ik\s+(nu\s+)?(kopen|in\s?stappen)|what\s+(should|to)\s+(i\s+)?buy|which\s+(stock|coin|crypto)|beste\s+(koop|kans)|top\s?(picks|kansen)|kopen\??$/i;

/* ---------- taalmodel ---------- */
async function llm(env, system, messages) {
  if (env.ANTHROPIC_API_KEY) {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.AI_MODEL || 'claude-sonnet-5-5', max_tokens: 1100, system, messages }) });
    const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || 'AI ' + r.status); return { text: (j.content || []).map(x => x.text || '').join(''), engine: 'claude' };
  }
  if (env.AI) {
    const pick = r => r?.response || r?.result?.response || r?.choices?.[0]?.message?.content || (r?.output || []).filter(o => o.type === 'message').flatMap(o => o.content || []).map(c => c.text || '').join('') || '';
    for (const model of [env.AI_MODEL_CF || '@cf/openai/gpt-oss-120b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast']) {
      try { const r = await env.AI.run(model, { messages: [{ role: 'system', content: system }, ...messages], max_tokens: 1400, temperature: .3 }); const t = pick(r).trim(); if (t) return { text: t, engine: model }; } catch (e) { }
    }
  }
  return null;
}

const fmtF = (f, en) => `${f.sym} (${f.name}, ${f.kind === 'stock' ? (en ? 'stock' : 'aandeel') : 'crypto'}): ${en ? 'price' : 'koers'} ${f.cur === 'USD' ? '$' : '€'}${f.price}, 24u ${f.ch24 != null ? r2(f.ch24) + '%' : '?'}; model-score ${f.score} (${f.label}); kans hoger over ${f.horizon} dagen ${f.pUp}%; verwachte bandbreedte ${f.range[0]}% tot ${f.range[1]}% (midden ${f.exp}%); historische trefkans van dit model op ${f.sym}: ${f.hitRate != null ? f.hitRate + '% over ' + f.tested + ' signalen' : 'te weinig data'}; betrouwbaarheid ${f.confidence}; RSI ${f.rsi}; trend ${f.trend}; 7d ${f.mom7}%, 30d ${f.mom30}%; dagelijkse beweeglijkheid ${f.volDay}%.`;

function systemPrompt(en, ctx) {
  if (en) return `You are Vantis AI, the market assistant in the Vantis app. Answer ONLY in English, informal and to the point.
Rules:
- Users trade with practice money (€10,000 to start) until the official launch. Orders you propose run only on that practice portfolio, after the user taps confirm.
- The "Vantis model" figures below are statistical outlooks (trend, momentum, RSI, volatility) tested on each asset's own history: probabilities, not certainties. Never claim to know the future; quote the chance, the range and the model's hit rate.
- Use only the data below for prices, holdings and news. If something is missing, say so. Never invent numbers.
- The user's holdings are listed below with their type (crypto or stock). Answer questions about them from that list.
- For "what should I buy": choose from the ranking, 1–2 lines per pick (score, chance, trend, risk), suggest a sensible practice amount (max ~10–15% of the portfolio per position, keep cash).
- To propose a practice order, put on its own line exactly: [[order side=buy sym=AAPL eur=100]] (side buy or sell; for selling everything use all=1). Any coin or stock symbol from the data may be used. Max 3 orders.
- Only suggest buying assets with a positive model score. If nothing scores positive, say so and suggest waiting or a small position.
- Keep it under ~170 words unless asked for depth. Short paragraphs or a few bullets; no tables, no headings. Do not add a disclaimer; the app adds one.
${ctx}`;
  return `Je bent Vantis AI, de marktassistent in de Vantis-app. Antwoord ALLEEN in het Nederlands, informeel (je/jij, nooit u), kort en duidelijk.
Regels:
- Gebruikers handelen tot de officiële lancering met oefengeld (€ 10.000 om te beginnen). Orders die jij voorstelt, worden alleen op die oefenportefeuille uitgevoerd, nadat de gebruiker op bevestigen tikt.
- De cijfers van het "Vantis-model" hieronder zijn statistische vooruitzichten (trend, momentum, RSI, beweeglijkheid), getest op de eigen historie van elke munt of elk aandeel: kansen, geen zekerheden. Beweer nooit dat je de toekomst weet; noem de kans, de bandbreedte en de trefkans van het model.
- Gebruik alleen de gegevens hieronder voor koersen, bezit en nieuws. Ontbreekt iets, zeg dat dan. Verzin nooit getallen.
- Het bezit van de gebruiker staat hieronder met het soort (crypto of aandeel). Beantwoord vragen daarover vanuit die lijst.
- Bij "wat moet ik kopen": kies uit de ranglijst, 1–2 regels per keuze (score, kans, trend, risico), en stel een verstandig oefenbedrag voor (max. zo'n 10–15% van de portefeuille per positie, houd saldo vrij).
- Een oefenorder stel je voor met op een eigen regel precies: [[order side=buy sym=AAPL eur=100]] (side buy of sell; alles verkopen met all=1). Elk symbool uit de gegevens mag. Max. 3 orders.
- Stel alleen kopen voor bij een positieve modelscore. Scoort niets positief, zeg dat dan en raad afwachten of een kleine positie aan.
- Houd het onder de ~170 woorden, tenzij om meer diepgang wordt gevraagd. Korte alinea's of een paar opsommingstekens; geen tabellen, geen kopjes. Zet er zelf geen disclaimer onder; dat doet de app.
${ctx}`;
}

/* acties uit het antwoord halen: [[order side=buy sym=BTC eur=500]] */
function parseOrders(text, st, P) {
  const acts = []; const known = new Set([...(st.tickers?.list || []).map(x => x.s), ...STOCK_ALL]);
  const clean = text.replace(/\[\[\s*order([^\]]*)\]\]/gi, (m, a) => { const o = Object.fromEntries([...a.matchAll(/(\w+)=([\w.]+)/g)].map(x => [x[1].toLowerCase(), x[2]]));
    const sym = String(o.sym || '').toUpperCase(); const side = o.side === 'sell' ? 'sell' : 'buy'; const eur = o.eur != null ? r2(+o.eur) : null; const all = o.all === '1' || o.all === 'true';
    if (known.has(sym) && acts.length < 3 && (all || eur >= 1)) { if (side === 'sell' && !(P.holdings || {})[sym]) return ''; acts.push({ side, sym, eur: all ? null : eur, all: side === 'sell' && all, kind: STOCK_ALL.includes(sym) && !(st.tickers?.list || []).some(x => x.s === sym) ? 'stock' : 'crypto' }); }
    return ''; }).replace(/\n{3,}/g, '\n\n').trim();
  return { text: clean, acts };
}

/* zonder taalmodel: een nette samenvatting uit het model */
const LBL_EN = { positief: 'positive', 'licht positief': 'slightly positive', neutraal: 'neutral', 'licht negatief': 'slightly negative', negatief: 'negative' };
const TR_EN = { 'boven 20- en 50-daags gemiddelde': 'above the 20- and 50-day average', 'boven 50-daags gemiddelde': 'above the 50-day average', 'onder 50-daags gemiddelde': 'below the 50-day average' };
const nf = (n, en, d = 1) => n == null ? '?' : Number(n).toLocaleString(en ? 'en-GB' : 'nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: d });
function plainReply(en, fs, picks) {
  const line = f => `${f.sym}: ${en ? 'outlook' : 'vooruitzicht'} ${en ? LBL_EN[f.label] : f.label} (score ${f.score}), ${en ? 'chance higher in 7 days' : 'kans hoger over 7 dagen'} ${nf(f.pUp, en)}%, ${en ? 'likely range' : 'waarschijnlijke bandbreedte'} ${nf(f.range[0], en)}% ${en ? 'to' : 'tot'} ${nf(f.range[1], en)}%. ${f.rsi != null ? `RSI ${f.rsi}, ${en ? TR_EN[f.trend] || f.trend : f.trend}.` : ''}${f.hitRate != null ? ` ${en ? 'Historical hit rate' : 'Historische trefkans'} ${nf(f.hitRate, en)}%.` : ''}`;
  const disc = en ? 'Educational model outlook, not personal financial advice.' : 'Educatief modelvooruitzicht, geen persoonlijk financieel advies.';
  if (picks) { const good = picks.filter(f => f.score >= 15 && f.pUp > 51);
    if (!good.length) return (en ? 'Right now the Vantis model sees no clear buying opportunities: most assets are in a downtrend or neutral. Waiting, or buying small amounts in steps, is often wiser in that situation.\n\nWeakest right now: ' : 'Op dit moment ziet het Vantis-model geen duidelijke koopkansen: de meeste munten en aandelen zitten in een dalende trend of zijn neutraal. Afwachten, of in kleine stappen kopen, is dan vaak verstandiger.\n\nNu het zwakst: ') + picks.slice(-3).map(f => `${f.sym} (${f.score})`).join(', ') + '\n\n' + disc;
    return (en ? 'According to the Vantis model these look strongest right now:\n' : 'Volgens het Vantis-model zien deze er nu het sterkst uit:\n') + good.slice(0, 3).map(f => '• ' + line(f)).join('\n') + '\n\n' + disc; }
  if (fs.length) return fs.map(line).join('\n\n') + '\n\n' + disc;
  return en ? 'Ask me about a coin or stock (for example "what will BTC do this week?") or "what should I buy?".' : 'Vraag me naar een munt of aandeel (bijvoorbeeld "wat doet BTC deze week?") of "wat moet ik kopen?".';
}

/* ---------- autopilot ---------- */
const RISK = { voorzichtig: { buy: 40, sell: -20, maxPos: 4, size: .08, stop: -8 }, normaal: { buy: 30, sell: -15, maxPos: 6, size: .12, stop: -12 }, actief: { buy: 20, sell: -10, maxPos: 8, size: .16, stop: -18 } };
async function autoRun(env, uid, cfg, st, R) {
  const a = await account(env, uid, st);
  const H = JSON.parse(a.holdings || '{}'); const rk = RISK[cfg.risk] || RISK.normaal; const by = Object.fromEntries(R.list.map(f => [f.sym, f])); const done = [];
  const value = a.cash + Object.entries(H).reduce((s, [k, h]) => s + (quote(st, k)?.p || h.cost / h.qty) * h.qty, 0);
  const pxOf = s => { const q = quote(st, s); if (!q) return null; if (q.cur === 'USD') { const fx = st.fx?.v; return fx ? q.p / fx : null; } return q.p; };
  for (const [s, h] of Object.entries(H)) { if (!h.auto) continue; const f = by[s]; const p = pxOf(s); if (!p) continue; const ret = (p * h.qty / h.cost - 1) * 100;
    const why = ret <= rk.stop ? `stop-loss geraakt (${r2(ret)}%)` : f && f.score <= rk.sell ? `model draait naar ${f.label} (score ${f.score})` : null;
    if (why) { try { const t = await execTrade(env, uid, { sym: s, side: 'sell', all: true, kind: h.k || 'crypto', note: 'Autopilot: ' + why }, { p, src: 'Vantis AI' }, 'ai', st); done.push({ ...t, why }); delete H[s]; } catch (e) { } } }
  const held = Object.keys(H).length; let cash = (await env.DB.prepare('SELECT cash FROM paper WHERE user_id=?').bind(uid).first()).cash;
  const universe = R.list.filter(f => (cfg.universe === 'crypto' ? f.kind === 'crypto' : cfg.universe === 'stocks' ? f.kind === 'stock' : true) && f.score >= rk.buy && !H[f.sym] && (f.hitRate == null || f.hitRate >= 50));
  for (const f of universe.slice(0, Math.max(0, rk.maxPos - held))) {
    const eur = r2(Math.min(cfg.max || 1000, value * rk.size)); if (cash - eur < value * .2 || eur < 10) break; const p = pxOf(f.sym); if (!p) continue;
    try { const t = await execTrade(env, uid, { sym: f.sym, side: 'buy', eur, kind: f.kind, note: `Autopilot: ${f.label} (score ${f.score}, kans ${f.pUp}%)` }, { p, src: 'Vantis AI' }, 'ai', st); cash -= eur * 1.0025; done.push({ ...t, why: `score ${f.score}, kans hoger ${f.pUp}%` });
      const row = await env.DB.prepare('SELECT holdings FROM paper WHERE user_id=?').bind(uid).first(); const H2 = JSON.parse(row.holdings || '{}'); if (H2[f.sym]) { H2[f.sym].auto = 1; await env.DB.prepare('UPDATE paper SET holdings=? WHERE user_id=?').bind(JSON.stringify(H2), uid).run(); } } catch (e) { }
  }
  return done;
}
export async function aiCron(env, st) {
  const rows = (await env.DB.prepare("SELECT key,val FROM kv WHERE key LIKE 'auto:%'").all()).results.map(r => ({ uid: r.key.slice(5), cfg: JSON.parse(r.val) })).filter(r => r.cfg.on);
  const due = rows.filter(r => Date.now() - (r.cfg.last || 0) >= (r.cfg.every || 4) * HOUR).slice(0, 8); if (!due.length) return { users: 0 };
  const R = await ranking(env, st); let trades = 0;
  for (const r of due) { const done = await autoRun(env, r.uid, r.cfg, st, R).catch(() => []); trades += done.length; r.cfg.last = Date.now();
    const log = (r.cfg.log || []).concat(done.map(t => ({ t: t.t, side: t.side, sym: t.sym, eur: t.eur, why: t.why }))).slice(-30); r.cfg.log = log;
    await kvPutStmt(env, 'auto:' + r.uid, r.cfg).run();
    if (done.length) await notifyUser(env, r.uid, { title: `Autopilot: ${done.length} ${done.length === 1 ? 'transactie' : 'transacties'}`, body: done.map(t => `${t.side === 'buy' ? 'Gekocht' : 'Verkocht'} ${t.sym} (€ ${t.eur.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`).join(', '), url: '/app#handel', tag: 'auto:' + Date.now() }); }
  return { users: due.length, trades };
}

/* ---------- vaste antwoorden zonder taalmodel: orders en portefeuille ---------- */
const isStockSym = (st, s) => STOCK_ALL.includes(s) && !(st.tickers?.list || []).some(x => x.s === s);
function knownSym(st, word) { const w = String(word || '').toUpperCase().replace(/[^A-Z0-9.]/g, ''); const known = new Set([...(st.tickers?.list || []).map(x => x.s), ...STOCK_ALL]); if (known.has(w)) return w; const a = ALIAS[String(word || '').toLowerCase()]; return a && known.has(a) ? a : null; }
/* "koop 100 aan aapl", "koop maar voor €250 btc", "buy 50 of eth", "verkoop alle sol", "sell all btc", "koop er 100 van" (vorige suggestie) */
function orderIntent(q, st, lastSym) {
  const t = q.toLowerCase().replace(/€\s*/g, '').replace(/,(\d)/g, '.$1');
  const side = /\b(verkoop|verkopen|sell)\b/.test(t) ? 'sell' : /\b(koop|kopen|buy|instappen)\b/.test(t) ? 'buy' : null; if (!side) return null;
  if (/\b(welke|wat|which|what|should|moet ik|zou ik)\b/.test(t) && !/\d/.test(t) && !/\b(alle?s?|all)\b/.test(t)) return null; // dat is een vraag om advies
  const all = side === 'sell' && /\b(alle|alles|all|everything)\b/.test(t);
  const am = t.match(/(\d+(?:\.\d+)?)\s*(k\b)?\s*(euro|eur)?/); let eur = am ? +am[1] * (am[2] ? 1000 : 1) : null;
  let sym = null; for (const w of t.split(/[^a-z0-9.&]+/)) { if (!w || /^\d/.test(w) || ['koop', 'kopen', 'buy', 'sell', 'verkoop', 'verkopen', 'maar', 'aan', 'van', 'voor', 'of', 'worth', 'euro', 'eur', 'alle', 'alles', 'all', 'mijn', 'my', 'er', 'dan', 'ok', 'oke', 'oké', 'graag', 'wel', 'in', 'the', 'some', 'wat', 'je', 'een', 'please', 'pls'].includes(w)) continue; const k = knownSym(st, w); if (k) { sym = k; break; } }
  if (!sym) sym = lastSym || null; if (!sym || (!all && !(eur > 0))) return null;
  return { side, sym, eur: all ? null : Math.round(eur * 100) / 100, all, kind: isStockSym(st, sym) ? 'stock' : 'crypto' };
}
const WANTS_PORTFOLIO = /(portefeuille|portfolio|wat\s+(voor\s+)?(crypto|aandelen|munten|posities)\s+heb\s+ik|welke\s+(crypto|aandelen|munten|posities)\s+heb\s+ik|mijn\s+(posities|bezit|holdings)|what\s+(crypto|stocks|coins)?\s*do\s+i\s+(own|have|hold)|my\s+(holdings|positions)|hoe\s+sta\s+ik\s+ervoor|how\s+am\s+i\s+doing)/i;
function portfolioReply(en, P, st) {
  const f = (n, d = 2) => Number(n).toLocaleString(en ? 'en-GB' : 'nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d }); const eur = n => (en ? '€' : '€ ') + f(n); const pc = n => (n >= 0 ? '+' : '−') + f(Math.abs(n), 1) + '%';
  const rows = Object.entries(P.holdings).map(([k, h]) => { const q = quote(st, k); let px = q ? q.p : null; if (q && q.cur === 'USD' && st.fx?.v) px = q.p / st.fx.v; const val = px ? px * h.qty : h.cost; return { k, kind: (h.k || 'crypto') === 'stock' ? 'stock' : 'crypto', val, cost: h.cost, ret: (val / h.cost - 1) * 100 }; }).sort((a, b) => b.val - a.val);
  const total = P.cash + rows.reduce((s, r) => s + r.val, 0);
  if (!rows.length) return en ? `You don't hold any positions yet. Your available balance is ${eur(P.cash)}. Ask me "what should I buy?" or tell me what to buy, for example "buy 100 of BTC".` : `Je hebt nog geen posities. Je vrije saldo is ${eur(P.cash)}. Vraag "wat moet ik kopen?" of zeg wat je wilt kopen, bijvoorbeeld "koop 100 aan BTC".`;
  const part = kind => rows.filter(r => r.kind === kind).map(r => `• **${r.k}**: ${eur(r.val)} (${pc(r.ret)})`).join('\n');
  const c = part('crypto'), s2 = part('stock');
  return (en ? `Your practice portfolio is worth **${eur(total)}** (${pc((total / 10000 - 1) * 100)} since the start), with ${eur(P.cash)} available.` : `Je oefenportefeuille is **${eur(total)}** waard (${pc((total / 10000 - 1) * 100)} sinds de start), met ${eur(P.cash)} vrij saldo.`)
    + (c ? `\n\n${en ? 'Crypto' : 'Crypto'}:\n${c}` : `\n\n${en ? 'No crypto right now.' : 'Je hebt nu geen crypto.'}`) + (s2 ? `\n\n${en ? 'Stocks' : 'Aandelen'}:\n${s2}` : '');
}
const DISC = { en: 'Educational model outlook, not personal financial advice.', nl: 'Educatief modelvooruitzicht, geen persoonlijk financieel advies.' };
const stripDisc = t => t.split('\n').filter(l => !/(not (personal )?financial advice|geen (persoonlijk )?(financieel |beleggings)advies|educational model outlook|educatief modelvooruitzicht)/i.test(l)).join('\n').trim();

/* ---------- API ---------- */
export async function handleAI(req, env, s, p, m, url, ctx) {
  if (p === '/api/ai/selftest' && m === 'POST') { // GitHub-workflow: controleert of het taalmodel werkt (sleutel = SHA-256 van de bot-token)
    const k = req.headers.get('x-setup-key') || ''; const h = env.DISCORD_BOT_TOKEN ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.DISCORD_BOT_TOKEN)))].map(b => b.toString(16).padStart(2, '0')).join('') : null;
    if (!h || k !== h) return err(403, 'Geen toegang.'); const st = await kv(env, ['tickers', 'names', 'candles', 'xquotes', 'stocks', 'fx']); const rk = await ranking(env, st).catch(() => ({ list: [] }));
    const ctxt = 'Oefenportefeuille: vrij saldo € 9.000; posities: AAPL (aandeel/stock): waarde € 500; VVV (crypto, Venice Token): waarde € 300.\nRanglijst Vantis-model:\n' + (rk.list || []).slice(0, 6).map(f => '- ' + fmtF(f, true)).join('\n');
    const out = []; for (const [en, q] of [[true, 'Which stock should I buy now?'], [false, 'welke crypto heb ik en wat zou je kopen?']]) { const t0 = Date.now(); let r = null, e = null; try { r = await llm(env, systemPrompt(en, ctxt), [{ role: 'user', content: q }]); } catch (x) { e = x.message; } out.push({ q, ms: Date.now() - t0, engine: r?.engine, text: r?.text, error: e }); }
    return json({ out }); }
  if (!p.startsWith('/api/ai')) return null;
  if (p === '/api/ai/forecast' && m === 'GET') { const sym = String(url.searchParams.get('sym') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); const st = await kv(env, ['tickers', 'names', 'candles', 'xquotes', 'stocks', 'fx']); const f = await forecast(env, sym, st); return f ? json(f) : err(404, 'Te weinig koershistorie voor een voorspelling.'); }
  if (!s) return err(401, 'Log in om Vantis AI te gebruiken.');
  if (p === '/api/ai/ranking' && m === 'GET') { const st = await kv(env, ['tickers', 'names', 'candles', 'xquotes', 'stocks', 'fx']); return json(await ranking(env, st)); }
  if (p === '/api/ai/autopilot') {
    const key = 'auto:' + s.user_id; const row = await env.DB.prepare('SELECT val FROM kv WHERE key=?').bind(key).first(); const cfg = row ? JSON.parse(row.val) : { on: false, risk: 'normaal', universe: 'alles', max: 1000, every: 4, log: [] };
    if (m === 'GET') return json(cfg);
    if (m === 'PUT') { const b = await readJSON(req); cfg.on = !!b.on; cfg.risk = RISK[b.risk] ? b.risk : 'normaal'; cfg.universe = ['crypto', 'stocks', 'alles'].includes(b.universe) ? b.universe : 'alles'; cfg.max = clamp(+b.max || 1000, 25, 5000); cfg.every = [1, 4, 12, 24].includes(+b.every) ? +b.every : 4; if (cfg.on && !b.keepLast) cfg.last = 0;
      await kvPutStmt(env, key, cfg).run();
      if (cfg.on && b.runNow) { const st = await kv(env, ['tickers', 'names', 'candles', 'xquotes', 'stocks', 'fx']); const R = await ranking(env, st); const done = await autoRun(env, s.user_id, cfg, st, R); cfg.last = Date.now(); cfg.log = (cfg.log || []).concat(done.map(t => ({ t: t.t, side: t.side, sym: t.sym, eur: t.eur, why: t.why }))).slice(-30); await kvPutStmt(env, key, cfg).run(); return json({ ...cfg, ran: done }); }
      return json(cfg); }
  }
  if (p === '/api/ai/chat' && m === 'POST') {
    const cap = [60, 60, 80, 120, 300, 100000][tierRank(s.plan)] || 60; const wait = await limited(env, 'ai:' + s.user_id, cap, DAY); if (wait) return err(429, 'Je hebt vandaag het maximum aantal vragen aan Vantis AI bereikt. Morgen kun je weer verder.');
    await bump(env, 'ai:' + s.user_id, DAY);
    const b = await readJSON(req, 64 * 1024); let en = b.lang !== 'nl';
    const msgs = (Array.isArray(b.messages) ? b.messages : []).filter(x => x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string').slice(-10).map(x => ({ role: x.role, content: x.content.slice(0, 2000) }));
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return err(400, 'Stel een vraag.');
    const q = msgs[msgs.length - 1].content;
    { const w = q.toLowerCase().match(/[a-zà-ü']+/g) || []; const NL = new Set(['ik', 'je', 'jij', 'wat', 'welke', 'moet', 'heb', 'mijn', 'koop', 'kopen', 'verkoop', 'maar', 'aan', 'nu', 'het', 'een', 'de', 'van', 'voor', 'zou', 'nog', 'hoe', 'waarom', 'gaat', 'niet', 'ook', 'dat', 'deze', 'graag', 'oke', 'oké', 'nieuws', 'aandelen', 'munten', 'gebaseerd', 'op', 'er', 'wel', 'kun', 'kan', 'doen', 'stuk', 'welk']); const EN = new Set(['i', 'you', 'what', 'which', 'should', 'have', 'my', 'buy', 'sell', 'the', 'a', 'of', 'for', 'now', 'how', 'why', 'will', 'not', 'is', 'do', 'does', 'can', 'it', 'based', 'on', 'news', 'stocks', 'coins', 'some', 'please']);
      const n = w.filter(x => NL.has(x)).length, e = w.filter(x => EN.has(x)).length; if (n > e) en = false; else if (e > n) en = true; }
    const st = await kv(env, ['tickers', 'names', 'candles', 'xquotes', 'stocks', 'fx', 'extra', 'news', 'briefing']);
    const P0 = await env.DB.prepare('SELECT cash,holdings FROM paper WHERE user_id=?').bind(s.user_id).first() || { cash: 10000, holdings: '{}' }; const PP = { cash: P0.cash, holdings: JSON.parse(P0.holdings || '{}') };
    const lastSym = (Array.isArray(b.lastActions) && b.lastActions[0] && b.lastActions[0].sym) || symbolsIn(msgs.slice(0, -1).map(x => x.content).join(' '), st).slice(-1)[0] || null;
    const oi = orderIntent(q, st, lastSym);
    if (oi) { if (oi.side === 'sell' && !PP.holdings[oi.sym]) return json({ reply: en ? `You don't hold any ${oi.sym}, so there's nothing to sell.` : `Je hebt geen ${oi.sym}, dus er valt niets te verkopen.`, actions: [], forecasts: [], engine: 'vantis' });
      if (oi.side === 'buy' && oi.eur > PP.cash) return json({ reply: en ? `You only have €${r2(PP.cash)} available, so ${oi.eur} won't fit. Try a smaller amount.` : `Je hebt maar € ${r2(PP.cash)} vrij saldo, dus ${oi.eur} past niet. Probeer een kleiner bedrag.`, actions: [], forecasts: [], engine: 'vantis' });
      const f = await forecast(env, oi.sym, st, budget(4)).catch(() => null);
      const what = oi.all ? (en ? `all your ${oi.sym}` : `al je ${oi.sym}`) : `€${en ? '' : ' '}${oi.eur} ${en ? 'of' : 'aan'} ${oi.sym}`;
      return json({ reply: en ? `Ready: ${oi.side === 'buy' ? 'buy' : 'sell'} ${what} with practice money. Tap the button to confirm.` : `Klaar: ${oi.side === 'buy' ? 'koop' : 'verkoop'} ${what} met oefengeld. Tik op de knop om te bevestigen.`, actions: [oi], forecasts: f ? [f] : [], engine: 'vantis' }); }
    if (WANTS_PORTFOLIO.test(q) && !/kopen|buy|verkopen|sell/i.test(q)) return json({ reply: portfolioReply(en, PP, st), actions: [], forecasts: [], engine: 'vantis' });
    const syms = symbolsIn(q, st); const bb = budget(10); const fs = []; for (const sy of syms) { const f = await forecast(env, sy, st, bb).catch(() => null); if (f) fs.push(f); }
    let picks = WANTS_PICKS.test(q) || (/kopen|buy/i.test(q) && !syms.length) ? (await ranking(env, st)).list : null;
    if (picks) { const wantS = /\b(stocks?|aandel(en)?|shares?|equit)/i.test(q), wantC = /\b(crypto|coins?|munt(en)?|tokens?)\b/i.test(q); if (wantS !== wantC) { const f2 = picks.filter(f => (f.kind === 'stock') === wantS); if (f2.length) picks = f2; } }
    const P = await env.DB.prepare('SELECT cash,holdings FROM paper WHERE user_id=?').bind(s.user_id).first() || { cash: 10000, holdings: '{}' }; P.holdings = JSON.parse(P.holdings || '{}');
    const pv = Object.entries(P.holdings).map(([k, h]) => { const qq = quote(st, k); const val = qq ? qq.p * h.qty : h.cost; return `${k} (${(h.k || 'crypto') === 'stock' ? 'aandeel/stock' : 'crypto'}, ${st.names?.[k] || k}): waarde € ${r2(val)}, inleg € ${r2(h.cost)}, resultaat ${r2((val / h.cost - 1) * 100)}%`; });
    const fng = st.extra?.fng?.[0]; const news = (st.news?.items || []).filter(n => Date.now() - n.t < 36 * HOUR && (!syms.length || syms.some(sy => (n.title + ' ' + (n.body || '')).toUpperCase().includes(sy) || (st.names?.[sy] && (n.title || '').toLowerCase().includes(st.names[sy].toLowerCase()))))).slice(0, 5);
    const ctxt = [`Datum: ${new Date().toISOString().slice(0, 10)}.`,
      `Oefenportefeuille van de gebruiker: vrij saldo € ${r2(P.cash)}${pv.length ? '; posities: ' + pv.join('; ') : '; nog geen posities'}.`,
      fng ? `Fear & Greed-index crypto: ${fng.v} (${fng.l}).` : '', st.briefing?.headline ? `Ochtendbriefing vandaag: ${st.briefing.headline}` : '',
      fs.length ? 'Vantis-model voor genoemde symbolen:\n' + fs.map(f => '- ' + fmtF(f, en)).join('\n') : syms.length ? `Geen modeldata voor ${syms.join(', ')}.` : '',
      picks ? 'Ranglijst Vantis-model (hoogste score eerst, 7 dagen):\n' + picks.slice(0, 8).map(f => '- ' + fmtF(f, en)).join('\n') + (picks.length > 8 ? `\nLaagste scores: ${picks.slice(-3).map(f => f.sym + ' ' + f.score).join(', ')}` : '') : '',
      news.length ? 'Recent nieuws:\n' + news.map(n => `- ${n.title} (${n.src || n.feed || ''})`).join('\n') : ''].filter(Boolean).join('\n');
    let out = null; try { out = await llm(env, systemPrompt(en, ctxt), msgs); } catch (e) { out = null; }
    const raw = out && out.text ? out.text : plainReply(en, fs, picks);
    const { text, acts } = parseOrders(raw, st, P);
    if (!acts.length && !out && picks && picks.length) for (const f of picks.slice(0, 2)) if (f.score >= 15 && f.pUp > 51) acts.push({ side: 'buy', sym: f.sym, eur: r2(Math.min(1000, P.cash * .1)), kind: f.kind });
    const advice = fs.length || (picks && picks.length) || acts.length; const reply = stripDisc(text) + (advice ? '\n\n' + DISC[en ? 'en' : 'nl'] : '');
    return json({ reply, actions: acts, forecasts: fs.length ? fs : (picks || []).slice(0, 5), engine: out ? out.engine : 'model' });
  }
  return null;
}
