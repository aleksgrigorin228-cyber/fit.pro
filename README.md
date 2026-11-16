# FIT PRO

A responsive fitness-program landing page with automatic browser-language detection (Uzbek, Russian, English), editable UZS pricing, and a QR flow that points only to official HTTPS checkout links supplied by a merchant provider.

## Included

- `public/index.html` — responsive landing page and RU/UZ/EN localization.
- `server.js` — Express server; validates the selected plan on the server and generates a QR code for the configured official checkout link.
- `package.json` — Node.js dependencies and scripts.
- `.env.example` — payment-link configuration template.
- `.gitignore` — excludes local secrets and dependencies.
- `render.yaml` — Render web-service blueprint.

## Prices

The example prices are deliberately set in Uzbek soʻm:

| Plan | Price |
|---|---:|
| Starter | 200,000 UZS |
| Pro | 350,000 UZS |
| Elite | 500,000 UZS |

The amounts are defined on the server in `server.js`. Update both `server.js` and the matching display amounts in `public/index.html` if you change them.

## Language behaviour

On the first visit, the page checks `navigator.languages` / `navigator.language`:
- Uzbek (`uz`) → Uzbek
- Russian (`ru`) → Russian
- Any other language → English

Visitors can manually choose RU / UZ / EN / Auto. Their choice is saved in local browser storage. Choosing Auto returns to device-language detection.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`.

## Payment setup — do not skip

This project intentionally does **not** accept card details and does not invent a bank QR. The QR contains a secure HTTPS checkout URL issued by your approved merchant/payment provider.

1. Complete the merchant onboarding with a payment provider (for example Click Business or Payme Business) using the correct legal/business details and bank settlement account.
2. Ask the provider whether it can issue fixed-amount hosted checkout links for the three plans. The links must correspond to 200,000 / 350,000 / 500,000 UZS.
3. In Render → your service → Environment, set:
   - `PAYMENT_LINK_STARTER`
   - `PAYMENT_LINK_PRO`
   - `PAYMENT_LINK_ELITE`
4. Each value must be the provider-issued `https://...` payment URL for the matching amount.
5. Redeploy and test the QR using the provider's test mode, if available.

If a link is missing or invalid, the website shows that payments are not configured and does not display a QR. Never paste personal card details, CVV, banking passwords, or passport data into these environment variables or into ChatGPT.

### Important payment limitations

The current QR flow opens a provider-hosted payment page. It does **not** yet receive signed payment webhooks, store paid orders, or automatically unlock digital content. A QR scan is not proof of payment. Until the provider's official API/webhook is integrated and tested, access must not be granted automatically; verify the transaction in the merchant dashboard. To automate delivery, add the provider's documented invoice API, signature verification, persistent order storage, and a protected access-delivery endpoint.

Do not use a personal-card transfer QR as a substitute for merchant acquiring unless the bank/provider explicitly confirms that it is permitted for commercial sales and provides a verifiable payment notification.

## Deploy to Render

1. Push this project to a GitHub repository.
2. In Render, create a **New + → Blueprint** and select the repository (or create a Web Service with `npm install` and `npm start`).
3. Render reads `render.yaml`; set the three payment-link environment variables only after the merchant provider issues official URLs.
4. Check `/api/health` after deployment.

The `render.yaml` file defines the app service but does not publish the project to GitHub or create a Render account for you.

## Security notes

- Checkout links are configured server-side; the browser cannot choose its own amount or destination URL.
- Only HTTPS checkout URLs are accepted.
- No card data is collected or stored by FIT PRO.
- Never commit `.env` or provider secrets to GitHub.