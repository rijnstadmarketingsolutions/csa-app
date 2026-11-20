// Web Push zonder externe bibliotheken: VAPID (RFC 8292) + aes128gcm-versleuteling (RFC 8291)
import { b64u, enc, concat, rand, kvGet, kvPut } from './lib.js';

async function hmac(key, data) { const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, data)); }

export async function vapidKeys(env) {
  if (env.VAPID_PUBLIC && env.VAPID_PRIVATE_JWK) return { pub: env.VAPID_PUBLIC, jwk: JSON.parse(env.VAPID_PRIVATE_JWK) };
  const got = await kvGet(env, 'vapid'); if (got) return got.val;
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = b64u.enc(await crypto.subtle.exportKey('raw', kp.publicKey)); const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const val = { pub, jwk }; await kvPut(env, 'vapid', val); return val;
}
async function vapidAuth(env, endpoint) {
  const { pub, jwk } = await vapidKeys(env);
  const aud = new URL(endpoint).origin;
  const header = b64u.enc(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64u.enc(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:info@rijnstadmarketing.nl' })));
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(header + '.' + payload));
  return `vapid t=${header}.${payload}.${b64u.enc(sig)}, k=${pub}`;
}
/** Versleutelt een payload voor één abonnement (RFC 8291, aes128gcm). Exporteerd voor tests. */
export async function encryptPayload(sub, payloadBytes, fixed = {}) {
  const uaPublic = b64u.dec(sub.p256dh), authSecret = b64u.dec(sub.auth);
  const as = fixed.asKeyPair || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const prkKey = await hmac(authSecret, ecdh);
  const ikm = await hmac(prkKey, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])));
  const salt = fixed.salt || rand(16);
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(payloadBytes, new Uint8Array([2]))));
  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ct);
}
/** Stuurt één melding. Geeft 'gone' terug als het abonnement niet meer bestaat. */
export async function sendPush(env, sub, message, ttl = 86400) {
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(message)));
  const res = await fetch(sub.endpoint, { method: 'POST', body, headers: {
    'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: String(ttl), urgency: message.urgency || 'normal',
    authorization: await vapidAuth(env, sub.endpoint) } });
  if (res.status === 404 || res.status === 410) return 'gone';
  return res.ok ? 'ok' : 'fail:' + res.status;
}
