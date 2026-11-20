// Stripe premium-abonnement: Checkout, klantportaal en webhook (zonder SDK)
import { json, err, enc, hex, safeEqual } from './lib.js';

export const stripeReady = env => !!(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID);

async function stripe(env, path, params) {
  const body = new URLSearchParams(); for (const [k, v] of Object.entries(params)) if (v != null) body.append(k, String(v));
  const r = await fetch('https://api.stripe.com/v1' + path, { method: 'POST', body, headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'content-type': 'application/x-www-form-urlencoded' } });
  const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || 'Stripe-fout ' + r.status); return j;
}
export async function checkout(env, user, origin) {
  if (!stripeReady(env)) return err(503, 'Betalen is nog niet gekoppeld (Stripe-sleutels ontbreken).');
  const s = await stripe(env, '/checkout/sessions', {
    mode: 'subscription', 'line_items[0][price]': env.STRIPE_PRICE_ID, 'line_items[0][quantity]': 1,
    success_url: origin + '/#premium-ok', cancel_url: origin + '/#premium',
    client_reference_id: user.user_id, ...(user.stripe_customer ? { customer: user.stripe_customer } : { customer_email: user.email }),
    'subscription_data[metadata][user_id]': user.user_id, allow_promotion_codes: true, locale: 'nl'
  });
  return json({ url: s.url });
}
export async function portal(env, user, origin) {
  if (!stripeReady(env)) return err(503, 'Betalen is nog niet gekoppeld.');
  if (!user.stripe_customer) return err(400, 'Nog geen abonnement.');
  const s = await stripe(env, '/billing_portal/sessions', { customer: user.stripe_customer, return_url: origin + '/#premium' });
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
    await env.DB.prepare("UPDATE users SET plan='premium', stripe_customer=? WHERE id=?").bind(o.customer, o.client_reference_id).run();
  } else if (evt.type === 'customer.subscription.updated' || evt.type === 'customer.subscription.created') {
    const active = ['active', 'trialing', 'past_due'].includes(o.status);
    await env.DB.prepare('UPDATE users SET plan=? WHERE stripe_customer=?').bind(active ? 'premium' : 'free', o.customer).run();
  } else if (evt.type === 'customer.subscription.deleted') {
    await env.DB.prepare("UPDATE users SET plan='free' WHERE stripe_customer=?").bind(o.customer).run();
  }
  return json({ received: true });
}
