# Crypto Signal AI (CSA)

AI Market Intelligence voor crypto en aandelen. Prototype van Rijnstad Marketing Solutions.

- **Live:** https://csa-app.pages.dev
- **Bouwen:** `python build.py` maakt `site/index.html` uit de bestanden in `src/`.
- **Publiceren:** elke push naar `main` gaat via GitHub Actions automatisch naar Cloudflare Pages (project `csa-app`).

## Mappen
| Map | Inhoud |
|---|---|
| `src/` | broncode: `styles.css`, `body.html`, `engine.js` (data + analyse), `ui-core.js`, `ui-viz.js`, `ui-pages.js` |
| `assets/` | logo-paden en iconen die in de app worden ingebakken |
| `site/` | wat online komt: `index.html` (gegenereerd), manifest, app-iconen |
| `logo/` | gekozen CSA-logo (combi): SVG, app-icoon, 3D-munt |

## Databronnen
Bitvavo (crypto, realtime), TradingView-widgets (grafieken, kalender, heatmap), CryptoCompare (nieuws), Finnhub (aandelen, optioneel met eigen sleutel).

## Benodigde secrets (GitHub → Settings → Secrets → Actions)
- `CLOUDFLARE_API_TOKEN`: token met recht *Cloudflare Pages: Edit*
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account-ID
