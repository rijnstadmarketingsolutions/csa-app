# Vantis — Crypto Intelligence

Crypto Intelligence voor crypto en aandelen. Prototype van Rijnstad Marketing Solutions.
Vantis is een **informatieplatform**: geen handel, geen bewaring van tegoeden, geen persoonlijk beleggingsadvies.

## Architectuur
Eén Cloudflare Worker (`vantis`) doet alles:

| Onderdeel | Waar |
|---|---|
| App (statische bestanden) | `site/` (gebouwd uit `src/` met `python build.py`) |
| API (accounts, 2FA, voorkeuren, portefeuilles, push, Stripe) | `worker/index.js` |
| 24/7 scanner (elke 5 min) + dagelijkse backtest (03:17 UTC) | `worker/index.js` → `scheduled`, logica in `worker/market.js` |
| Web Push (VAPID + aes128gcm, zonder bibliotheek) | `worker/push.js` |
| Stripe Checkout, klantportaal, webhook | `worker/billing.js` |
| Database | D1 `csa-db` (EU-jurisdictie), schema in `migrations/` |
| App-verpakking iOS/Android | Capacitor (`capacitor.config.json`) |

De oude link `csa-app-e9b.pages.dev` stuurt automatisch door naar de Worker.

## Publiceren
Elke push naar `main` → GitHub Actions: testen, bouwen, D1 aanmaken/migreren, Worker publiceren, geheimen zetten.

### GitHub-secrets (Settings → Secrets → Actions)
Verplicht:
- `CLOUDFLARE_API_TOKEN`: token met **Workers Scripts: Edit**, **D1: Edit**, **Cloudflare Pages: Edit**, **Account Settings: Read**
- `CLOUDFLARE_ACCOUNT_ID`

Optioneel (alles werkt zonder; met sleutel komt er meer data of betalen bij):
| Secret | Wat het toevoegt |
|---|---|
| `FINNHUB_KEY` | Aandelenkoersen, sectoren, extra nieuws (gratis sleutel via finnhub.io) |
| `COINGECKO_KEY` | Hogere limieten voor marktwaarde/dominantie/trending (gratis demo-sleutel) |
| `CRYPTOCOMPARE_KEY` | Hogere limieten voor cryptonieuws |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | Premium-abonnement via Stripe |
| `PREMIUM_PRICE_LABEL` | Prijs op de knop, bijv. `€ 9,99 per maand` |

`ENC_KEY` (versleuteling van 2FA-geheimen) wordt bij de eerste deploy automatisch aangemaakt en nooit overschreven.

### Premium aanzetten
1. Maak in Stripe een product met maandprijs → kopieer de `price_…`-id.
2. Voeg een webhook toe naar `https://<worker>/api/billing/webhook` met de events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` → kopieer het `whsec_…`-geheim.
3. Zet de drie Stripe-secrets in GitHub en push.
4. Pas als je Premium echt wilt afschermen: zet `PREMIUM_ENFORCED` in `wrangler.jsonc` op `"true"`. Tot die tijd is alles gratis te gebruiken.

## App Store en Google Play (Capacitor)
Voorbereid; de store-accounts komen later.
```bash
npm install
VANTIS_API_ORIGIN=https://vantis.<jouw-subdomein>.workers.dev npm run cap:sync   # bouwt site/ met het API-adres
npx cap add ios        # eenmalig, op een Mac met Xcode
npx cap add android    # eenmalig, met Android Studio
npm run cap:ios        # of: npm run cap:android
```
Aandachtspunten voor de stores:
- **Betalen in iOS:** Apple eist in-app aankopen voor digitale abonnementen. In de native app staat daarom geen koopknop. Beslis vóór indienen hoe Premium in de iOS-app werkt.
- **Pushmeldingen in de native apps** vragen APNs (Apple) en Firebase (Google); de huidige push werkt in browsers en de webapp op het beginscherm.
- Bij financiële apps vragen beide stores om een duidelijke disclaimer en privacyverklaring.

## AI-laag (volgende fase)
`/api/ai/briefing` bestaat al als aansluitpunt (antwoordt nu `501`). Plan: dagelijkse marktbriefing en samenvatting van nieuws bij "Waarom beweegt het?", met vaste regels: uitleggen en scenario's geven, nooit "koop" of "verkoop".

## Lokaal ontwikkelen
```bash
npm install
npx wrangler d1 migrations apply csa-db --local
npm run dev            # http://localhost:8787, cron testen via /__scheduled?cron=*/5+*+*+*+*
npm test               # unit-tests (push-versleuteling, TOTP, wachtwoorden, Impact Score, scanner)
node test/api.e2e.mjs  # end-to-end tegen de lokale worker
```

## Databronnen (alleen gratis)
Bitvavo (crypto, realtime) · CoinGecko (marktwaarde, dominantie, trending) · alternative.me (Fear & Greed) · CryptoCompare en Finnhub (nieuws) · Finnhub (aandelen, met gratis sleutel) · TradingView-widgets (grafieken, kalender, heatmap).
Nog niet gekoppeld (betaald): liquidaties, ETF-stromen, on-chain/whale-data. De app toont die punten als "nog niet gekoppeld".
