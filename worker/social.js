// Vrienden op gebruikersnaam, chat (versleuteld opgeslagen) en crypto sturen in de chat.
import { json, err, readJSON, b64u, DAY, MIN, cleanUsername, usernameError } from './lib.js';
import { sendPush } from './push.js';
import { transferPaper, xpMany } from './paper.js';

const RESERVED = new Set(['admin', 'vantis', 'support', 'help', 'system', 'beheer', 'root', 'team', 'info', 'official', 'moderator', 'staff', 'security']);
const UN = /^[a-z0-9](?:[a-z0-9_.]{1,18})[a-z0-9]$/;
const pair = (x, y) => (x < y ? [x, y] : [y, x]);
const conv = (x, y) => pair(x, y).join(':');
const enc = new TextEncoder(), dec = new TextDecoder();

/* één sleutel per verzoek: goedkoop versleutelen en ontsleutelen van chatberichten */
function keyring(env) {
  let kp = null;
  const key = () => kp || (kp = env.ENC_KEY ? crypto.subtle.digest('SHA-256', enc.encode('vantis-chat:' + env.ENC_KEY)).then(raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])) : Promise.resolve(null));
  return {
    async seal(t) { const k = await key(); if (!k) return 'p:' + t; const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(t)); return 'g:' + b64u.enc(iv) + '.' + b64u.enc(new Uint8Array(ct)); },
    async open(s) { if (!s) return ''; if (s.startsWith('p:')) return s.slice(2); const k = await key(); if (!k) return ''; try { const [iv, ct] = s.slice(2).split('.'); return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64u.dec(iv) }, k, b64u.dec(ct))); } catch (e) { return ''; } }
  };
}

async function userByName(env, u) { return u ? env.DB.prepare('SELECT id,username,name,plan,role FROM users WHERE username=?').bind(String(u).toLowerCase().replace(/^@/, '')).first() : null; }
async function rel(env, x, y) { const [a, b] = pair(x, y); return env.DB.prepare('SELECT * FROM friends WHERE a=? AND b=?').bind(a, b).first(); }
const first = n => String(n || '').trim().split(/\s+/)[0] || null;

/* melding in de app plus pushmelding */
export async function notifyUser(env, uid, msg) {
  const now = Date.now();
  try {
    await env.DB.prepare('INSERT OR IGNORE INTO notif(id,user_id,title,body,url,cat,score,t) VALUES(?,?,?,?,?,?,?,?)').bind(msg.tag + ':' + now, uid, msg.title, msg.body || '', msg.url || '/app#vrienden', 'social', null, now).run();
    const subs = (await env.DB.prepare('SELECT * FROM push_subs WHERE user_id=?').bind(uid).all()).results;
    for (const sub of subs.slice(0, 4)) { const r = await sendPush(env, sub, { title: msg.title, body: msg.body, url: msg.url || '/app#vrienden', tag: msg.tag, cat: 'social', urgency: 'normal' }); if (r === 'gone') await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(sub.endpoint).run(); }
  } catch (e) { }
}

export async function handleSocial(req, env, s, p, m, url, ctx) {
  if (!p.startsWith('/api/social')) return null;
  if (!s) return err(401, 'Log eerst in.');
  const uid = s.user_id; const K = keyring(env);
  const me = await env.DB.prepare('SELECT id,username,name,role FROM users WHERE id=?').bind(uid).first();
  const later = fn => { if (ctx && ctx.waitUntil) ctx.waitUntil(fn()); else fn(); };

  if (p === '/api/social/unread' && m === 'GET') {
    const [u, r] = await env.DB.batch([env.DB.prepare('SELECT COUNT(*) n FROM messages WHERE recipient=? AND read=0').bind(uid), env.DB.prepare("SELECT COUNT(*) n FROM friends WHERE (a=? OR b=?) AND status='pending' AND req<>?").bind(uid, uid, uid)]);
    return json({ n: u.results[0].n, req: r.results[0].n });
  }

  if (p === '/api/social' && m === 'GET') {
    const rows = (await env.DB.prepare(`SELECT f.*, u.id uid2, u.username, u.name, u.role FROM friends f JOIN users u ON u.id = CASE WHEN f.a=?1 THEN f.b ELSE f.a END WHERE f.a=?1 OR f.b=?1`).bind(uid).all()).results;
    const unread = Object.fromEntries((await env.DB.prepare('SELECT sender, COUNT(*) n FROM messages WHERE recipient=? AND read=0 GROUP BY sender').bind(uid).all()).results.map(r => [r.sender, r.n]));
    const lastIds = (await env.DB.prepare('SELECT MAX(id) id FROM messages WHERE sender=?1 OR recipient=?1 GROUP BY conv').bind(uid).all()).results.map(r => r.id);
    const last = {}; if (lastIds.length) { const L = (await env.DB.prepare(`SELECT id,conv,sender,kind,body,data,t FROM messages WHERE id IN (${lastIds.map(() => '?').join(',')})`).bind(...lastIds).all()).results;
      for (const x of L) { const other = x.conv.split(':').find(v => v !== uid) || uid; last[other] = { t: x.t, mine: x.sender === uid, kind: x.kind, text: x.kind === 'text' ? (await K.open(x.body)).slice(0, 80) : null, data: x.data ? JSON.parse(x.data) : null }; } }
    const out = { me: { username: me.username, name: first(me.name), role: me.role || null }, friends: [], incoming: [], outgoing: [] }; const XP = await xpMany(env, rows.map(r => r.uid2));
    for (const r of rows) { const o = { username: r.username, name: first(r.name), role: r.role || null, since: r.updated || r.created, xp: XP[r.uid2] || 0 };
      if (r.status === 'accepted') out.friends.push({ ...o, unread: unread[r.uid2] || 0, last: last[r.uid2] || null });
      else if (r.req === uid) out.outgoing.push(o); else out.incoming.push(o); }
    out.friends.sort((x, y) => ((y.last && y.last.t) || y.since || 0) - ((x.last && x.last.t) || x.since || 0));
    return json(out);
  }

  if (p === '/api/social/username' && m === 'POST') {
    const b = await readJSON(req); const u = cleanUsername(b.username); const e = await usernameError(env, u, uid); if (e) return err(e.includes('in gebruik') ? 409 : 400, e);
    await env.DB.prepare('UPDATE users SET username=? WHERE id=?').bind(u, uid).run(); return json({ ok: true, username: u });
  }
  if (!me.username) return err(400, 'Kies eerst een gebruikersnaam.');

  if (p === '/api/social/search' && m === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_.]/g, ''); if (q.length < 2) return json({ results: [] });
    const R = (await env.DB.prepare("SELECT id,username,name,role FROM users WHERE username LIKE ? AND id<>? ORDER BY length(username) LIMIT 8").bind(q + '%', uid).all()).results;
    const out = []; for (const u of R) { const r = await rel(env, uid, u.id); out.push({ username: u.username, name: first(u.name), role: u.role || null, status: r ? (r.status === 'accepted' ? 'friend' : r.req === uid ? 'sent' : 'received') : null }); }
    return json({ results: out });
  }

  if (p === '/api/social/request' && m === 'POST') {
    const b = await readJSON(req); const t = await userByName(env, b.username); if (!t) return err(404, 'Geen gebruiker met deze naam gevonden.'); if (t.id === uid) return err(400, 'Dat ben je zelf.');
    const r = await rel(env, uid, t.id); const [a, bb] = pair(uid, t.id); const now = Date.now();
    if (r && r.status === 'accepted') return json({ ok: true, status: 'friend' });
    if (r && r.req !== uid) { await env.DB.prepare("UPDATE friends SET status='accepted',updated=? WHERE a=? AND b=?").bind(now, a, bb).run();
      later(() => notifyUser(env, t.id, { title: `@${me.username} is nu je vriend`, body: 'Jullie kunnen nu chatten.', url: '/app#vrienden-' + me.username, tag: 'friend:' + me.username })); return json({ ok: true, status: 'friend' }); }
    if (r) return json({ ok: true, status: 'sent' });
    const cnt = await env.DB.prepare("SELECT COUNT(*) n FROM friends WHERE req=? AND status='pending' AND created>?").bind(uid, now - DAY).first(); if (cnt.n >= 30) return err(429, 'Je hebt vandaag al veel verzoeken verstuurd. Probeer het morgen opnieuw.');
    await env.DB.prepare('INSERT INTO friends(a,b,status,req,created) VALUES(?,?,?,?,?)').bind(a, bb, 'pending', uid, now).run();
    later(() => notifyUser(env, t.id, { title: 'Nieuw vriendschapsverzoek', body: `@${me.username} wil je toevoegen als vriend.`, url: '/app#vrienden', tag: 'freq:' + me.username }));
    return json({ ok: true, status: 'sent' });
  }

  if (p === '/api/social/respond' && m === 'POST') {
    const b = await readJSON(req); const t = await userByName(env, b.username); if (!t) return err(404, 'Gebruiker niet gevonden.');
    const r = await rel(env, uid, t.id); if (!r || r.status !== 'pending' || r.req === uid) return err(400, 'Er staat geen verzoek open van deze gebruiker.');
    const [a, bb] = pair(uid, t.id);
    if (b.accept) { await env.DB.prepare("UPDATE friends SET status='accepted',updated=? WHERE a=? AND b=?").bind(Date.now(), a, bb).run();
      later(() => notifyUser(env, t.id, { title: `@${me.username} heeft je verzoek geaccepteerd`, body: 'Jullie kunnen nu chatten.', url: '/app#vrienden-' + me.username, tag: 'friend:' + me.username })); }
    else await env.DB.prepare('DELETE FROM friends WHERE a=? AND b=?').bind(a, bb).run();
    return json({ ok: true });
  }

  if (p === '/api/social/remove' && m === 'POST') {
    const b = await readJSON(req); const t = await userByName(env, b.username); if (!t) return err(404, 'Gebruiker niet gevonden.'); const [a, bb] = pair(uid, t.id);
    await env.DB.prepare('DELETE FROM friends WHERE a=? AND b=?').bind(a, bb).run(); return json({ ok: true });
  }

  /* chat: alleen tussen vrienden */
  if (p === '/api/social/chat') {
    const t = await userByName(env, m === 'GET' ? url.searchParams.get('u') : (await req.clone().json().catch(() => ({}))).u); if (!t) return err(404, 'Gebruiker niet gevonden.');
    const r = await rel(env, uid, t.id); if (!r || r.status !== 'accepted') return err(403, 'Jullie zijn (nog) geen vrienden.');
    const c = conv(uid, t.id);
    if (m === 'GET') {
      const after = +url.searchParams.get('after') || 0, before = +url.searchParams.get('before') || 0;
      const rows = (after ? await env.DB.prepare('SELECT * FROM messages WHERE conv=? AND id>? ORDER BY id ASC LIMIT 50').bind(c, after).all()
        : before ? await env.DB.prepare('SELECT * FROM messages WHERE conv=? AND id<? ORDER BY id DESC LIMIT 40').bind(c, before).all()
        : await env.DB.prepare('SELECT * FROM messages WHERE conv=? ORDER BY id DESC LIMIT 40').bind(c).all()).results;
      if (!after) rows.reverse();
      const msgs = []; for (const x of rows) msgs.push({ id: x.id, me: x.sender === uid, kind: x.kind, text: x.kind === 'text' || x.body ? await K.open(x.body) : '', data: x.data ? JSON.parse(x.data) : null, t: x.t, read: !!x.read });
      if (rows.some(x => x.recipient === uid && !x.read)) await env.DB.prepare('UPDATE messages SET read=1 WHERE conv=? AND recipient=? AND read=0').bind(c, uid).run();
      const fx = after ? null : (await xpMany(env, [t.id]))[t.id];
      return json({ friend: { username: t.username, name: first(t.name), role: t.role || null, xp: fx }, messages: msgs, more: !after && rows.length === 40 });
    }
    if (m === 'POST') {
      const b = await readJSON(req); const text = String(b.text || '').trim().slice(0, 1000); if (!text) return err(400, 'Leeg bericht.');
      const recent = await env.DB.prepare('SELECT COUNT(*) n FROM messages WHERE sender=? AND t>?').bind(uid, Date.now() - MIN).first(); if (recent.n >= 30) return err(429, 'Je stuurt erg veel berichten. Wacht even.');
      const now = Date.now(); const res = await env.DB.prepare('INSERT INTO messages(conv,sender,recipient,kind,body,t) VALUES(?,?,?,?,?,?)').bind(c, uid, t.id, 'text', await K.seal(text), now).run();
      later(() => notifyUser(env, t.id, { title: `@${me.username}`, body: text.length > 120 ? text.slice(0, 117) + '…' : text, url: '/app#vrienden-' + me.username, tag: 'msg:' + me.username }));
      return json({ ok: true, message: { id: res.meta.last_row_id, me: true, kind: 'text', text, t: now, read: false } });
    }
  }

  if (p === '/api/social/send' && m === 'POST') {
    const b = await readJSON(req); const t = await userByName(env, b.u); if (!t) return err(404, 'Gebruiker niet gevonden.');
    const r = await rel(env, uid, t.id); if (!r || r.status !== 'accepted') return err(403, 'Je kunt alleen crypto sturen naar vrienden.');
    let tr; try { tr = await transferPaper(env, uid, t.id, { sym: b.sym, eur: b.eur != null ? +b.eur : null, qty: b.qty != null ? +b.qty : null, all: !!b.all, note: b.note }); } catch (e) { return err(400, e.message); }
    const note = b.note ? String(b.note).trim().slice(0, 140) : ''; const now = Date.now();
    const data = { sym: tr.sym, qty: tr.qty, eur: tr.eur, price: tr.price, demo: true };
    const res = await env.DB.prepare('INSERT INTO messages(conv,sender,recipient,kind,body,data,t) VALUES(?,?,?,?,?,?,?)').bind(conv(uid, t.id), uid, t.id, 'transfer', note ? await K.seal(note) : null, JSON.stringify(data), now).run();
    later(() => notifyUser(env, t.id, { title: `@${me.username} stuurde je ${tr.sym}`, body: `€ ${tr.eur.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} aan ${tr.sym}${note ? ': ' + note : ''}`, url: '/app#vrienden-' + me.username, tag: 'send:' + me.username + ':' + now }));
    return json({ ok: true, message: { id: res.meta.last_row_id, me: true, kind: 'transfer', text: note, data, t: now, read: false } });
  }
  return null;
}
