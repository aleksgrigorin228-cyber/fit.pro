'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const QRCode = require('qrcode');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Prices are fixed on the server. The browser cannot change the amount.
const PLANS = Object.freeze({
  starter: { amount: 200000, priceLabel: '200 000 UZS', env: 'PAYMENT_LINK_STARTER' },
  pro: { amount: 350000, priceLabel: '350 000 UZS', env: 'PAYMENT_LINK_PRO' },
  elite: { amount: 500000, priceLabel: '500 000 UZS', env: 'PAYMENT_LINK_ELITE' },
});

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  index: 'index.html',
  extensions: ['html'],
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
}));

function configuredCheckoutUrl(envName) {
  const raw = process.env[envName];
  if (!raw) return null;
  try {
    const url = new URL(raw);
    // Only secure provider-hosted links are accepted. No raw card data is handled here.
    if (url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', paymentsConfigured: Object.values(PLANS).some(p => configuredCheckoutUrl(p.env)) });
});

app.post('/api/payment-link', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const planId = req.body && req.body.plan;
  const plan = PLANS[planId];
  if (!plan) {
    return res.status(400).json({ error: 'Unknown plan.' });
  }

  const checkoutUrl = configuredCheckoutUrl(plan.env);
  if (!checkoutUrl) {
    return res.status(503).json({
      error: 'PAYMENT_NOT_CONFIGURED',
      message: 'The official merchant checkout link has not been configured for this plan.',
    });
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(checkoutUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 360,
      color: { dark: '#101610', light: '#ffffff' },
    });
    return res.json({
      plan: planId,
      amount: plan.amount,
      priceLabel: plan.priceLabel,
      checkoutUrl,
      qrDataUrl,
      confirmation: 'manual',
    });
  } catch (error) {
    console.error('QR generation failed:', error.message);
    return res.status(500).json({ error: 'Could not generate payment QR.' });
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FIT PRO running on port ${PORT}`);
});