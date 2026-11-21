// Discord: account koppelen (OAuth, met automatisch lid worden van de Vantis-server),
// meldingen per DM, slash-commando's en berichten in het openbare marktkanaal.
import { json, err, kvPutStmt, DAY, MIN } from './lib.js';
import { quote } from './market.js';

const API = 'https://discord.com/api/v10';
const enc = new TextEncoder();
export const dcReady = env => !!(env.DISCORD_BOT_TOKEN && env.DISCORD_APP_ID);
const oauthReady = env => dcReady(env) && !!env.DISCORD_CLIENT_SECRET;
const origin = env => env.PUBLIC_URL || 'https://vantis.rijnstadmarketing.workers.dev';

const nl = (n, d = 2) => n == null || !isFinite(n) ? '—' : Number(n).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = n => n == null || !isFinite(n) ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + nl(Math.abs(n), 1) + '%';
const eurF = n => n == null || !isFinite(n) ? '—' : '€ ' + Number(n).toLocaleString('nl-NL', { minimumFractionDigits: n >= 1 ? 2 : 4, maximumFractionDigits: n >= 1 ? 2 : 6 });
async function kv(env, keys) { const r = await env.DB.prepare(`SELECT key,val FROM kv WHERE key IN (${keys.map(() => '?').join(',')})`).bind(...keys).all(); const o = {}; for (const x of r.results) o[x.key] = JSON.parse(x.val); return o; }

/* Discord REST met de bot-token */
export async function DC(env, method, path, body) {
  try { const r = await fetch(API + path, { method, headers: { authorization: 'Bot ' + env.DISCORD_BOT_TOKEN, 'content-type': 'application/json', 'user-agent': 'DiscordBot (https://vantis.app, 2.0)' }, body: body ? JSON.stringify(body) : undefined });
    const data = r.status === 204 ? null : await r.json().catch(() => null); return { ok: r.ok, status: r.status, data }; }
  catch (e) { return { ok: false, status: 0, data: { message: e.message } }; }
}

/* kleuren per soort melding (embed-zijbalk) */
const COLOR = { alert: 0x4D8DF5, order: 0x2BB673, news: 0x9AA3B2, impact: 0xE5A93C, reminder: 0xB48CF2, briefing: 0xD9DCE1, social: 0x36C46F, test: 0xC9CDD4 };
const ICON = { alert: '🔔', order: '✅', news: '📰', impact: '⚡', reminder: '⏰', briefing: '☀️', social: '💬', test: '🔔' };
export function dcFormat(msgs) {
  const o = origin({}); return { embeds: msgs.slice(0, 4).map(m => ({ title: `${ICON[m.cat] || '•'} ${m.title}`.slice(0, 250), description: [m.body, m.link ? `[Lees het artikel](${m.link})` : ''].filter(Boolean).join('\n').slice(0, 1800) || undefined, color: COLOR[m.cat] || 0xC9CDD4, url: m.url ? (m.url.startsWith('http') ? m.url : o + m.url) : undefined })) };
}

/* DM naar een gekoppelde gebruiker; het DM-kanaal wordt bewaard */
export async function dcSend(env, link, payload) {
  if (!dcReady(env) || !link) return { ok: false };
  let ch = link.dm;
  if (!ch) { const r = await DC(env, 'POST', '/users/@me/channels', { recipient_id: link.discord_id }); if (!r.ok) return r; ch = r.data.id; link.dm = ch; await env.DB.prepare('UPDATE dc_links SET dm=? WHERE user_id=?').bind(ch, link.user_id).run(); }
  return DC(env, 'POST', `/channels/${ch}/messages`, { allowed_mentions: { parse: [] }, ...payload });
}

/* openbaar marktkanaal in de server (webhook) */
export async function dcPublic(env, payload) {
  if (!env.DISCORD_WEBHOOK_URL) return { ok: false };
  try { const r = await fetch(env.DISCORD_WEBHOOK_URL + '?wait=false', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'Vantis', allowed_mentions: { parse: [] }, ...payload }) }); return { ok: r.ok, status: r.status }; }
  catch (e) { return { ok: false }; }
}
export const briefingEmbed = br => ({ embeds: [{ title: `☀️ Ochtendbriefing · ${br.day}`, description: `**${br.headline}**${(br.points || br.bullets || []).slice(0, 5).map(x => '\n• ' + (typeof x === 'string' ? x : x.t || x.text || '')).join('')}`.slice(0, 3500), color: COLOR.briefing, url: origin({}) + '/app#briefing', footer: { text: 'Vantis · geen beleggingsadvies' } }] });

/* rollen in de server: lid en premium */
async function syncRoles(env, discordId, plan) {
  const g = env.DISCORD_GUILD_ID; if (!g) return;
  if (env.DISCORD_ROLE_MEMBER) await DC(env, 'PUT', `/guilds/${g}/members/${discordId}/roles/${env.DISCORD_ROLE_MEMBER}`);
  if (env.DISCORD_ROLE_PREMIUM) await DC(env, plan === 'premium' ? 'PUT' : 'DELETE', `/guilds/${g}/members/${discordId}/roles/${env.DISCORD_ROLE_PREMIUM}`);
}
export async function dcDaily(env) {
  if (!dcReady(env)) return; await registerCommands(env).catch(() => null);
  if (!env.DISCORD_GUILD_ID || !env.DISCORD_ROLE_PREMIUM) return;
  const L = (await env.DB.prepare('SELECT d.discord_id,u.plan FROM dc_links d JOIN users u ON u.id=d.user_id ORDER BY d.synced ASC LIMIT 40').all()).results;
  for (const r of L) { await syncRoles(env, r.discord_id, r.plan); await env.DB.prepare('UPDATE dc_links SET synced=? WHERE discord_id=?').bind(Date.now(), r.discord_id).run(); }
}

/* ---------- API voor de app ---------- */
export async function dcApi(req, env, s, p, m, url) {
  if (p === '/api/discord/status' && m === 'GET') { const l = await env.DB.prepare('SELECT username,created FROM dc_links WHERE user_id=?').bind(s.user_id).first();
    return json({ ready: oauthReady(env), linked: !!l, username: l?.username || null, since: l?.created || null, invite: env.DISCORD_INVITE || null }); }
  if (p === '/api/discord/link' && m === 'POST') {
    if (!oauthReady(env)) return err(501, 'De Discord-koppeling wordt nog ingesteld.');
    const state = [...crypto.getRandomValues(new Uint8Array(18))].map(b => b.toString(16).padStart(2, '0')).join(''); const o = url.origin;
    await kvPutStmt(env, 'dcst:' + state, { uid: s.user_id, o }).run();
    const q = new URLSearchParams({ client_id: env.DISCORD_APP_ID, response_type: 'code', redirect_uri: o + '/api/discord/callback', scope: env.DISCORD_GUILD_ID ? 'identify guilds.join' : 'identify', state, prompt: 'none' });
    return json({ url: 'https://discord.com/oauth2/authorize?' + q }); }
  if (p === '/api/discord/link' && m === 'DELETE') { const l = await env.DB.prepare('SELECT * FROM dc_links WHERE user_id=?').bind(s.user_id).first(); await env.DB.prepare('DELETE FROM dc_links WHERE user_id=?').bind(s.user_id).run();
    if (l && dcReady(env)) { await dcSend(env, l, { content: 'Je Vantis-account is ontkoppeld. Je krijgt hier geen meldingen meer.' }); if (env.DISCORD_GUILD_ID && env.DISCORD_ROLE_PREMIUM) await DC(env, 'DELETE', `/guilds/${env.DISCORD_GUILD_ID}/members/${l.discord_id}/roles/${env.DISCORD_ROLE_PREMIUM}`); }
    return json({ ok: true }); }
  if (p === '/api/discord/test' && m === 'POST') { const l = await env.DB.prepare('SELECT * FROM dc_links WHERE user_id=?').bind(s.user_id).first(); if (!l) return err(400, 'Discord is nog niet gekoppeld.');
    const r = await dcSend(env, l, dcFormat([{ cat: 'test', title: 'Testmelding van Vantis', body: 'Zo zien je koersalerts, orders en nieuws eruit in Discord.', url: '/app#meldingen' }]));
    return r.ok ? json({ ok: true }) : err(502, r.data?.code === 50007 ? 'Discord laat geen privéberichten toe. Zet in Discord bij Privacy "Privéberichten van serverleden" aan voor de Vantis-server.' : 'Discord: ' + (r.data?.message || r.status)); }
  if (p === '/api/discord/setup' && m === 'POST') { const r = await registerCommands(env, true); return json(r); }
  return null;
}

/* terugkeer van Discord na het inloggen (gewone browser, geen token) */
export async function dcCallback(req, env, url) {
  const back = (q, o) => Response.redirect((o || origin(env)) + '/app?discord=' + q + '#instellingen', 302);
  const state = url.searchParams.get('state') || '', code = url.searchParams.get('code');
  const row = state ? await env.DB.prepare('SELECT val,ts FROM kv WHERE key=?').bind('dcst:' + state).first() : null; if (!row || Date.now() - row.ts > 15 * MIN) return back('expired');
  await env.DB.prepare('DELETE FROM kv WHERE key=?').bind('dcst:' + state).run(); const st = JSON.parse(row.val);
  if (!code) return back('cancelled', st.o);
  const tr = await fetch(API + '/oauth2/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.DISCORD_APP_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: st.o + '/api/discord/callback' }) }).then(r => r.json()).catch(() => ({}));
  if (!tr.access_token) return back('error', st.o);
  const me = await fetch(API + '/users/@me', { headers: { authorization: 'Bearer ' + tr.access_token } }).then(r => r.json()).catch(() => ({})); if (!me.id) return back('error', st.o);
  const uname = me.global_name || me.username || null, now = Date.now();
  await env.DB.batch([env.DB.prepare('DELETE FROM dc_links WHERE user_id=? OR discord_id=?').bind(st.uid, me.id), env.DB.prepare('INSERT INTO dc_links(user_id,discord_id,username,created,synced) VALUES(?,?,?,?,?)').bind(st.uid, me.id, uname, now, now)]);
  const user = await env.DB.prepare('SELECT name,plan FROM users WHERE id=?').bind(st.uid).first();
  if (env.DISCORD_GUILD_ID) { await DC(env, 'PUT', `/guilds/${env.DISCORD_GUILD_ID}/members/${me.id}`, { access_token: tr.access_token, roles: env.DISCORD_ROLE_MEMBER ? [env.DISCORD_ROLE_MEMBER] : undefined }); await syncRoles(env, me.id, user?.plan); }
  const link = { user_id: st.uid, discord_id: me.id, dm: null };
  await dcSend(env, link, { embeds: [{ title: `✅ Gekoppeld${user?.name ? ' aan ' + user.name : ''}`, description: 'Je krijgt hier voortaan je koersalerts, uitgevoerde orders, nieuws op trefwoord en de ochtendbriefing.\n\n' + HELP, color: COLOR.order }] });
  return back('ok', st.o);
}

/* ---------- slash-commando's ---------- */
const CMDS = [
  { name: 'koers', description: 'Actuele koers van een munt of aandeel', options: [{ type: 3, name: 'symbool', description: 'Bijvoorbeeld BTC, ETH of AAPL', required: true }] },
  { name: 'briefing', description: 'De ochtendbriefing van vandaag' },
  { name: 'portefeuille', description: 'Je Vantis-portefeuille (alleen voor jou zichtbaar)' },
  { name: 'meldingen', description: 'Meldingen van Vantis in Discord aan- of uitzetten', options: [{ type: 3, name: 'stand', description: 'aan of uit', required: true, choices: [{ name: 'aan', value: 'aan' }, { name: 'uit', value: 'uit' }] }] },
  { name: 'help', description: 'Wat kan de Vantis-bot?' },
].map(c => ({ ...c, type: 1, integration_types: [0], contexts: [0, 1] }));
const CMD_VER = 'v1:' + CMDS.map(c => c.name).join(',');
async function registerCommands(env, force) {
  if (!dcReady(env)) return { ok: false, error: 'niet ingesteld' };
  const k = await env.DB.prepare("SELECT val FROM kv WHERE key='dccmd'").first(); if (!force && k && JSON.parse(k.val) === CMD_VER) return { ok: true, cached: true };
  const r = await DC(env, 'PUT', `/applications/${env.DISCORD_APP_ID}/commands`, CMDS); if (r.ok) await kvPutStmt(env, 'dccmd', CMD_VER).run();
  return { ok: r.ok, status: r.status, n: Array.isArray(r.data) ? r.data.length : 0, error: r.ok ? null : r.data?.message };
}
const HELP = '**Commando\'s**\n`/koers BTC` actuele koers\n`/briefing` ochtendbriefing\n`/portefeuille` je portefeuille\n`/meldingen uit` meldingen pauzeren';

const hex = h => new Uint8Array((h.match(/../g) || []).map(x => parseInt(x, 16)));
async function verify(env, req, body) {
  const sig = req.headers.get('x-signature-ed25519'), ts = req.headers.get('x-signature-timestamp'); if (!sig || !ts || !env.DISCORD_PUBLIC_KEY) return false;
  try { const key = await crypto.subtle.importKey('raw', hex(env.DISCORD_PUBLIC_KEY), { name: 'Ed25519' }, false, ['verify']); return await crypto.subtle.verify('Ed25519', key, hex(sig), enc.encode(ts + body)); }
  catch (e) { try { const key = await crypto.subtle.importKey('raw', hex(env.DISCORD_PUBLIC_KEY), { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' }, false, ['verify']); return await crypto.subtle.verify('NODE-ED25519', key, hex(sig), enc.encode(ts + body)); } catch (x) { return false; } }
}
export async function dcInteractions(req, env, ctx) {
  const body = await req.text(); if (!(await verify(env, req, body))) return new Response('ongeldige handtekening', { status: 401 });
  const it = JSON.parse(body); if (it.type === 1) { if (ctx) ctx.waitUntil(registerCommands(env).catch(() => null)); return json({ type: 1 }); }
  if (it.type !== 2) return json({ type: 4, data: { content: 'Onbekend verzoek.', flags: 64 } });
  const user = it.member?.user || it.user || {}; const name = it.data?.name; const opt = Object.fromEntries((it.data?.options || []).map(o => [o.name, o.value]));
  const say = (data, priv) => json({ type: 4, data: { allowed_mentions: { parse: [] }, ...(typeof data === 'string' ? { content: data } : data), ...(priv ? { flags: 64 } : {}) } });
  const link = await env.DB.prepare('SELECT * FROM dc_links WHERE discord_id=?').bind(user.id || '').first();
  const needLink = () => say(`Koppel eerst je Vantis-account: open de app, ga naar **Instellingen → Discord** en kies **Koppel Discord**.\n${origin(env)}/app#instellingen`, true);
  if (name === 'help') return say({ embeds: [{ title: 'Vantis-bot', description: HELP + (link ? '' : '\n\nKoppel je account in de app bij **Instellingen → Discord** om ook meldingen te krijgen.'), color: COLOR.test }] }, true);
  if (name === 'koers') { const sym = String(opt.symbool || 'BTC').toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 12); const st = await kv(env, ['tickers', 'xquotes', 'names', 'stocks', 'ticks']); const q = quote(st, sym);
    if (!q) return say(`Geen koers gevonden voor ${sym}.`, true);
    return say({ embeds: [{ title: `${q.name || sym} (${sym})`, description: `**${q.cur === 'USD' ? '$ ' + nl(q.p) : eurF(q.p)}**  ${pct(q.ch24)} in 24 uur${q.ch1h != null ? ` · ${pct(q.ch1h)} in 1 uur` : ''}`, color: (q.ch24 || 0) >= 0 ? 0x2BB673 : 0xE5484D, url: `${origin(env)}/app#asset-${sym.toLowerCase()}`, footer: { text: 'Vantis · geen beleggingsadvies' } }] }); }
  if (name === 'briefing') { const b = (await kv(env, ['briefing'])).briefing; return b ? say(briefingEmbed(b)) : say('De briefing van vandaag is er nog niet (elke dag om 08:00).', true); }
  if (!link) return needLink();
  if (name === 'portefeuille') { const a = await env.DB.prepare('SELECT cash,holdings FROM paper WHERE user_id=?').bind(link.user_id).first(); if (!a) return say('Je hebt nog geen portefeuille. Begin in de app bij **Handelen**.', true);
    const st = await kv(env, ['tickers', 'xquotes']); const H = JSON.parse(a.holdings || '{}'); let v = a.cash; const L = [];
    for (const [s2, h] of Object.entries(H)) { const q = quote(st, s2); const val = q ? q.p * h.qty : h.cost; v += val; L.push([s2, val, h.cost]); }
    L.sort((x, y) => y[1] - x[1]);
    return say({ embeds: [{ title: '📊 Je portefeuille', description: `Waarde **${eurF(v)}** (${pct((v / 10000 - 1) * 100)} sinds start)\nVrij saldo ${eurF(a.cash)}${L.slice(0, 10).map(([s2, val, cost]) => `\n• ${s2}: ${eurF(val)} (${pct((val / cost - 1) * 100)})`).join('')}`, color: COLOR.order }] }, true); }
  if (name === 'meldingen') { const on = opt.stand !== 'uit'; const pr = await env.DB.prepare('SELECT settings FROM prefs WHERE user_id=?').bind(link.user_id).first(); const sset = JSON.parse(pr?.settings || '{}'); sset.dcPause = !on;
    await env.DB.prepare('INSERT INTO prefs(user_id,settings) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET settings=excluded.settings').bind(link.user_id, JSON.stringify(sset)).run();
    return say(on ? '🔔 Meldingen in Discord staan weer aan.' : '🔕 Meldingen in Discord staan op pauze. Zet ze weer aan met `/meldingen aan`.', true); }
  return say(HELP, true);
}
