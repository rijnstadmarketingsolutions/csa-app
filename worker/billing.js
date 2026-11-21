// Stripe premium-abonnement: Checkout, klantportaal en webhook (zonder SDK)
import { json, err, enc, hex, safeEqual } from './lib.js';

const PRICES = env => ({
  'plus-month': env.STRIPE_PRICE_PLUS || env.STRIPE_PRICE_ID, 'plus-year': env.STRIPE_PRICE_PLUS_YEAR || env.STRIPE_PRICE_ID_YEAR,
  'pro-month': env.STRIPE_PRICE_PRO || env.STRIPE_PRICE_ID_PRO, 'pro-year': env.STRIPE_PRICE_PRO_YEAR,
  'elite-month': env.STRIPE_PRICE_ELITE, 'elite-year': env.STRIPE_PRICE_ELITE_YEAR });
const LABELS = { 'plus-month': '€ 4,99 per maand', 'plus-year': '€ 49 per jaar', 'pro-month': '€ 12,99 per maand', 'pro-year': '€ 129 per jaar', 'elite-month': '€ 29,99 per maand', 'elite-year': '€ 299 per jaar' };
export const stripeReady = env => !!env.STRIPE_SECRET_KEY && Object.values(PRICES(env)).some(Boolean);
export function plans(env) {
  const P = PRICES(env); const L = [];
  for (const id of Object.keys(LABELS)) { const [tier, period] = id.split('-'); L.push({ id, tier, period, label: env['LABEL_' + id.replace('-', '_').toUpperCase()] || LABELS[id], available: !!P[id] }); }
  return { ready: stripeReady(env), trialDays: +(env.TRIAL_DAYS || 7), plans: L };
}
const PRICE = (env, id) => PRICES(env)[id];
const tierOf = t => ['plus', 'pro', 'elite'].includes(t) ? t : 'plus';
async function stripe(env, path, params) {
  const body = new URLSearchParams(); for (const [k, v] of Object.entries(params)) if (v != null) body.append(k, String(v));
  const r = await fetch('https://api.stripe.com/v1' + path, { method: 'POST', body, headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'content-type': 'application/x-www-form-urlencoded' } });
  const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || 'Stripe-fout ' + r.status); return j;
}
export async function checkout(env, user, origin, body = {}) {
  if (!stripeReady(env)) return err(503, 'Betalen is nog niet gekoppeld (Stripe-sleutels ontbreken).');
  const id = body.plan || 'plus-month'; const price = PRICE(env, id); if (!price) return err(400, 'Dit abonnement is niet beschikbaar.');
  const tier = tierOf(id.split('-')[0]);
  const u = await env.DB.prepare('SELECT trial_used FROM users WHERE id=?').bind(user.user_id).first(); const days = +(env.TRIAL_DAYS || 7); const trial = !u?.trial_used && days > 0;
  const s = await stripe(env, '/checkout/sessions', {
    mode: 'subscription', 'line_items[0][price]': price, 'line_items[0][quantity]': 1,
    success_url: origin + '/app#premium-ok', cancel_url: origin + '/app#premium',
    client_reference_id: user.user_id, ...(user.stripe_customer ? { customer: user.stripe_customer } : { customer_email: user.email }),
    'subscription_data[metadata][user_id]': user.user_id, 'subscription_data[metadata][tier]': tier, 'metadata[tier]': tier,
    ...(trial ? { 'subscription_data[trial_period_days]': days } : {}), allow_promotion_codes: true, locale: 'nl'
  });
  if (trial) await env.DB.prepare('UPDATE users SET trial_used=1 WHERE id=?').bind(user.user_id).run();
  return json({ url: s.url, trial: trial ? days : 0 });
}
export async function portal(env, user, origin) {
  if (!stripeReady(env)) return err(503, 'Betalen is nog niet gekoppeld.');
  if (!user.stripe_customer) return err(400, 'Nog geen abonnement.');
  const s = await stripe(env, '/billing_portal/sessions', { customer: user.stripe_customer, return_url: origin + '/app#premium' });
  return json({ url: s.url });
}
/** Controleert de Stripe-handtekening (t=…,v1=…) en verwerkt abonnementsgebeurtenissen. */
export async function webhook(env, request) {
  if (!env.STRIPE_WEBHOOK_SECRET) return err(503, 'Webhook niet ingesteld');
  const payload = await request.text(); const sig = request.headers.get('stripe-signature') || '';
  const parts = Object.fromEntries(sig.split(',').map(p => p.split('=')).filter(p => p.length === 2).map(([k, v]) => [k, v]));
  const v1s = sig.split(',').filter(p => p.startsWith('v1=')).map(p => p.slice(3));
  if (!parts.t || !v1s.length) return err(400, 'Geen handtekening');
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return err(400, 'Handtekening verlopen');
  const key = await crypto.subtle.importKey('raw', enc.encode(env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, enc.encode(parts.t + '.' + payload)));
  if (!v1s.some(v => safeEqual(v, expected))) return err(400, 'Ongeldige handtekening');
  const evt = JSON.parse(payload); const o = evt.data?.object || {};
  if (evt.type === 'checkout.session.completed' && o.client_reference_id) {
    await env.DB.prepare("UPDATE users SET plan=?, stripe_customer=? WHERE id=?").bind(tierOf(o.metadata?.tier), o.customer, o.client_reference_id).run();
  } else if (evt.type === 'customer.subscription.updated' || evt.type === 'customer.subscription.created') {
    const active = ['active', 'trialing', 'past_due'].includes(o.status);
    await env.DB.prepare('UPDATE users SET plan=? WHERE stripe_customer=?').bind(active ? tierOf(o.metadata?.tier) : 'free', o.customer).run();
  } else if (evt.type === 'customer.subscription.deleted') {
    await env.DB.prepare("UPDATE users SET plan='free' WHERE stripe_customer=?").bind(o.customer).run();
  }
  return json({ received: true });
}
