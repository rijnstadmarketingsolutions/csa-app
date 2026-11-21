// Vantis worker — gedeelde hulpfuncties: HTTP, crypto, wachtwoorden, TOTP, sessies
export const enc = new TextEncoder();
export const dec = new TextDecoder();

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
export const err = (status, message, extra = {}) => json({ error: message, ...extra }, status);

export const b64u = {
  enc(buf) { const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec(str) { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; const s = atob(str); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }
};
export const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
export const rand = n => crypto.getRandomValues(new Uint8Array(n));
export const randToken = (n = 32) => b64u.enc(rand(n));
export async function sha256(s) { return hex(await crypto.subtle.digest('SHA-256', typeof s === 'string' ? enc.encode(s) : s)); }
export function concat(...parts) { const n = parts.reduce((s, p) => s + p.length, 0); const o = new Uint8Array(n); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; }
export function safeEqual(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

/* ---------- wachtwoorden: PBKDF2-SHA256 (max. iteraties op Workers) ---------- */
const PBKDF2_ITER = 100000;
export async function hashPassword(pw, saltB64) {
  const salt = saltB64 ? b64u.dec(saltB64) : rand(16);
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITER }, key, 256);
  return `pbkdf2$${PBKDF2_ITER}$${b64u.enc(salt)}$${b64u.enc(bits)}`;
}
export async function verifyPassword(pw, stored) {
  const [, , salt, hash] = (stored || '').split('$');
  if (!salt || !hash) return false;
  const again = await hashPassword(pw, salt);
  return safeEqual(again.split('$')[3], hash);
}

/* ---------- TOTP (RFC 6238) ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function b32enc(bytes) { let bits = ''; for (const b of bytes) bits += b.toString(2).padStart(8, '0'); let o = ''; for (let i = 0; i + 5 <= bits.length; i += 5) o += B32[parseInt(bits.slice(i, i + 5), 2)]; return o; }
export function b32dec(s) { s = s.replace(/=+$/, '').replace(/\s/g, '').toUpperCase(); let bits = ''; for (const c of s) { const v = B32.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, '0'); } const o = new Uint8Array(Math.floor(bits.length / 8)); for (let i = 0; i < o.length; i++) o[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2); return o; }
export async function totp(secret, t = Date.now(), step = 30) {
  const ctr = Math.floor(t / 1000 / step); const buf = new ArrayBuffer(8); const dv = new DataView(buf);
  dv.setUint32(0, Math.floor(ctr / 2 ** 32)); dv.setUint32(4, ctr >>> 0);
  const key = await crypto.subtle.importKey('raw', b32dec(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf)); const o = h[h.length - 1] & 15;
  return String(((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6).padStart(6, '0');
}
export async function totpCheck(secret, code) { if (!/^\d{6}$/.test(code || '')) return false; for (const d of [-1, 0, 1]) if (await totp(secret, Date.now() + d * 30000) === code) return true; return false; }

/* ---------- optionele versleuteling van TOTP-geheimen (ENC_KEY als secret) ---------- */
async function aesKey(env) { if (!env.ENC_KEY) return null; const raw = await crypto.subtle.digest('SHA-256', enc.encode(env.ENC_KEY)); return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
export async function seal(env, text) { const k = await aesKey(env); if (!k) return 'plain:' + text; const iv = rand(12); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(text)); return 'gcm:' + b64u.enc(iv) + '.' + b64u.enc(ct); }
export async function open(env, sealed) {
  if (!sealed) return null; if (sealed.startsWith('plain:')) return sealed.slice(6);
  const k = await aesKey(env); if (!k) throw new Error('ENC_KEY ontbreekt'); const [iv, ct] = sealed.slice(4).split('.');
  return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64u.dec(iv) }, k, b64u.dec(ct)));
}

/* ---------- sessies ---------- */
export const DAY = 864e5, HOUR = 36e5, MIN = 6e4;
export async function newSession(env, userId, kind = 'full', ttl = 12 * HOUR) {
  const token = randToken(32); const exp = Date.now() + ttl;
  await env.DB.prepare('INSERT INTO sessions(token,user_id,expires,kind) VALUES(?,?,?,?)').bind(await sha256(token), userId, exp, kind).run();
  return { token, expires: exp };
}
export async function sessionFrom(env, request, kind = 'full') {
  const h = request.headers.get('authorization') || ''; const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null; return sessionByToken(env, token, kind);
}
export async function sessionByToken(env, token, kind = 'full') {
  const row = await env.DB.prepare('SELECT s.user_id,s.expires,s.kind,u.email,u.name,u.plan,u.totp_on,u.stripe_customer,u.last_seen,u.username,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?').bind(await sha256(token)).first();
  if (!row || row.expires < Date.now() || row.kind !== kind) return null; return { ...row, token };
}
/* ---------- simpele rate limit ---------- */
export async function limited(env, key, max = 5, windowMs = 15 * MIN) {
  const now = Date.now(); const r = await env.DB.prepare('SELECT n,until FROM attempts WHERE key=?').bind(key).first();
  if (r && r.until > now && r.n >= max) return Math.ceil((r.until - now) / 1000);
  return 0;
}
export async function bump(env, key, windowMs = 15 * MIN) {
  const now = Date.now();
  await env.DB.prepare('INSERT INTO attempts(key,n,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=CASE WHEN until<? THEN 1 ELSE n+1 END, until=CASE WHEN until<? THEN ? ELSE until END').bind(key, now + windowMs, now, now, now + windowMs).run();
}
export const clearAttempts = (env, key) => env.DB.prepare('DELETE FROM attempts WHERE key=?').bind(key).run();
export async function readJSON(request, max = 64 * 1024) {
  const t = await request.text(); if (t.length > max) throw new Error('te groot'); try { return t ? JSON.parse(t) : {}; } catch { throw new Error('ongeldige JSON'); }
}
export async function kvGet(env, key) { const r = await env.DB.prepare('SELECT val,ts FROM kv WHERE key=?').bind(key).first(); return r ? { val: JSON.parse(r.val), ts: r.ts } : null; }
export const kvPutStmt = (env, key, val) => env.DB.prepare('INSERT INTO kv(key,val,ts) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET val=excluded.val, ts=excluded.ts').bind(key, JSON.stringify(val), Date.now());
export const kvPut = (env, key, val) => kvPutStmt(env, key, val).run();

/* abonnementen: Gratis < Plus < Pro < Elite ('premium' is de oude naam van Plus) */
export const TIERS = { free: 0, premium: 1, plus: 1, pro: 2, elite: 3 };
export const tierRank = p => TIERS[p] ?? 0;

/* gebruikersnamen: 3-20 tekens, kleine letters, cijfers, punt of liggend streepje */
export const UN_RESERVED = new Set(['admin', 'vantis', 'support', 'help', 'system', 'beheer', 'root', 'team', 'info', 'official', 'moderator', 'staff', 'security', 'founder', 'partner', 'ai', 'bot']);
const UN_RX = /^[a-z0-9](?:[a-z0-9_.]{1,18})[a-z0-9]$/;
export function cleanUsername(u) { return String(u || '').trim().toLowerCase().replace(/^@/, ''); }
export async function usernameError(env, u, uid) {
  if (!UN_RX.test(u) || u.includes('..')) return 'Gebruik 3 tot 20 tekens: kleine letters, cijfers, punt of liggend streepje, niet aan het begin of eind.';
  if (UN_RESERVED.has(u)) return 'Deze gebruikersnaam is niet beschikbaar.';
  const t = await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(u).first(); if (t && t.id !== uid) return `@${u} is al in gebruik.`;
  return null;
}

/* staff-rollen: hoger getal = meer rechten; beheerders vanaf 'admin' */
export const ROLES = { founder: { n: 'Founder', r: 100 }, senior_partner: { n: 'Senior Partner', r: 90 }, admin: { n: 'Admin', r: 80 }, moderator: { n: 'Moderator', r: 40 }, coach: { n: 'Coach', r: 30 }, analist: { n: 'Analist', r: 30 }, support: { n: 'Support', r: 20 } };
export const roleRank = r => (ROLES[r] && ROLES[r].r) || 0;
