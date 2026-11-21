// Ronde 3: nieuwsalerts op trefwoord en het wekelijkse e-mailoverzicht (Discord staat in discord.js).
import { json, err, readJSON, sha256, kvPutStmt, DAY, HOUR, MIN } from './lib.js';
import { quote, RADAR } from './market.js';

const nl = (n, d = 2) => n == null || !isFinite(n) ? '—' : Number(n).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = n => n == null || !isFinite(n) ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + nl(Math.abs(n), 1) + '%';
const eurF = n => n == null || !isFinite(n) ? '—' : '€ ' + Number(n).toLocaleString('nl-NL', { minimumFractionDigits: n >= 1 ? 2 : 4, maximumFractionDigits: n >= 1 ? 2 : 6 });
const escH = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function kv(env, keys) { const r = await env.DB.prepare(`SELECT key,val FROM kv WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all(); const o = {}; for (const x of r.results) o[x.key] = JSON.parse(x.val); return o; }
function quietNow(st) { if (!st.quiet) return false; const n = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })); const m = n.getHours() * 60 + n.getMinutes(); const [fh, fm] = (st.quietFrom || '23:00').split(':').map(Number), [th, tm] = (st.quietTo || '07:00').split(':').map(Number); const f = fh * 60 + fm, t = th * 60 + tm; return f < t ? (m >= f && m < t) : (m >= f || m < t); }

/* ---------------- 16. nieuws op trefwoord ---------------- */
export async function newsKw(env, state, status) {
  const items = (state.news && state.news.items) || []; if (!items.length) { status.newsKw = { ok: true, items: 0 }; return {}; }
  const seenRow = await env.DB.prepare("SELECT val FROM kv WHERE key='kwSeen'").first(); const seen = new Set(seenRow ? JSON.parse(seenRow.val) : []); const first = !seenRow;
  const fresh = items.filter(x => !seen.has(x.id) && Date.now() - x.t < 12 * HOUR); await kvPutStmt(env, 'kwSeen', items.slice(0, 300).map(x => x.id)).run();
  if (first || !fresh.length) { status.newsKw = { ok: true, fresh: fresh.length, first }; return {}; }
  const rows = (await env.DB.prepare("SELECT user_id,settings,watch FROM prefs WHERE settings LIKE '%\"kw\"%' OR settings LIKE '%\"kwWatch\":true%'").all()).results;
  const out = {}; let hits = 0;
  for (const r of rows) { const st = JSON.parse(r.settings || '{}'); if (quietNow(st)) continue;
    const words = (Array.isArray(st.kw) ? st.kw : []).map(w => String(w).trim()).filter(w => w.length >= 2).slice(0, 25);
    if (st.kwWatch) for (const s of JSON.parse(r.watch || '[]').slice(0, 30)) { words.push(s); const nm = state.names && state.names[s]; if (nm && nm.length > 3) words.push(nm); }
    if (!words.length) continue; const res = words.map(w => [w, new RegExp('(^|[^\\p{L}\\p{N}])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}\\p{N}])', w.length <= 4 && w === w.toUpperCase() ? 'u' : 'iu')]);
    let n = 0; for (const it of fresh) { if (n >= 3) break; const txt = it.title + ' ' + (it.body || ''); const m = res.find(([, re]) => re.test(txt)); if (!m) continue; n++; hits++;
      (out[r.user_id] = out[r.user_id] || []).push({ key: 'news:' + it.id, tag: 'news-' + String(it.id).slice(-24), cat: 'news', url: '/app#nieuws', link: it.url, title: `Nieuws over "${m[0]}"`, body: `${it.title} · ${it.src || it.feed || ''}` }); } }
  status.newsKw = { ok: true, fresh: fresh.length, users: rows.length, hits }; return out;
}


/* ---------------- 18. wekelijks e-mailoverzicht ---------------- */
export const mailReady = env => !!(env.RESEND_API_KEY && env.MAIL_FROM);
async function unsubSig(env, uid) { return (await sha256('vantis-unsub:' + uid + ':' + (env.ENC_KEY || 'x'))).slice(0, 32); }
function weekFigures(st) { const C = st.candles || {}; const out = []; for (const t of (st.tickers?.list || []).slice(0, 40)) { const c = C[t.s]; if (!c || !c.c || c.c.length < 8) continue; const ref = c.c[c.c.length - 7]; out.push({ s: t.s, name: st.names?.[t.s] || t.s, p: t.p, w: (t.p / ref - 1) * 100 }); } return out; }
export async function buildWeekly(env, uid, st, base) {
  const user = await env.DB.prepare('SELECT u.name,u.email,p.watch FROM users u LEFT JOIN prefs p ON p.user_id=u.id WHERE u.id=?').bind(uid).first(); if (!user) return null;
  const W = base || weekFigures(st); const by = Object.fromEntries(W.map(x => [x.s, x])); const btc = by.BTC, eth = by.ETH; const srt = W.slice().sort((a, b) => b.w - a.w);
  const watch = JSON.parse(user.watch || '[]').map(s => by[s]).filter(Boolean).slice(0, 10);
  const pa = await env.DB.prepare('SELECT cash,holdings FROM paper WHERE user_id=?').bind(uid).first(); let pf = null;
  if (pa) { const H = JSON.parse(pa.holdings || '{}'); let v = pa.cash; for (const [s2, h] of Object.entries(H)) { const t = (st.tickers?.list || []).find(x => x.s === s2); v += t ? t.p * h.qty : h.cost; } const w0 = await env.DB.prepare('SELECT value FROM paper_hist WHERE user_id=? AND t<=? ORDER BY t DESC LIMIT 1').bind(uid, Date.now() - 7 * DAY).first(); pf = { v, w: w0 ? (v / w0.value - 1) * 100 : null, n: Object.keys(H).length }; }
  const next = RADAR.filter(e => e.t > Date.now() && e.t < Date.now() + 8 * DAY).slice(0, 5); const ul = (st.unlocks?.events || []).filter(e => e.t > Date.now() && e.t < Date.now() + 8 * DAY).slice(0, 5);
  const origin = env.PUBLIC_URL || 'https://vantis.rijnstadmarketing.workers.dev'; const unsub = `${origin}/api/mail/unsub?u=${encodeURIComponent(uid)}&s=${await unsubSig(env, uid)}`;
  const row = (l, r, c) => `<tr><td style="padding:7px 0;border-bottom:1px solid #E2E7EE">${l}</td><td style="padding:7px 0;border-bottom:1px solid #E2E7EE;text-align:right;font-variant-numeric:tabular-nums;${c ? 'color:' + c : ''}">${r}</td></tr>`;
  const col = n => n > 0 ? '#0A8754' : n < 0 ? '#CC3340' : '#566275';
  const sec = (t, inner) => inner ? `<h2 style="font:600 16px Inter,Arial,sans-serif;margin:26px 0 8px;color:#0E1828">${t}</h2>${inner}` : '';
  const html = `<!doctype html><html lang="nl"><body style="margin:0;background:#F5F7FA;font:15px/1.5 Inter,Arial,sans-serif;color:#0E1828"><div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#17243A;color:#fff;padding:22px 24px;border-radius:6px 6px 0 0"><div style="font:700 13px Arial;letter-spacing:.08em;opacity:.8">VANTIS · WEEKOVERZICHT</div><div style="font:600 22px Inter,Arial;margin-top:6px">Hoi ${escH((user.name || '').split(' ')[0] || 'daar')}, zo was de week</div></div>
    <div style="background:#fff;padding:8px 24px 24px;border:1px solid #E2E7EE;border-top:0;border-radius:0 0 6px 6px">
    ${sec('De markt', `<table width="100%" cellspacing="0">${btc ? row('Bitcoin', `${eurF(btc.p)} <b>${pct(btc.w)}</b>`, col(btc.w)) : ''}${eth ? row('Ethereum', `${eurF(eth.p)} <b>${pct(eth.w)}</b>`, col(eth.w)) : ''}</table>`)}
    ${sec('Grootste stijgers (7 dagen)', `<table width="100%" cellspacing="0">${srt.slice(0, 3).map(x => row(escH(x.name), pct(x.w), col(x.w))).join('')}</table>`)}
    ${sec('Grootste dalers (7 dagen)', `<table width="100%" cellspacing="0">${srt.slice(-3).reverse().map(x => row(escH(x.name), pct(x.w), col(x.w))).join('')}</table>`)}
    ${watch.length ? sec('Je watchlist', `<table width="100%" cellspacing="0">${watch.map(x => row(escH(x.name), `${eurF(x.p)} ${pct(x.w)}`, col(x.w))).join('')}</table>`) : ''}
    ${pf ? sec('Je oefenportefeuille', `<p style="margin:0">Waarde <b>${eurF(pf.v)}</b>${pf.w != null ? ` · <span style="color:${col(pf.w)}">${pct(pf.w)}</span> deze week` : ''} · ${pf.n} posities</p>`) : ''}
    ${next.length ? sec('Komende week', `<table width="100%" cellspacing="0">${next.map(e => row(escH(e.title), new Date(e.t).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))).join('')}</table>`) : ''}
    ${ul.length ? sec('Token-unlocks komende week', `<table width="100%" cellspacing="0">${ul.map(e => row(`${escH(e.sym)} · ${nl(e.tokens, 0)} tokens`, new Date(e.t).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }))).join('')}</table>`) : ''}
    <p style="margin:28px 0 0"><a href="${origin}" style="display:inline-block;background:#17243A;color:#fff;text-decoration:none;padding:11px 18px;border-radius:3px;font-weight:600">Open Vantis</a></p>
    <p style="font-size:12px;color:#8A95A6;margin-top:24px">Vantis geeft marktinformatie, geen financieel advies. Je krijgt deze mail omdat je het weekoverzicht hebt aangezet. <a href="${unsub}" style="color:#8A95A6">Afmelden</a></p></div></div></body></html>`;
  return { to: user.email, subject: `Vantis weekoverzicht: Bitcoin ${btc ? pct(btc.w) : ''} deze week`.trim(), html, unsub };
}
export async function weekly(env, status = {}) {
  if (!mailReady(env)) { status.mail = 'niet ingesteld'; return; }
  const st = await kv(env, ['tickers', 'candles', 'names', 'unlocks']); const base = weekFigures(st);
  const rows = (await env.DB.prepare("SELECT user_id FROM prefs WHERE settings LIKE '%\"weekmail\":true%' LIMIT 95").all()).results; const batch = [];
  for (const r of rows) { const m = await buildWeekly(env, r.user_id, st, base); if (m) batch.push({ from: env.MAIL_FROM, to: [m.to], subject: m.subject, html: m.html, headers: { 'List-Unsubscribe': `<${m.unsub}>` } }); }
  if (!batch.length) { status.mail = 'geen ontvangers'; return; }
  const r = await fetch('https://api.resend.com/emails/batch', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify(batch) });
  status.mail = r.ok ? `verstuurd: ${batch.length}` : 'fout ' + r.status + ' ' + (await r.text()).slice(0, 200);
  await kvPutStmt(env, 'mailstatus', { t: Date.now(), status: status.mail }).run();
}
export async function mailApi(req, env, s, p, m, url) {
  if (p === '/api/mail/unsub' && m === 'GET') { const uid = url.searchParams.get('u') || ''; const ok = uid && url.searchParams.get('s') === await unsubSig(env, uid);
    if (ok) { const r = await env.DB.prepare('SELECT settings FROM prefs WHERE user_id=?').bind(uid).first(); const st = JSON.parse(r?.settings || '{}'); st.weekmail = false; await env.DB.prepare('UPDATE prefs SET settings=?,updated=? WHERE user_id=?').bind(JSON.stringify(st), Date.now(), uid).run(); }
    return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font:16px/1.5 Arial;max-width:480px;margin:60px auto;padding:0 20px;color:#0E1828"><h1 style="font-size:22px">${ok ? 'Je bent afgemeld' : 'Link ongeldig'}</h1><p>${ok ? 'Je ontvangt het Vantis-weekoverzicht niet meer. Aanzetten kan altijd weer bij Instellingen.' : 'Deze afmeldlink klopt niet. Zet het weekoverzicht uit bij Instellingen in de app.'}</p><p><a href="/">Naar Vantis</a></p>`, { headers: { 'content-type': 'text/html; charset=utf-8' } }); }
  if (!s) return null;
  if (p === '/api/mail/preview' && m === 'GET') { const st = await kv(env, ['tickers', 'candles', 'names', 'unlocks']); const w = await buildWeekly(env, s.user_id, st); return new Response(w ? w.html : 'Geen gegevens', { headers: { 'content-type': 'text/html; charset=utf-8' } }); }
  if (p === '/api/mail/test' && m === 'POST') { if (!mailReady(env)) return err(501, 'Het versturen van e-mail is nog niet ingesteld.'); const st = await kv(env, ['tickers', 'candles', 'names', 'unlocks']); const w = await buildWeekly(env, s.user_id, st);
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ from: env.MAIL_FROM, to: [w.to], subject: '[Test] ' + w.subject, html: w.html }) });
    return r.ok ? json({ ok: true, to: w.to }) : err(502, 'Versturen mislukt: ' + (await r.text()).slice(0, 200)); }
  return null;
}
