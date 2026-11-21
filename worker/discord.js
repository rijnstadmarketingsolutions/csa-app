// Discord: account koppelen (OAuth, met automatisch lid worden van de Vantis-server),
// meldingen per DM, slash-commando's en berichten in het openbare marktkanaal.
import { json, err, kvPutStmt, tierRank, ROLES, DAY, MIN } from './lib.js';
import { quote } from './market.js';
import { loadDict, en, enPayload, langOf } from './i18n.js';
export const dcDict = env => loadDict(env);

const API = 'https://discord.com/api/v10';
const enc = new TextEncoder();
export const dcReady = env => !!(env.DISCORD_BOT_TOKEN && env.DISCORD_APP_ID);
const oauthReady = env => dcReady(env) && !!env.DISCORD_CLIENT_SECRET;
const origin = env => env.PUBLIC_URL || 'https://vantis.rijnstadmarketing.workers.dev';

let LOC = 'en-GB';
const nl = (n, d = 2) => n == null || !isFinite(n) ? '—' : Number(n).toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = n => n == null || !isFinite(n) ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + nl(Math.abs(n), 1) + '%';
const eurF = n => n == null || !isFinite(n) ? '—' : (LOC === 'nl-NL' ? '€ ' : '€') + Number(n).toLocaleString(LOC, { minimumFractionDigits: n >= 1 ? 2 : 4, maximumFractionDigits: n >= 1 ? 2 : 6 });
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
export function dcFormat(msgs, lang = 'en') {
  const o = origin({}); const E = lang === 'nl' ? x => x : en;
  return { embeds: msgs.slice(0, 4).map(m => ({ title: `${ICON[m.cat] || '•'} ${E(m.title)}`.slice(0, 250), description: [E(m.body || ''), m.link ? `[${lang === 'nl' ? 'Lees het artikel' : 'Read the article'}](${m.link})` : ''].filter(Boolean).join('\n').slice(0, 1800) || undefined, color: COLOR[m.cat] || 0xC9CDD4, url: m.url ? (m.url.startsWith('http') ? m.url : o + m.url) : undefined })) };
}

/* DM naar een gekoppelde gebruiker; het DM-kanaal wordt bewaard */
export async function dcSend(env, link, payload) {
  if (!dcReady(env) || !link) return { ok: false }; env = await dcEnv(env);
  let ch = link.dm;
  if (!ch) { const r = await DC(env, 'POST', '/users/@me/channels', { recipient_id: link.discord_id }); if (!r.ok) return r; ch = r.data.id; link.dm = ch; await env.DB.prepare('UPDATE dc_links SET dm=? WHERE user_id=?').bind(ch, link.user_id).run(); }
  return DC(env, 'POST', `/channels/${ch}/messages`, { allowed_mentions: { parse: [] }, ...payload });
}

/* openbaar marktkanaal in de server (webhook) */
export async function dcPublic(env, payload) {
  env = await dcEnv(env); if (!env.DISCORD_WEBHOOK_URL) return { ok: false };
  try { const r = await fetch(env.DISCORD_WEBHOOK_URL + '?wait=false', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'Vantis', allowed_mentions: { parse: [] }, ...payload }) }); return { ok: r.ok, status: r.status }; }
  catch (e) { return { ok: false }; }
}
export const briefingEmbed = (br, lang = 'en') => { const E = lang === 'nl' ? x => x : en; const pts = (br.points || br.bullets || []).slice(0, 5).map(x => typeof x === 'string' ? x : x.t || x.text || '');
  return { embeds: [{ title: `☀️ ${lang === 'nl' ? 'Ochtendbriefing' : 'Morning briefing'} · ${E(br.day)}`, description: `**${E(br.headline)}**${pts.map(x => '\n• ' + E(x)).join('')}`.slice(0, 3500), color: COLOR.briefing, url: origin({}) + '/app#briefing', footer: { text: lang === 'nl' ? 'Vantis · geen beleggingsadvies' : 'Vantis · not investment advice' } }] }; };

/* rollen in de server: Lid voor iedereen die gekoppeld is, plus een rol per abonnement (Plus, Pro, Elite; opeenstapelend) */
const ROLE_TIERS = env => [[env.DISCORD_ROLE_PLUS || env.DISCORD_ROLE_PREMIUM, 1], [env.DISCORD_ROLE_PRO, 2], [env.DISCORD_ROLE_ELITE, 3], [env.DISCORD_ROLE_ULTIMATE, 4], [env.DISCORD_ROLE_BLACK, 5]].filter(([r]) => r);
async function syncRoles(env, discordId, plan, role) {
  const g = env.DISCORD_GUILD_ID; if (!g) return;
  if (env.DISCORD_ROLE_MEMBER) await DC(env, 'PUT', `/guilds/${g}/members/${discordId}/roles/${env.DISCORD_ROLE_MEMBER}`);
  const rank = tierRank(plan); for (const [r, need] of ROLE_TIERS(env)) await DC(env, rank >= need ? 'PUT' : 'DELETE', `/guilds/${g}/members/${discordId}/roles/${r}`);
  const staff = env.DISCORD_STAFF_ROLES || {}; for (const [k, id] of Object.entries(staff)) if (id) await DC(env, k === role ? 'PUT' : 'DELETE', `/guilds/${g}/members/${discordId}/roles/${id}`);
  if (env.DISCORD_ROLE_TEAM) await DC(env, role && ROLES[role] ? 'PUT' : 'DELETE', `/guilds/${g}/members/${discordId}/roles/${env.DISCORD_ROLE_TEAM}`);
}
export async function dcSyncUser(env, uid) {
  if (!dcReady(env)) return; env = await dcEnv(env);
  const r = await env.DB.prepare('SELECT d.discord_id,u.plan,u.role FROM dc_links d JOIN users u ON u.id=d.user_id WHERE d.user_id=?').bind(uid).first(); if (r) await syncRoles(env, r.discord_id, r.plan, r.role);
}
export async function dcDaily(env) {
  if (!dcReady(env)) return; await registerCommands(env).catch(() => null); await dcSetup(env).catch(() => null); env = await dcEnv(env);
  if (!env.DISCORD_GUILD_ID) return;
  const L = (await env.DB.prepare('SELECT d.discord_id,u.plan,u.role FROM dc_links d JOIN users u ON u.id=d.user_id ORDER BY d.synced ASC LIMIT 40').all()).results;
  for (const r of L) { await syncRoles(env, r.discord_id, r.plan, r.role); await env.DB.prepare('UPDATE dc_links SET synced=? WHERE discord_id=?').bind(Date.now(), r.discord_id).run(); }
}

/* ---------- API voor de app ---------- */
export async function dcApi(req, env, s, p, m, url) {
  env = await dcEnv(env);
  if (p === '/api/discord/status' && m === 'GET') { const l = await env.DB.prepare('SELECT username,created FROM dc_links WHERE user_id=?').bind(s.user_id).first();
    return json({ ready: oauthReady(env), linked: !!l, username: l?.username || null, since: l?.created || null, invite: env.DISCORD_INVITE || null }); }
  if (p === '/api/discord/link' && m === 'POST') {
    if (!oauthReady(env)) return err(501, 'De Discord-koppeling wordt nog ingesteld.');
    const state = [...crypto.getRandomValues(new Uint8Array(18))].map(b => b.toString(16).padStart(2, '0')).join(''); const o = url.origin;
    await kvPutStmt(env, 'dcst:' + state, { uid: s.user_id, o }).run();
    const q = new URLSearchParams({ client_id: env.DISCORD_APP_ID, response_type: 'code', redirect_uri: o + '/api/discord/callback', scope: env.DISCORD_GUILD_ID ? 'identify guilds.join' : 'identify', state, prompt: 'none' });
    return json({ url: 'https://discord.com/oauth2/authorize?' + q }); }
  if (p === '/api/discord/link' && m === 'DELETE') { const l = await env.DB.prepare('SELECT * FROM dc_links WHERE user_id=?').bind(s.user_id).first(); await env.DB.prepare('DELETE FROM dc_links WHERE user_id=?').bind(s.user_id).run();
    if (l && dcReady(env)) { const lg = langOf((await env.DB.prepare('SELECT settings FROM prefs WHERE user_id=?').bind(s.user_id).first())?.settings); await dcSend(env, l, { content: lg === 'nl' ? 'Je Vantis-account is ontkoppeld. Je krijgt hier geen meldingen meer.' : 'Your Vantis account has been disconnected. You will no longer receive notifications here.' }); if (env.DISCORD_GUILD_ID) for (const [role] of ROLE_TIERS(env)) await DC(env, 'DELETE', `/guilds/${env.DISCORD_GUILD_ID}/members/${l.discord_id}/roles/${role}`); }
    return json({ ok: true }); }
  if (p === '/api/discord/test' && m === 'POST') { const l = await env.DB.prepare('SELECT * FROM dc_links WHERE user_id=?').bind(s.user_id).first(); if (!l) return err(400, 'Discord is nog niet gekoppeld.');
    const lg = langOf((await env.DB.prepare('SELECT settings FROM prefs WHERE user_id=?').bind(s.user_id).first())?.settings);
    const r = await dcSend(env, l, lg === 'nl' ? dcFormat([{ cat: 'test', title: 'Testmelding van Vantis', body: 'Zo zien je koersalerts, orders en nieuws eruit in Discord.', url: '/app#meldingen' }], 'nl') : dcFormat([{ cat: 'test', title: 'Test notification from Vantis', body: 'This is how your price alerts, orders and news look in Discord.', url: '/app#meldingen' }], 'nl'));
    return r.ok ? json({ ok: true }) : err(502, r.data?.code === 50007 ? 'Discord laat geen privéberichten toe. Zet in Discord bij Privacy "Privéberichten van serverleden" aan voor de Vantis-server.' : 'Discord: ' + (r.data?.message || r.status)); }
  if (p === '/api/discord/setup' && m === 'POST') { const c = await registerCommands(env, true); const r = await dcSetup(env, true); return json({ commands: c, setup: r }); }
  return null;
}

/* terugkeer van Discord na het inloggen (gewone browser, geen token) */
export async function dcCallback(req, env, url) {
  env = await dcEnv(env);
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
  const user = await env.DB.prepare('SELECT name,plan,role FROM users WHERE id=?').bind(st.uid).first();
  if (env.DISCORD_GUILD_ID) { await DC(env, 'PUT', `/guilds/${env.DISCORD_GUILD_ID}/members/${me.id}`, { access_token: tr.access_token, roles: env.DISCORD_ROLE_MEMBER ? [env.DISCORD_ROLE_MEMBER] : undefined }); await syncRoles(env, me.id, user?.plan, user?.role); }
  const link = { user_id: st.uid, discord_id: me.id, dm: null };
  const lg = langOf((await env.DB.prepare('SELECT settings FROM prefs WHERE user_id=?').bind(st.uid).first())?.settings);
  await dcSend(env, link, { embeds: [lg === 'nl' ? { title: `✅ Gekoppeld${user?.name ? ' aan ' + user.name : ''}`, description: 'Je krijgt hier voortaan je koersalerts, uitgevoerde orders, nieuws op trefwoord en de ochtendbriefing.\n\n' + HELP.nl, color: COLOR.order }
    : { title: `✅ Connected${user?.name ? ' to ' + user.name : ''}`, description: 'From now on you will receive your price alerts, executed orders, keyword news and the morning briefing here.\n\n' + HELP.en, color: COLOR.order }] });
  return back('ok', st.o);
}

/* ---------- slash-commando's: Engels, met Nederlandse vertaling voor wie Discord in het Nederlands gebruikt ---------- */
const CMDS = [
  { name: 'price', name_localizations: { nl: 'koers' }, description: 'Live price of a coin or stock', description_localizations: { nl: 'Actuele koers van een munt of aandeel' }, options: [{ type: 3, name: 'symbol', name_localizations: { nl: 'symbool' }, description: 'For example BTC, ETH or AAPL', description_localizations: { nl: 'Bijvoorbeeld BTC, ETH of AAPL' }, required: true }] },
  { name: 'briefing', description: "Today's morning briefing", description_localizations: { nl: 'De ochtendbriefing van vandaag' } },
  { name: 'portfolio', name_localizations: { nl: 'portefeuille' }, description: 'Your Vantis portfolio (only visible to you)', description_localizations: { nl: 'Je Vantis-portefeuille (alleen voor jou zichtbaar)' } },
  { name: 'notifications', name_localizations: { nl: 'meldingen' }, description: 'Turn Vantis notifications in Discord on or off', description_localizations: { nl: 'Meldingen van Vantis in Discord aan- of uitzetten' }, options: [{ type: 3, name: 'state', name_localizations: { nl: 'stand' }, description: 'on or off', description_localizations: { nl: 'aan of uit' }, required: true, choices: [{ name: 'on', name_localizations: { nl: 'aan' }, value: 'on' }, { name: 'off', name_localizations: { nl: 'uit' }, value: 'off' }] }] },
  { name: 'help', description: 'What can the Vantis bot do?', description_localizations: { nl: 'Wat kan de Vantis-bot?' } },
].map(c => ({ ...c, type: 1, integration_types: [0], contexts: [0, 1] }));
const CMD_VER = 'v2:' + CMDS.map(c => c.name).join(',');
export async function registerCommands(env, force) {
  if (!dcReady(env)) return { ok: false, error: 'niet ingesteld' };
  const k = await env.DB.prepare("SELECT val FROM kv WHERE key='dccmd'").first(); if (!force && k && JSON.parse(k.val) === CMD_VER) return { ok: true, cached: true };
  const r = await DC(env, 'PUT', `/applications/${env.DISCORD_APP_ID}/commands`, CMDS); if (r.ok) await kvPutStmt(env, 'dccmd', CMD_VER).run();
  return { ok: r.ok, status: r.status, n: Array.isArray(r.data) ? r.data.length : 0, error: r.ok ? null : r.data?.message };
}
const HELP = { en: '**Commands**\n`/price BTC` live price\n`/briefing` morning briefing\n`/portfolio` your portfolio\n`/notifications off` pause notifications', nl: "**Commando's**\n`/koers BTC` actuele koers\n`/briefing` ochtendbriefing\n`/portefeuille` je portefeuille\n`/meldingen uit` meldingen pauzeren" };

const hex = h => new Uint8Array((h.match(/../g) || []).map(x => parseInt(x, 16)));
async function verify(env, req, body) {
  const sig = req.headers.get('x-signature-ed25519'), ts = req.headers.get('x-signature-timestamp'); if (!sig || !ts || !env.DISCORD_PUBLIC_KEY) return false;
  try { const key = await crypto.subtle.importKey('raw', hex(env.DISCORD_PUBLIC_KEY), { name: 'Ed25519' }, false, ['verify']); return await crypto.subtle.verify('Ed25519', key, hex(sig), enc.encode(ts + body)); }
  catch (e) { try { const key = await crypto.subtle.importKey('raw', hex(env.DISCORD_PUBLIC_KEY), { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' }, false, ['verify']); return await crypto.subtle.verify('NODE-ED25519', key, hex(sig), enc.encode(ts + body)); } catch (x) { return false; } }
}
export async function dcInteractions(req, env, ctx) {
  const body = await req.text(); if (!(await verify(env, req, body))) return new Response('invalid signature', { status: 401 });
  const it = JSON.parse(body); if (it.type === 1) { if (ctx) ctx.waitUntil(registerCommands(env).then(() => dcSetup(env)).catch(() => null)); return json({ type: 1 }); }
  const L = String(it.locale || '').startsWith('nl') ? 'nl' : 'en'; const T = (e, n) => L === 'nl' ? n : e; LOC = L === 'nl' ? 'nl-NL' : 'en-GB';
  if (it.type !== 2) return json({ type: 4, data: { content: T('Unknown request.', 'Onbekend verzoek.'), flags: 64 } });
  const user = it.member?.user || it.user || {}; const name = it.data?.name; const opt = Object.fromEntries((it.data?.options || []).map(o => [o.name, o.value]));
  const say = (data, priv) => json({ type: 4, data: { allowed_mentions: { parse: [] }, ...(typeof data === 'string' ? { content: data } : data), ...(priv ? { flags: 64 } : {}) } });
  const link = await env.DB.prepare('SELECT * FROM dc_links WHERE discord_id=?').bind(user.id || '').first();
  const needLink = () => say(T(`Link your Vantis account first: open the app, go to **Settings → Discord** and choose **Connect Discord**.\n${origin(env)}/app#instellingen`, `Koppel eerst je Vantis-account: open de app, ga naar **Instellingen → Discord** en kies **Koppel Discord**.\n${origin(env)}/app#instellingen`), true);
  if (name === 'help') return say({ embeds: [{ title: T('Vantis bot', 'Vantis-bot'), description: HELP[L] + (link ? '' : T('\n\nConnect your account in the app under **Settings → Discord** to receive notifications as well.', '\n\nKoppel je account in de app bij **Instellingen → Discord** om ook meldingen te krijgen.')), color: COLOR.test }] }, true);
  if (name === 'price' || name === 'koers') { const sym = String(opt.symbol || opt.symbool || 'BTC').toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 12); const st = await kv(env, ['tickers', 'xquotes', 'names', 'stocks', 'ticks']); const q = quote(st, sym);
    if (!q) return say(T(`No price found for ${sym}.`, `Geen koers gevonden voor ${sym}.`), true);
    return say({ embeds: [{ title: `${q.name || sym} (${sym})`, description: `**${q.cur === 'USD' ? '$' + nl(q.p) : eurF(q.p)}**  ${pct(q.ch24)} ${T('in 24 hours', 'in 24 uur')}${q.ch1h != null ? ` · ${pct(q.ch1h)} ${T('in 1 hour', 'in 1 uur')}` : ''}`, color: (q.ch24 || 0) >= 0 ? 0x2BB673 : 0xE5484D, url: `${origin(env)}/app#asset-${sym.toLowerCase()}`, footer: { text: T('Vantis · not investment advice', 'Vantis · geen beleggingsadvies') } }] }); }
  if (name === 'briefing') { const b = (await kv(env, ['briefing'])).briefing; if (L === 'en') await loadDict(env); return b ? say(briefingEmbed(b, L)) : say(T("Today's briefing isn't out yet (every day at 08:00 CET).", 'De briefing van vandaag is er nog niet (elke dag om 08:00).'), true); }
  if (!link) return needLink();
  if (name === 'portfolio' || name === 'portefeuille') { const a = await env.DB.prepare('SELECT cash,holdings FROM paper WHERE user_id=?').bind(link.user_id).first(); if (!a) return say(T("You don't have a portfolio yet. Start in the app under **Trading**.", 'Je hebt nog geen portefeuille. Begin in de app bij **Handelen**.'), true);
    const st = await kv(env, ['tickers', 'xquotes']); const H = JSON.parse(a.holdings || '{}'); let v = a.cash; const R = [];
    for (const [s2, h] of Object.entries(H)) { const q = quote(st, s2); const val = q ? q.p * h.qty : h.cost; v += val; R.push([s2, val, h.cost]); }
    R.sort((x, y) => y[1] - x[1]);
    return say({ embeds: [{ title: T('📊 Your portfolio', '📊 Je portefeuille'), description: `${T('Value', 'Waarde')} **${eurF(v)}** (${pct((v / 10000 - 1) * 100)} ${T('since start', 'sinds start')})\n${T('Available balance', 'Vrij saldo')} ${eurF(a.cash)}${R.slice(0, 10).map(([s2, val, cost]) => `\n• ${s2}: ${eurF(val)} (${pct((val / cost - 1) * 100)})`).join('')}`, color: COLOR.order }] }, true); }
  if (name === 'notifications' || name === 'meldingen') { const on = !['off', 'uit'].includes(opt.state || opt.stand); const pr = await env.DB.prepare('SELECT settings FROM prefs WHERE user_id=?').bind(link.user_id).first(); const sset = JSON.parse(pr?.settings || '{}'); sset.dcPause = !on;
    await env.DB.prepare('INSERT INTO prefs(user_id,settings) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET settings=excluded.settings').bind(link.user_id, JSON.stringify(sset)).run();
    return say(on ? T('🔔 Discord notifications are back on.', '🔔 Meldingen in Discord staan weer aan.') : T('🔕 Discord notifications are paused. Turn them back on with `/notifications on`.', '🔕 Meldingen in Discord staan op pauze. Zet ze weer aan met `/meldingen aan`.'), true); }
  return say(HELP[L], true);
}

/* ---------- instellingen uit de database (door de automatische serverinrichting) ---------- */
let CFG = null, CFG_T = 0;
export async function dcEnv(env) {
  if (!CFG || Date.now() - CFG_T > 60e3) { try { const r = await env.DB.prepare("SELECT val FROM kv WHERE key='dccfg'").first(); CFG = r ? JSON.parse(r.val) : {}; } catch (e) { CFG = {}; } CFG_T = Date.now(); }
  const out = Object.create(env); for (const [k, v] of Object.entries(CFG)) if (k.startsWith('DISCORD_') && !env[k]) out[k] = v; return out;
}

/* ---------- de server automatisch inrichten zodra de bot erin zit ---------- */
const P = { VIEW: 1n << 10n, SEND: 1n << 11n, CONNECT: 1n << 20n, SPEAK: 1n << 21n, THREADS: 1n << 38n };
const s = n => n.toString();
async function iconData(env) {
  try { const r = await env.ASSETS.fetch(new Request(origin(env) + '/icon-512.png')); if (!r.ok) return null; const b = new Uint8Array(await r.arrayBuffer()); let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000)); return 'data:image/png;base64,' + btoa(bin); } catch (e) { return null; }
}
export async function dcSetup(env, force) {
  if (!dcReady(env)) return { ok: false, error: 'geen bot-token' };
  const row = await env.DB.prepare("SELECT val FROM kv WHERE key='dccfg'").first(); const cfg = row ? JSON.parse(row.val) : {};
  if (cfg.done && cfg.v === 4 && !force) return { ok: true, cached: true, cfg };
  let gid = env.DISCORD_GUILD_ID || cfg.DISCORD_GUILD_ID;
  if (!gid) { const g = await DC(env, 'GET', '/users/@me/guilds'); if (!g.ok || !g.data?.length) return { ok: false, error: 'De bot zit nog in geen enkele server.' }; gid = (g.data.find(x => /vantis/i.test(x.name)) || g.data[0]).id; }
  const log = [];
  const roles = (await DC(env, 'GET', `/guilds/${gid}/roles`)).data || []; const channels = (await DC(env, 'GET', `/guilds/${gid}/channels`)).data || [];
  const role = async (name, color, hoist, old) => { const ex = roles.find(r => r.name === name || (old && r.name === old)); if (ex) { if (ex.name !== name) { const r = await DC(env, 'PATCH', `/guilds/${gid}/roles/${ex.id}`, { name }); log.push('rol ' + ex.name + ' → ' + name + ' ' + r.status); } return ex.id; } const r = await DC(env, 'POST', `/guilds/${gid}/roles`, { name, color, hoist, mentionable: false, permissions: '0' }); log.push('rol ' + name + ' ' + r.status); return r.data?.id; };
  const black = await role('Vantis Black', 0xF4F4F5, true), ultimate = await role('Ultimate', 0x9B7BFF, true);
  const elite = await role('Elite', 0xD4AF5F, true), pro = await role('Pro', 0x4D8DF5, true), plus = await role('Plus', 0xC9CDD4, true), lid = await role('Member', 0x8A93A3, false, 'Lid');
  const team = await role('Team', 0x2BB673, false);
  const role2 = async (name, color, perms, old) => { const ex = roles.find(r => r.name === name || (old && r.name === old)); if (ex) { if (ex.name !== name) { const r = await DC(env, 'PATCH', `/guilds/${gid}/roles/${ex.id}`, { name }); log.push('rol ' + ex.name + ' → ' + name + ' ' + r.status); } return ex.id; } const r = await DC(env, 'POST', `/guilds/${gid}/roles`, { name, color, hoist: true, mentionable: true, permissions: perms }); log.push('rol ' + name + ' ' + r.status); return r.data?.id; };
  const MOD = s((1n << 13n) | (1n << 40n) | (1n << 1n) | (1n << 22n) | (1n << 23n) | (1n << 34n)); // berichten beheren, time-out, kicken, dempen, verplaatsen, threads beheren
  const staffIds = { founder: await role2('Founder', 0xE8C77A, '8'), senior_partner: await role2('Senior Partner', 0xD9DCE1, '8'), admin: await role2('Admin', 0xE5484D, '8'),
    moderator: await role2('Moderator', 0x36C46F, MOD), coach: await role2('Coach', 0xB48CF2, '0'), analist: await role2('Analyst', 0x4DB6E5, '0', 'Analist'), support: await role2('Support', 0xF29B4B, '0') };
  const me = (await DC(env, 'GET', '/users/@me')).data;
  await orderRoles(env, gid, me.id, [staffIds.founder, staffIds.senior_partner, staffIds.admin, staffIds.moderator, staffIds.coach, staffIds.analist, staffIds.support, team, black, ultimate, elite, pro, plus, lid], log);
  const ro = [{ id: gid, type: 0, deny: s(P.SEND | P.THREADS), allow: s(P.VIEW) }, { id: me.id, type: 1, allow: s(P.VIEW | P.SEND), deny: '0' }, { id: team, type: 0, allow: s(P.SEND), deny: '0' }];
  const only = (...ids) => [{ id: gid, type: 0, deny: s(P.VIEW), allow: '0' }, { id: me.id, type: 1, allow: s(P.VIEW | P.SEND), deny: '0' }, ...ids.map(id => ({ id, type: 0, allow: s(P.VIEW | P.SEND | P.CONNECT | P.SPEAK), deny: '0' }))];
  const cat = async (name, ov, old) => { const ex = channels.find(c => c.type === 4 && (c.name.toLowerCase() === name.toLowerCase() || (old && c.name.toLowerCase() === old.toLowerCase()))); if (ex) { if (ov || ex.name !== name) await DC(env, 'PATCH', `/channels/${ex.id}`, { name, ...(ov ? { permission_overwrites: ov } : {}) }); return ex.id; } const r = await DC(env, 'POST', `/guilds/${gid}/channels`, { name, type: 4, permission_overwrites: ov }); log.push('cat ' + name + ' ' + r.status); return r.data?.id; };
  const ch = async (name, parent, topic, ov, type = 0, old) => { const ex = channels.find(c => (c.name === name || (old && c.name === old)) && c.type === type); if (ex) { await DC(env, 'PATCH', `/channels/${ex.id}`, { name, parent_id: parent, ...(type === 0 ? { topic } : {}), ...(ov ? { permission_overwrites: ov } : {}) }); return ex.id; } const r = await DC(env, 'POST', `/guilds/${gid}/channels`, { name, type, parent_id: parent, topic, ...(ov ? { permission_overwrites: ov } : {}) }); log.push('kanaal ' + name + ' ' + r.status); return r.data?.id; };
  const cInfo = await cat('Vantis', null), cMarkt = await cat('Market', null, 'Markt'), cCom = await cat('Community', null), cPlus = await cat('Plus', only(plus, pro, elite, ultimate, black, team)), cPro = await cat('Pro', only(pro, elite, ultimate, black, team)), cElite = await cat('Elite', only(elite, ultimate, black, team)), cUlt = await cat('Ultimate', only(ultimate, black, team)), cHelp = await cat('Help', null, 'Hulp');
  const welkom = await ch('welcome', cInfo, 'Welcome to Vantis. Start here.', ro, 0, 'welkom');
  const regels = await ch('rules', cInfo, 'House rules of the Vantis community.', ro, 0, 'regels');
  await ch('announcements', cInfo, 'Vantis news: new features, lessons and the launch.', ro, 0, 'aankondigingen');
  const markt = await ch('market-updates', cMarkt, 'Automatic: the morning briefing and the strongest market signals from Vantis. Not investment advice.', ro, 0, 'markt-updates');
  await ch('general', cCom, 'Talk crypto, stocks and the markets.', null, 0, 'algemeen');
  await ch('academy-questions', cCom, 'Questions about the lessons and learning paths in the Vantis Academy.', null, 0, 'academy-vragen');
  await ch('trade-ideas', cCom, 'Share your ideas and your plan. Not investment advice; always make your own decisions.', null, 0, 'trade-ideeen');
  await ch('wins-and-lessons', cCom, 'What went well, and what did you learn?', null, 0, 'wins-en-lessen');
  await ch('plus-lounge', cPlus, 'For members with Plus, Pro, Elite or Ultimate.', only(plus, pro, elite, ultimate, black, team));
  await ch('pro-analysis', cPro, 'Deeper analysis and scanners, for Pro and up.', only(pro, elite, ultimate, black, team), 0, 'pro-analyse');
  await ch('elite', cElite, 'The Elite channel: questions for the coaches and the live session schedule.', only(elite, ultimate, black, team));
  await ch('Elite live session', cElite, null, only(elite, ultimate, black, team), 2, 'Elite live sessie');
  await ch('ultimate-lounge', cUlt, 'For Ultimate members: book 1-on-1 sessions and test new features first.', only(ultimate, black, team));
  await ch('Ultimate 1-on-1', cUlt, null, only(ultimate, black, team), 2, 'Ultimate 1-op-1');
  await ch('support', cHelp, 'Need help with the app? Ask here. Never share your password or 2FA code.');
  await ch('General', cCom, null, null, 2, 'Algemeen');
  { const r = await DC(env, 'PATCH', `/guilds/${gid}/channels`, [cInfo, cMarkt, cCom, cPlus, cPro, cElite, cUlt, cHelp].filter(Boolean).map((id, i) => ({ id, position: i }))); log.push('categorieën ' + r.status); }
  for (const c of channels.filter(c => c.type === 4 && /^(tekstkanalen|spraakkanalen|text channels|voice channels)$/i.test(c.name))) await DC(env, 'DELETE', `/channels/${c.id}`);
  let hook = cfg.DISCORD_WEBHOOK_URL; if (!hook && markt) { const w = await DC(env, 'POST', `/channels/${markt}/webhooks`, { name: 'Vantis' }); if (w.ok) hook = `https://discord.com/api/webhooks/${w.data.id}/${w.data.token}`; }
  let invite = cfg.DISCORD_INVITE; if (!invite && welkom) { const i = await DC(env, 'POST', `/channels/${welkom}/invites`, { max_age: 0, max_uses: 0, unique: false }); if (i.ok) invite = 'https://discord.gg/' + i.data.code; }
  const WEL = { embeds: [{ title: 'Welcome to Vantis', color: 0xC9CDD4, description: `Vantis teaches you to trade crypto and stocks step by step, and shows live what is moving the market and why.\n\n**How to start**\n1. Create an account in the app: ${origin(env)}/app\n2. Connect Discord under **Settings → Discord**. You'll get the **Member** role and your notifications as a direct message from the Vantis bot.\n3. With Plus, Pro, Elite or Ultimate you automatically get access to your plan's channels.\n\nType \`/price BTC\` or \`/briefing\` to try the bot.` }] };
  const RUL = { embeds: [{ title: 'House rules', color: 0xC9CDD4, description: '1. Be respectful. No insults, harassment or discrimination.\n2. Do not give or promise investment advice. Share ideas, always make your own decisions.\n3. No advertising, pump-and-dump, referral links or calls to buy coins.\n4. Never share your password, 2FA code or seed phrase. The Vantis team will never ask for it.\n5. Keep each channel on topic.\n\nIf you break the rules, the team may delete messages or remove members from the server.' }] };
  if (!cfg.posted && welkom) { await DC(env, 'POST', `/channels/${welkom}/messages`, WEL); if (regels) await DC(env, 'POST', `/channels/${regels}/messages`, RUL); }
  else if (cfg.v !== 4 || force) for (const [cid, body] of [[welkom, WEL], [regels, RUL]]) { if (!cid) continue; const ms = (await DC(env, 'GET', `/channels/${cid}/messages?limit=20`)).data || [];
    const mine = (Array.isArray(ms) ? ms : []).filter(x => x.author?.id === me.id).sort((x, y) => (x.id < y.id ? -1 : 1))[0]; if (mine) { const r = await DC(env, 'PATCH', `/channels/${cid}/messages/${mine.id}`, body); log.push('bericht bijgewerkt ' + r.status); } }
  const icon = await iconData(env);
  if (icon && !cfg.icon) { await DC(env, 'PATCH', `/guilds/${gid}`, { icon, system_channel_id: welkom || undefined }); await DC(env, 'PATCH', '/users/@me', { avatar: icon }); }
  const out = { ...cfg, DISCORD_GUILD_ID: gid, DISCORD_ROLE_MEMBER: lid, DISCORD_ROLE_PLUS: plus, DISCORD_ROLE_PRO: pro, DISCORD_ROLE_ELITE: elite, DISCORD_ROLE_ULTIMATE: ultimate, DISCORD_ROLE_BLACK: black, DISCORD_ROLE_TEAM: team, DISCORD_STAFF_ROLES: staffIds, DISCORD_WEBHOOK_URL: hook, DISCORD_INVITE: invite, posted: true, icon: !!icon || cfg.icon, done: true, v: 4, t: Date.now() };
  await kvPutStmt(env, 'dccfg', out).run(); CFG = null;
  return { ok: true, log, cfg: { ...out, DISCORD_WEBHOOK_URL: hook ? '(ingesteld)' : null } };
}

/* rollen in de juiste rangorde zetten: staff boven abonnementen, hoogste bovenaan (onder de rol van de bot) */
async function orderRoles(env, gid, botId, ids, log) {
  const roles = (await DC(env, 'GET', `/guilds/${gid}/roles`)).data || []; const mem = (await DC(env, 'GET', `/guilds/${gid}/members/${botId}`)).data || {};
  const top = Math.max(0, ...roles.filter(r => (mem.roles || []).includes(r.id)).map(r => r.position)); const list = ids.filter(Boolean);
  if (top <= list.length) { log && log.push('rangorde: bot-rol staat te laag (' + top + ')'); }
  const body = list.map((id, i) => ({ id, position: Math.max(1, top - 1 - i) }));
  const r = await DC(env, 'PATCH', `/guilds/${gid}/roles`, body); log && log.push('rangorde ' + r.status);
  return r.ok;
}
