import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

type CardBrand = 'Troy' | 'Visa' | 'Mastercard' | 'Amex';
type PaymentInitMode = 'card' | 'saved_card' | 'digital_wallet';

interface PaymentSession {
  sessionId: string;
  mode: PaymentInitMode;
  amountTry: number;
  cardBrand: CardBrand | '';
  last4: string;
  maskedCard: string;
  holderName: string;
  bankName: string;
  gatewayLabel: string;
  otpCode: string;
  attempts: number;
  expiresAt: number;
  stripePaymentIntentId?: string;
}

const paymentSessions = new Map<string, PaymentSession>();

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of paymentSessions.entries()) {
    if (session.expiresAt < now) {
      paymentSessions.delete(id);
    }
  }
}

function luhnCheck(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function detectCardBrand(digits: string): CardBrand {
  if (/^(9792|65)/.test(digits)) return 'Troy';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)) {
    return 'Mastercard';
  }
  return 'Visa';
}

function isExpiryValid(expiry: string): boolean {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
}

function resolveBankName(brand: CardBrand): string {
  switch (brand) {
    case 'Troy':
      return 'TROY Ulusal Kart Ağı · 3D Secure';
    case 'Mastercard':
      return 'Mastercard Identity Check · 3D Secure';
    case 'Amex':
      return 'American Express SafeKey · 3D Secure';
    default:
      return 'Visa Secure · 3D Secure Doğrulama';
  }
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timePart = Date.now().toString(36).slice(-5).toUpperCase();
  return `${prefix}-${timePart}${rand}`;
}

async function createStripePaymentIntentIfConfigured(
  amountTry: number,
  description: string
): Promise<{ id: string } | null> {
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecret) return null;

  try {
    const body = new URLSearchParams({
      amount: String(Math.round(amountTry * 100)),
      currency: 'try',
      'automatic_payment_methods[enabled]': 'true',
      description,
    });

    const resp = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!resp.ok) return null;
    const data = (await resp.json()) as { id?: string };
    return data.id ? { id: data.id } : null;
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/payments/config', (_req, res) => {
    const hasStripe = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
    res.json({
      gatewayMode: hasStripe ? 'stripe_hybrid' : 'sofrapay_3ds',
      gatewayLabel: hasStripe
        ? 'Stripe & SofraPay 3D Secure POS'
        : 'SofraPay 3D Secure Sanal POS',
      supportedBrands: ['Troy', 'Visa', 'Mastercard', 'Amex'],
      currencies: ['TRY', 'USD', 'EUR', 'JPY', 'GBP', 'THB'],
    });
  });

  app.post('/api/payments/initiate', async (req, res) => {
    cleanupExpiredSessions();

    const body = (req.body ?? {}) as {
      mode?: PaymentInitMode;
      amountTry?: number;
      restaurantName?: string;
      customerName?: string;
      cardNumber?: string;
      holderName?: string;
      expiry?: string;
      cvc?: string;
      savedCardId?: string;
      brand?: CardBrand;
      last4?: string;
      use3DS?: boolean;
      walletProvider?: string;
    };

    const mode = body.mode;
    const amountTry = Number(body.amountTry ?? 0);

    if (!Number.isFinite(amountTry) || amountTry < 1 || amountTry > 500000) {
      res.status(400).json({ error: 'Geçersiz ödeme tutarı.' });
      return;
    }

    if (mode === 'digital_wallet') {
      const walletMap: Record<string, string> = {
        sofracuzdan: 'SofraCüzdan Anlık Bakiye',
        apple_google_pay: 'Apple Pay / Google Pay',
        aninda_havale: 'Anında FAST / QR Ödeme',
      };
      const walletLabel =
        walletMap[body.walletProvider ?? 'sofracuzdan'] ??
        'Dijital Cüzdan Ödemesi';
      const transactionId = generateId('TRX');
      const authCode = Math.floor(100000 + Math.random() * 899999).toString();

      res.json({
        status: 'paid',
        requires3DS: false,
        transactionId,
        authCode,
        paidAt: new Date().toISOString(),
        gatewayLabel: walletLabel,
        cardBrand: '',
        last4: '',
        maskedCard: walletLabel,
        amountTry,
      });
      return;
    }

    let cardBrand: CardBrand = 'Visa';
    let last4 = '';
    let holderName = (body.holderName ?? '').trim();

    if (mode === 'saved_card') {
      const cvcClean = (body.cvc ?? '').replace(/\D/g, '');
      cardBrand = body.brand ?? 'Visa';
      last4 = (body.last4 ?? '').replace(/\D/g, '').slice(-4);
      const expectedCvcLen = cardBrand === 'Amex' ? 4 : 3;

      if (!body.savedCardId || last4.length !== 4 || holderName.length < 2) {
        res.status(400).json({ error: 'Kayıtlı kart bilgileri eksik.' });
        return;
      }
      if (cvcClean.length !== expectedCvcLen) {
        res.status(400).json({
          error: `Güvenlik kodu (CVC) ${expectedCvcLen} haneli olmalıdır.`,
        });
        return;
      }
    } else if (mode === 'card') {
      const digits = (body.cardNumber ?? '').replace(/\D/g, '');
      const expiry = (body.expiry ?? '').trim();
      const cvcClean = (body.cvc ?? '').replace(/\D/g, '');

      if (holderName.length < 2) {
        res.status(400).json({ error: 'Kart üzerindeki ad soyadı girin.' });
        return;
      }
      if (!luhnCheck(digits)) {
        res.status(400).json({
          error: 'Kart numarası geçersiz. Lütfen kart numarasını kontrol edin.',
        });
        return;
      }
      cardBrand = detectCardBrand(digits);
      if (!isExpiryValid(expiry)) {
        res.status(400).json({
          error: 'Son kullanma tarihi geçersiz veya süresi dolmuş (AA/YY).',
        });
        return;
      }
      const expectedCvcLen = cardBrand === 'Amex' ? 4 : 3;
      if (cvcClean.length !== expectedCvcLen) {
        res.status(400).json({
          error: `${cardBrand} kartlar için CVC ${expectedCvcLen} haneli olmalıdır.`,
        });
        return;
      }
      last4 = digits.slice(-4);
    } else {
      res.status(400).json({ error: 'Desteklenmeyen ödeme yöntemi.' });
      return;
    }

    const maskedCard = `${cardBrand} •••• ${last4}`;
    const stripeIntent = await createStripePaymentIntentIfConfigured(
      amountTry,
      `Sofra Atlas — ${body.restaurantName ?? 'Sipariş'}`
    );
    const gatewayLabel = stripeIntent
      ? 'Stripe 3D Secure'
      : 'SofraPay 3D Secure Sanal POS';

    const use3DS = body.use3DS !== false;
    if (!use3DS) {
      const transactionId = stripeIntent?.id ?? generateId('TRX');
      const authCode = Math.floor(100000 + Math.random() * 899999).toString();
      res.json({
        status: 'paid',
        requires3DS: false,
        transactionId,
        authCode,
        paidAt: new Date().toISOString(),
        gatewayLabel,
        cardBrand,
        last4,
        maskedCard,
        amountTry,
      });
      return;
    }

    const sessionId = generateId('3DS');
    const otpCode = Math.floor(100000 + Math.random() * 899999).toString();

    paymentSessions.set(sessionId, {
      sessionId,
      mode,
      amountTry,
      cardBrand,
      last4,
      maskedCard,
      holderName,
      bankName: resolveBankName(cardBrand),
      gatewayLabel,
      otpCode,
      attempts: 0,
      expiresAt: Date.now() + 10 * 60 * 1000,
      stripePaymentIntentId: stripeIntent?.id,
    });

    res.json({
      status: 'requires_3ds',
      requires3DS: true,
      sessionId,
      bankName: resolveBankName(cardBrand),
      gatewayLabel,
      cardBrand,
      last4,
      maskedCard,
      amountTry,
      demoOtpHint: otpCode,
    });
  });

  app.post('/api/payments/confirm-3ds', (req, res) => {
    cleanupExpiredSessions();
    const body = (req.body ?? {}) as { sessionId?: string; otpCode?: string };
    const sessionId = (body.sessionId ?? '').trim();
    const otpCode = (body.otpCode ?? '').replace(/\D/g, '');

    const session = paymentSessions.get(sessionId);
    if (!session) {
      res.status(404).json({
        error: '3D Secure oturumu bulunamadı veya süresi doldu. Lütfen tekrar deneyin.',
      });
      return;
    }

    session.attempts += 1;
    if (session.attempts > 5) {
      paymentSessions.delete(sessionId);
      res.status(429).json({
        error: 'Çok fazla hatalı deneme yapıldı. Ödeme oturumu iptal edildi.',
      });
      return;
    }

    if (otpCode !== session.otpCode) {
      res.status(400).json({
        error: 'SMS doğrulama kodu hatalı. Lütfen 6 haneli kodu kontrol edin.',
      });
      return;
    }

    paymentSessions.delete(sessionId);
    const transactionId = session.stripePaymentIntentId ?? generateId('TRX');
    const authCode = Math.floor(100000 + Math.random() * 899999).toString();

    res.json({
      status: 'paid',
      transactionId,
      authCode,
      paidAt: new Date().toISOString(),
      gatewayLabel: session.gatewayLabel,
      cardBrand: session.cardBrand,
      last4: session.last4,
      maskedCard: session.maskedCard,
      amountTry: session.amountTry,
    });
  });

  app.post('/api/payments/refund', (req, res) => {
    const body = (req.body ?? {}) as {
      transactionId?: string;
      amountTry?: number;
    };
    const transactionId = (body.transactionId ?? '').trim();
    const amountTry = Number(body.amountTry ?? 0);

    if (!transactionId || !Number.isFinite(amountTry) || amountTry <= 0) {
      res.status(400).json({ error: 'İade işlemi için geçerli işlem no gerekir.' });
      return;
    }

    res.json({
      status: 'refunded',
      transactionId,
      refundId: generateId('RFD'),
      refundedAt: new Date().toISOString(),
      amountTry,
    });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sofra Atlas server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
