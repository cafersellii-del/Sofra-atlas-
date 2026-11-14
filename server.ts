import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { ALL_COUNTRY_HUBS } from './src/data/countries.ts';

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

function resolvePublicOrigin(req: express.Request): string {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, '');
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured;
  }
  const forwardedProto = String(req.headers['x-forwarded-proto'] ?? '')
    .split(',')[0]
    ?.trim();
  const proto = forwardedProto || req.protocol || 'https';
  const host = String(req.headers['x-forwarded-host'] ?? req.get('host') ?? `localhost:${PORT}`)
    .split(',')[0]
    ?.trim();
  return `${proto}://${host}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

type SupportChatChannel = 'restaurant' | 'courier';
type SupportSenderRole = 'customer' | 'restaurant' | 'courier';
type SupportOrderStatus = 'received' | 'preparing' | 'on_the_way' | 'delivered';

interface SupportChatMessage {
  id: string;
  clientMessageId?: string;
  orderId: string;
  channel: SupportChatChannel;
  senderRole: SupportSenderRole;
  senderName: string;
  text: string;
  createdAt: string;
}

interface SupportThreadRecord {
  orderId: string;
  restaurantName: string;
  courierName: string;
  customerName: string;
  cityName: string;
  neighborhood: string;
  orderStatus: SupportOrderStatus;
  lastMessageAt: string;
  unreadForCustomer: number;
  unreadForStaff: number;
  messages: SupportChatMessage[];
}

interface SupportOrderMetaInput {
  restaurantName?: string;
  courierName?: string;
  customerName?: string;
  cityName?: string;
  neighborhood?: string;
  orderStatus?: SupportOrderStatus;
}

const SUPPORT_STORE_PATH = path.join(os.tmpdir(), 'sofra-atlas-support-threads.json');
const supportThreads = new Map<string, SupportThreadRecord>();
const orderRooms = new Map<string, Set<WebSocket>>();
const inboxClients = new Set<WebSocket>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function sanitizeChatString(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function normalizeOrderId(raw: unknown): string {
  const cleaned = sanitizeChatString(raw, 40).replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned;
}

function loadSupportThreadsFromDisk() {
  try {
    if (!fs.existsSync(SUPPORT_STORE_PATH)) return;
    const raw = fs.readFileSync(SUPPORT_STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as SupportThreadRecord[];
    if (!Array.isArray(parsed)) return;
    for (const item of parsed) {
      if (item && typeof item.orderId === 'string' && Array.isArray(item.messages)) {
        supportThreads.set(item.orderId, item);
      }
    }
  } catch {
    // Start fresh if store file is unreadable
  }
}

function schedulePersistSupportThreads() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const data = JSON.stringify(Array.from(supportThreads.values()));
      fs.writeFileSync(SUPPORT_STORE_PATH, data, 'utf-8');
    } catch {
      // Ignore transient tmp write failures
    }
  }, 150);
}

function getOrCreateSupportThread(
  orderId: string,
  meta?: SupportOrderMetaInput
): SupportThreadRecord {
  const existing = supportThreads.get(orderId);
  const validStatus =
    meta?.orderStatus &&
    ['received', 'preparing', 'on_the_way', 'delivered'].includes(meta.orderStatus)
      ? meta.orderStatus
      : undefined;

  if (existing) {
    if (meta?.restaurantName) {
      const cleaned = sanitizeChatString(meta.restaurantName, 80);
      if (cleaned) existing.restaurantName = cleaned;
    }
    if (meta?.courierName) {
      const cleaned = sanitizeChatString(meta.courierName, 60);
      if (cleaned) existing.courierName = cleaned;
    }
    if (meta?.customerName) {
      const cleaned = sanitizeChatString(meta.customerName, 80);
      if (cleaned) existing.customerName = cleaned;
    }
    if (meta?.cityName) {
      const cleaned = sanitizeChatString(meta.cityName, 60);
      if (cleaned) existing.cityName = cleaned;
    }
    if (meta?.neighborhood) {
      const cleaned = sanitizeChatString(meta.neighborhood, 60);
      if (cleaned) existing.neighborhood = cleaned;
    }
    if (validStatus) {
      existing.orderStatus = validStatus;
    }
    return existing;
  }

  const created: SupportThreadRecord = {
    orderId,
    restaurantName: sanitizeChatString(meta?.restaurantName, 80) || 'Sofra Atlas Mutfağı',
    courierName: sanitizeChatString(meta?.courierName, 60) || 'Teslimat Kuryesi',
    customerName: sanitizeChatString(meta?.customerName, 80) || 'Müşteri',
    cityName: sanitizeChatString(meta?.cityName, 60) || 'İstanbul',
    neighborhood: sanitizeChatString(meta?.neighborhood, 60) || 'Merkez',
    orderStatus: validStatus ?? 'received',
    lastMessageAt: new Date().toISOString(),
    unreadForCustomer: 0,
    unreadForStaff: 0,
    messages: [],
  };
  supportThreads.set(orderId, created);
  schedulePersistSupportThreads();
  return created;
}

function listSortedSupportThreads(): SupportThreadRecord[] {
  return Array.from(supportThreads.values()).sort((a, b) =>
    b.lastMessageAt.localeCompare(a.lastMessageAt)
  );
}

function sendWsJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToOrderAndInbox(
  orderId: string,
  payload: unknown,
  excludeSocket?: WebSocket
) {
  const room = orderRooms.get(orderId);
  if (room) {
    for (const client of room) {
      if (client !== excludeSocket) {
        sendWsJson(client, payload);
      }
    }
  }
  for (const client of inboxClients) {
    if (client !== excludeSocket) {
      sendWsJson(client, payload);
    }
  }
}

function commitSupportMessage(input: {
  orderId: string;
  channel: SupportChatChannel;
  senderRole: SupportSenderRole;
  senderName: string;
  text: string;
  clientMessageId?: string;
  orderMeta?: SupportOrderMetaInput;
}): { ok: true; message: SupportChatMessage; thread: SupportThreadRecord; duplicate: boolean } | { ok: false; error: string } {
  const orderId = normalizeOrderId(input.orderId);
  if (!orderId) {
    return { ok: false, error: 'Geçerli bir sipariş numarası gereklidir.' };
  }

  const channel: SupportChatChannel =
    input.channel === 'courier' ? 'courier' : 'restaurant';
  const senderRole: SupportSenderRole =
    input.senderRole === 'restaurant' || input.senderRole === 'courier'
      ? input.senderRole
      : 'customer';
  const text = sanitizeChatString(input.text, 500);
  if (!text) {
    return { ok: false, error: 'Mesaj içeriği boş olamaz.' };
  }

  const thread = getOrCreateSupportThread(orderId, input.orderMeta);
  const clientMessageId = sanitizeChatString(input.clientMessageId, 64) || undefined;

  if (clientMessageId) {
    const duplicateMsg = thread.messages.find(
      (m) => m.clientMessageId === clientMessageId
    );
    if (duplicateMsg) {
      return { ok: true, message: duplicateMsg, thread, duplicate: true };
    }
  }

  const defaultSenderName =
    senderRole === 'customer'
      ? thread.customerName
      : senderRole === 'courier'
        ? thread.courierName
        : thread.restaurantName;

  const message: SupportChatMessage = {
    id: generateId('MSG'),
    clientMessageId,
    orderId,
    channel,
    senderRole,
    senderName: sanitizeChatString(input.senderName, 60) || defaultSenderName,
    text,
    createdAt: new Date().toISOString(),
  };

  thread.messages.push(message);
  if (thread.messages.length > 250) {
    thread.messages = thread.messages.slice(-250);
  }
  thread.lastMessageAt = message.createdAt;
  if (senderRole === 'customer') {
    thread.unreadForStaff += 1;
  } else {
    thread.unreadForCustomer += 1;
  }

  schedulePersistSupportThreads();
  return { ok: true, message, thread, duplicate: false };
}

loadSupportThreadsFromDisk();

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '256kb' }));

  const supportWss = new WebSocketServer({ noServer: true });
  const wsAliveMap = new WeakMap<WebSocket, boolean>();

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const reqUrl = new URL(request.url ?? '/', 'http://localhost');
      if (reqUrl.pathname !== '/ws/support') {
        socket.destroy();
        return;
      }

      supportWss.handleUpgrade(request, socket, head, (ws) => {
        const scope = reqUrl.searchParams.get('scope');
        const orderId = normalizeOrderId(reqUrl.searchParams.get('orderId'));
        wsAliveMap.set(ws, true);

        ws.on('pong', () => {
          wsAliveMap.set(ws, true);
        });

        if (scope === 'inbox') {
          inboxClients.add(ws);
          sendWsJson(ws, {
            type: 'inbox:snapshot',
            threads: listSortedSupportThreads(),
          });
        } else if (orderId) {
          let room = orderRooms.get(orderId);
          if (!room) {
            room = new Set<WebSocket>();
            orderRooms.set(orderId, room);
          }
          room.add(ws);
          const thread = getOrCreateSupportThread(orderId);
          sendWsJson(ws, {
            type: 'thread:snapshot',
            thread,
          });
        }

        ws.on('message', (raw) => {
          try {
            const event = JSON.parse(String(raw)) as {
              type?: string;
              orderId?: string;
              channel?: SupportChatChannel;
              senderRole?: SupportSenderRole;
              senderName?: string;
              text?: string;
              clientMessageId?: string;
              orderMeta?: SupportOrderMetaInput;
              readerRole?: 'customer' | 'staff';
              isTyping?: boolean;
            };

            if (event.type === 'ping') {
              sendWsJson(ws, { type: 'pong', ts: Date.now() });
              return;
            }

            const targetOrderId = normalizeOrderId(event.orderId ?? orderId);
            if (!targetOrderId) return;

            if (event.type === 'thread:read') {
              const thread = getOrCreateSupportThread(targetOrderId, event.orderMeta);
              if (event.readerRole === 'staff') {
                thread.unreadForStaff = 0;
              } else {
                thread.unreadForCustomer = 0;
              }
              schedulePersistSupportThreads();
              broadcastToOrderAndInbox(targetOrderId, {
                type: 'thread:updated',
                orderId: targetOrderId,
                thread,
              });
              return;
            }

            if (event.type === 'typing') {
              broadcastToOrderAndInbox(
                targetOrderId,
                {
                  type: 'typing',
                  orderId: targetOrderId,
                  channel: event.channel === 'courier' ? 'courier' : 'restaurant',
                  senderRole:
                    event.senderRole === 'restaurant' || event.senderRole === 'courier'
                      ? event.senderRole
                      : 'customer',
                  senderName: sanitizeChatString(event.senderName, 60),
                  isTyping: Boolean(event.isTyping),
                },
                ws
              );
              return;
            }

            if (event.type === 'message:send') {
              const result = commitSupportMessage({
                orderId: targetOrderId,
                channel: event.channel ?? 'restaurant',
                senderRole: event.senderRole ?? 'customer',
                senderName: event.senderName ?? '',
                text: event.text ?? '',
                clientMessageId: event.clientMessageId,
                orderMeta: event.orderMeta,
              });

              if (!result.ok) {
                sendWsJson(ws, { type: 'error', error: result.error });
                return;
              }

              if (result.duplicate) {
                sendWsJson(ws, {
                  type: 'message:ack',
                  orderId: targetOrderId,
                  message: result.message,
                  thread: result.thread,
                });
                return;
              }

              broadcastToOrderAndInbox(targetOrderId, {
                type: 'message:new',
                orderId: targetOrderId,
                message: result.message,
                thread: result.thread,
              });
            }
          } catch {
            // Ignore malformed client payloads
          }
        });

        ws.on('close', () => {
          inboxClients.delete(ws);
          if (orderId) {
            const room = orderRooms.get(orderId);
            if (room) {
              room.delete(ws);
              if (room.size === 0) orderRooms.delete(orderId);
            }
          }
        });
      });
    } catch {
      socket.destroy();
    }
  });

  const wsPingInterval = setInterval(() => {
    for (const client of supportWss.clients) {
      if (wsAliveMap.get(client) === false) {
        client.terminate();
        continue;
      }
      wsAliveMap.set(client, false);
      client.ping();
    }
  }, 25000);

  httpServer.on('close', () => {
    clearInterval(wsPingInterval);
  });

  app.get('/api/support-chats', (_req, res) => {
    res.json({ threads: listSortedSupportThreads() });
  });

  app.get('/api/support-chats/:orderId', (req, res) => {
    const orderId = normalizeOrderId(req.params.orderId);
    if (!orderId) {
      res.status(400).json({ error: 'Geçersiz sipariş numarası.' });
      return;
    }
    const thread = getOrCreateSupportThread(orderId);
    res.json({ thread });
  });

  app.post('/api/support-chats/:orderId/register', (req, res) => {
    const orderId = normalizeOrderId(req.params.orderId);
    if (!orderId) {
      res.status(400).json({ error: 'Geçersiz sipariş numarası.' });
      return;
    }
    const meta = (req.body ?? {}) as SupportOrderMetaInput;
    const thread = getOrCreateSupportThread(orderId, meta);
    schedulePersistSupportThreads();
    broadcastToOrderAndInbox(orderId, {
      type: 'thread:updated',
      orderId,
      thread,
    });
    res.json({ thread });
  });

  app.post('/api/support-chats/:orderId/messages', (req, res) => {
    const orderId = normalizeOrderId(req.params.orderId);
    const body = (req.body ?? {}) as {
      channel?: SupportChatChannel;
      senderRole?: SupportSenderRole;
      senderName?: string;
      text?: string;
      clientMessageId?: string;
      orderMeta?: SupportOrderMetaInput;
    };

    const result = commitSupportMessage({
      orderId,
      channel: body.channel ?? 'restaurant',
      senderRole: body.senderRole ?? 'customer',
      senderName: body.senderName ?? '',
      text: body.text ?? '',
      clientMessageId: body.clientMessageId,
      orderMeta: body.orderMeta,
    });

    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }

    if (!result.duplicate) {
      broadcastToOrderAndInbox(orderId, {
        type: 'message:new',
        orderId,
        message: result.message,
        thread: result.thread,
      });
    }

    res.json({
      message: result.message,
      thread: result.thread,
      duplicate: result.duplicate,
    });
  });

  app.post('/api/support-chats/:orderId/read', (req, res) => {
    const orderId = normalizeOrderId(req.params.orderId);
    if (!orderId) {
      res.status(400).json({ error: 'Geçersiz sipariş numarası.' });
      return;
    }
    const body = (req.body ?? {}) as { readerRole?: 'customer' | 'staff' };
    const thread = getOrCreateSupportThread(orderId);
    if (body.readerRole === 'staff') {
      thread.unreadForStaff = 0;
    } else {
      thread.unreadForCustomer = 0;
    }
    schedulePersistSupportThreads();
    broadcastToOrderAndInbox(orderId, {
      type: 'thread:updated',
      orderId,
      thread,
    });
    res.json({ thread });
  });

  app.get('/robots.txt', (req, res) => {
    const origin = resolvePublicOrigin(req);
    res.type('text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        `Sitemap: ${origin}/sitemap.xml`,
        '',
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const origin = resolvePublicOrigin(req);
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${origin}/`, priority: '1.0', changefreq: 'daily' },
      ...ALL_COUNTRY_HUBS.map((hub) => ({
        loc: `${origin}/?sehir=${encodeURIComponent(hub.id)}`,
        priority: '0.8',
        changefreq: 'weekly',
      })),
    ];

    const body = urls
      .map(
        (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
      )
      .join('\n');

    res.type('application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`);
  });

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
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript');
      res.setHeader('Cache-Control', 'no-store');
      res.send(`
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if (typeof document !== 'undefined') {
  document.querySelectorAll('style[data-vite-dev-id]').forEach((el) => {
    sheetsMap.set(el.getAttribute('data-vite-dev-id'), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute('data-vite-dev-id'), el);
  });
}
let lastInsertedStyle;
const cspNonce =
  typeof document !== 'undefined'
    ? document.querySelector('meta[property=csp-nonce]')?.nonce
    : undefined;

export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    if (cspNonce) style.setAttribute('nonce', cspNonce);
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => {
        lastInsertedStyle = undefined;
      }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement('afterend', style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}

export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document
      .querySelectorAll('link[rel="stylesheet"][data-vite-dev-id="' + CSS.escape(id) + '"]')
      .forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}

export function createHotContext() {
  const data = {};
  const noop = () => {};
  return {
    data,
    accept: noop,
    acceptExports: noop,
    dispose: noop,
    prune: noop,
    decline: noop,
    invalidate: noop,
    on: noop,
    off: noop,
    send: noop,
  };
}

export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}

export class ErrorOverlay {
  constructor() {}
}
`);
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      try {
        let html = fs.readFileSync(indexPath, 'utf-8');
        const origin = resolvePublicOrigin(req);
        const canonical = `${origin}${req.path === '/' ? '/' : req.path}`;
        const verification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
        const extraTags = [
          `<link rel="canonical" href="${escapeHtmlAttr(canonical)}" />`,
          `<meta property="og:url" content="${escapeHtmlAttr(canonical)}" />`,
          verification
            ? `<meta name="google-site-verification" content="${escapeHtmlAttr(verification)}" />`
            : '',
        ]
          .filter(Boolean)
          .join('\n    ');
        html = html
          .replace(/content="\/og-cover\.jpg"/g, `content="${escapeHtmlAttr(origin)}/og-cover.jpg"`)
          .replace('</head>', `    ${extraTags}\n  </head>`);
        res.type('text/html; charset=utf-8').send(html);
      } catch {
        res.sendFile(indexPath);
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Sofra Atlas server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
