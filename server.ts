import 'dotenv/config';
import express from 'express';
import { execFile } from 'node:child_process';
import dns from 'node:dns/promises';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { WebSocketServer, type WebSocket } from 'ws';
import { ALL_COUNTRY_HUBS } from './src/data/countries.ts';

const execFileAsync = promisify(execFile);

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
  cityId?: string;
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
  cityId?: string;
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
    if (meta?.cityId) {
      const cleaned = sanitizeChatString(meta.cityId, 32);
      if (cleaned) existing.cityId = cleaned;
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

  const cleanCityId = sanitizeChatString(meta?.cityId, 32);
  const created: SupportThreadRecord = {
    orderId,
    restaurantName: sanitizeChatString(meta?.restaurantName, 80) || 'atlassofra Mutfağı',
    courierName: sanitizeChatString(meta?.courierName, 60) || 'Teslimat Kuryesi',
    customerName: sanitizeChatString(meta?.customerName, 80) || 'Müşteri',
    ...(cleanCityId ? { cityId: cleanCityId } : {}),
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

const CLOUD_RUN_ANYCAST_IPV4 = [
  '216.239.32.21',
  '216.239.34.21',
  '216.239.36.21',
  '216.239.38.21',
];

function sanitizeHostname(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    ?.split(':')[0]
    ?.replace(/\.$/, '') ?? '';
  if (
    cleaned.length < 3 ||
    cleaned.length > 253 ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
      cleaned
    )
  ) {
    return '';
  }
  return cleaned;
}

interface TlsInspectionResult {
  host: string;
  reachable: boolean;
  authorized: boolean;
  authorizationError: string | null;
  protocol: string | null;
  cipher: string | null;
  subject: string | null;
  issuer: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  serialNumber: string | null;
  fingerprint256: string | null;
  subjectAltNames: string[];
  error: string | null;
}

async function inspectTlsCertificate(host: string): Promise<TlsInspectionResult> {
  return new Promise((resolve) => {
    let settled = false;
    const socket = tls.connect({
      host,
      port: 443,
      servername: host,
      rejectUnauthorized: false,
      timeout: 4500,
    });

    const finish = (result: TlsInspectionResult) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        // Ignore cleanup errors
      }
      resolve(result);
    };

    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate(true);
      const validFrom = cert?.valid_from ? new Date(cert.valid_from) : null;
      const validTo = cert?.valid_to ? new Date(cert.valid_to) : null;
      const daysRemaining =
        validTo && !Number.isNaN(validTo.getTime())
          ? Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

      const sanRaw = typeof cert?.subjectaltname === 'string' ? cert.subjectaltname : '';
      const subjectAltNames = sanRaw
        .split(',')
        .map((item) => item.trim().replace(/^DNS:/i, ''))
        .filter(Boolean);

      const subjectLabel =
        cert?.subject?.CN ||
        (cert?.subject ? Object.values(cert.subject).join(', ') : null);
      const issuerLabel =
        [cert?.issuer?.O, cert?.issuer?.CN].filter(Boolean).join(' · ') || null;

      const cipherInfo = socket.getCipher();
      finish({
        host,
        reachable: true,
        authorized: socket.authorized,
        authorizationError: socket.authorizationError
          ? String(socket.authorizationError)
          : null,
        protocol: socket.getProtocol() ?? null,
        cipher: cipherInfo?.name ?? null,
        subject: subjectLabel,
        issuer: issuerLabel,
        validFrom: validFrom && !Number.isNaN(validFrom.getTime()) ? validFrom.toISOString() : null,
        validTo: validTo && !Number.isNaN(validTo.getTime()) ? validTo.toISOString() : null,
        daysRemaining,
        serialNumber: cert?.serialNumber ?? null,
        fingerprint256: cert?.fingerprint256 ?? null,
        subjectAltNames,
        error: null,
      });
    });

    socket.once('timeout', () => {
      finish({
        host,
        reachable: false,
        authorized: false,
        authorizationError: null,
        protocol: null,
        cipher: null,
        subject: null,
        issuer: null,
        validFrom: null,
        validTo: null,
        daysRemaining: null,
        serialNumber: null,
        fingerprint256: null,
        subjectAltNames: [],
        error: 'TLS el sıkışması zaman aşımına uğradı (443 portu yanıt vermedi).',
      });
    });

    socket.once('error', (err) => {
      finish({
        host,
        reachable: false,
        authorized: false,
        authorizationError: null,
        protocol: null,
        cipher: null,
        subject: null,
        issuer: null,
        validFrom: null,
        validTo: null,
        daysRemaining: null,
        serialNumber: null,
        fingerprint256: null,
        subjectAltNames: [],
        error: err.message,
      });
    });
  });
}

async function inspectDnsRecords(domain: string) {
  const resolver = new dns.Resolver();
  const [aRes, aaaaRes, wwwCnameRes, caaRes, txtRes] = await Promise.allSettled([
    resolver.resolve4(domain),
    resolver.resolve6(domain),
    resolver.resolveCname(`www.${domain}`),
    resolver.resolveCaa(domain),
    resolver.resolveTxt(domain),
  ]);

  const aRecords = aRes.status === 'fulfilled' ? aRes.value : [];
  const aaaaRecords = aaaaRes.status === 'fulfilled' ? aaaaRes.value : [];
  const wwwCname = wwwCnameRes.status === 'fulfilled' ? wwwCnameRes.value : [];
  const caaRecords =
    caaRes.status === 'fulfilled'
      ? caaRes.value.map((r) => `${r.critical} ${r.issue ? `issue "${r.issue}"` : r.issuewild ? `issuewild "${r.issuewild}"` : ''}`.trim())
      : [];
  const txtRecords =
    txtRes.status === 'fulfilled' ? txtRes.value.map((parts) => parts.join('')) : [];

  const pointsToCloudRun = aRecords.some((ip) => CLOUD_RUN_ANYCAST_IPV4.includes(ip));
  const wwwPointsToGoogle = wwwCname.some((c) =>
    c.toLowerCase().replace(/\.$/, '').endsWith('ghs.googlehosted.com')
  );
  const caaAllowsGoogleOrLetsEncrypt =
    caaRecords.length === 0 ||
    caaRecords.some(
      (c) => c.includes('pki.goog') || c.includes('letsencrypt.org')
    );

  return {
    domain,
    aRecords,
    aaaaRecords,
    wwwCname,
    caaRecords,
    txtRecords,
    checks: {
      hasApexA: aRecords.length > 0,
      pointsToCloudRun,
      wwwPointsToGoogle,
      caaAllowsSsl: caaAllowsGoogleOrLetsEncrypt,
    },
  };
}

function buildZoneFileContent(domain: string): string {
  const safeDomain = sanitizeHostname(domain) || 'atlassofra.com.tr';
  return `; RFC 1035 / BIND DNS Zone File — ${safeDomain}
$ORIGIN ${safeDomain}.
$TTL 3600

; Kök Alan Adı (Google Cloud Run Anycast IPv4 A Kayıtları)
@   IN  A       216.239.32.21
@   IN  A       216.239.34.21
@   IN  A       216.239.36.21
@   IN  A       216.239.38.21

; Kök Alan Adı (Google Cloud Run Anycast IPv6 AAAA Kayıtları)
@   IN  AAAA    2001:4860:4802:32::15
@   IN  AAAA    2001:4860:4802:34::15
@   IN  AAAA    2001:4860:4802:36::15
@   IN  AAAA    2001:4860:4802:38::15

; Alt Alan Adı (www -> Google Managed SSL & Hosting CNAME)
www IN  CNAME   ghs.googlehosted.com.

; CAA Kayıtları (Google Managed SSL ve Let's Encrypt sertifika üretimi için)
@   IN  CAA     0 issue "pki.goog"
@   IN  CAA     0 issue "letsencrypt.org"
@   IN  CAA     0 issuewild "pki.goog"

; Google Search Console / Cloud Run / Firebase Alan Adı Sahiplik Doğrulaması
; @   IN  TXT     "google-site-verification=DOGRULAMA_KODU_BURAYA"
`;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  const sslCertPath = process.env.SSL_CERT_PATH?.trim();
  const sslKeyPath = process.env.SSL_KEY_PATH?.trim();
  let nativeTlsEnabled = false;
  let httpServer: http.Server | https.Server;

  if (
    sslCertPath &&
    sslKeyPath &&
    fs.existsSync(sslCertPath) &&
    fs.existsSync(sslKeyPath)
  ) {
    httpServer = https.createServer(
      {
        cert: fs.readFileSync(sslCertPath),
        key: fs.readFileSync(sslKeyPath),
      },
      app
    );
    nativeTlsEnabled = true;
  } else {
    httpServer = http.createServer(app);
  }

  app.use(express.json({ limit: '256kb' }));

  const canonicalCustomDomain = (process.env.CUSTOM_DOMAIN || 'atlassofra.com.tr')
    .trim()
    .toLowerCase();

  app.use((req, res, next) => {
    const forwardedProto = String(req.headers['x-forwarded-proto'] ?? '')
      .split(',')[0]
      ?.trim()
      .toLowerCase();
    const isHttpsRequest =
      req.secure || forwardedProto === 'https' || nativeTlsEnabled;

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(self), camera=(), microphone=()'
    );
    if (isHttpsRequest || isProduction) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    if (isProduction) {
      const forwardedHost = String(
        req.headers['x-forwarded-host'] ?? req.headers.host ?? ''
      )
        .split(',')[0]
        ?.trim()
        .toLowerCase()
        .replace(/:\d+$/, '');

      const isAcmeChallenge = req.path.startsWith('/.well-known/');

      if (canonicalCustomDomain && forwardedHost === `www.${canonicalCustomDomain}`) {
        res.redirect(301, `https://${canonicalCustomDomain}${req.originalUrl || '/'}`);
        return;
      }

      if (!isAcmeChallenge && forwardedProto === 'http' && forwardedHost) {
        res.redirect(301, `https://${forwardedHost}${req.originalUrl || '/'}`);
        return;
      }
    }

    next();
  });

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
      `atlassofra — ${body.restaurantName ?? 'Sipariş'}`
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

  app.get('/api/ssl/status', async (req, res) => {
    const requestedDomain = sanitizeHostname(req.query.domain);
    const targetDomain =
      requestedDomain || sanitizeHostname(canonicalCustomDomain) || 'atlassofra.com.tr';

    const requestHostRaw = String(
      req.headers['x-forwarded-host'] ?? req.get('host') ?? ''
    )
      .split(',')[0]
      ?.trim()
      .toLowerCase()
      .split(':')[0] ?? '';
    const activeHost = sanitizeHostname(requestHostRaw);

    const forwardedProto = String(req.headers['x-forwarded-proto'] ?? '')
      .split(',')[0]
      ?.trim()
      .toLowerCase();
    const requestIsHttps =
      req.secure || forwardedProto === 'https' || nativeTlsEnabled;

    const [dnsReport, domainTls, activeHostTls] = await Promise.all([
      inspectDnsRecords(targetDomain),
      inspectTlsCertificate(targetDomain),
      activeHost && activeHost !== targetDomain
        ? inspectTlsCertificate(activeHost)
        : Promise.resolve(null),
    ]);

    res.json({
      checkedAt: new Date().toISOString(),
      targetDomain,
      activeOrigin: resolvePublicOrigin(req),
      requestIsHttps,
      nativeTlsEnabled,
      hstsEnabled: requestIsHttps || isProduction,
      dns: dnsReport,
      domainTls,
      activeHostTls,
    });
  });

  app.get('/api/ssl/zone', (req, res) => {
    const requestedDomain = sanitizeHostname(req.query.domain) || canonicalCustomDomain;
    res.type('text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${requestedDomain}.zone"`
    );
    res.send(buildZoneFileContent(requestedDomain));
  });

  app.post('/api/ssl/generate', async (req, res) => {
    const body = (req.body ?? {}) as {
      domain?: string;
      mode?: 'self_signed' | 'csr';
      organization?: string;
      country?: string;
      validityDays?: number;
    };

    const domain = sanitizeHostname(body.domain) || sanitizeHostname(canonicalCustomDomain) || 'atlassofra.com.tr';
    const mode = body.mode === 'csr' ? 'csr' : 'self_signed';
    const organization =
      (body.organization ?? 'atlassofra')
        .replace(/[^a-zA-Z0-9 ._-]/g, '')
        .trim()
        .slice(0, 64) || 'atlassofra';
    const country =
      (body.country ?? 'TR')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 2) || 'TR';
    const validityDays = Math.min(
      825,
      Math.max(30, Math.round(Number(body.validityDays ?? 365) || 365))
    );

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sofra-ssl-'));
    const keyPath = path.join(tmpDir, 'privkey.pem');
    const outPath = path.join(tmpDir, mode === 'csr' ? 'request.csr.pem' : 'fullchain.pem');
    const cnfPath = path.join(tmpDir, 'openssl.cnf');

    try {
      const opensslConfig = `[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
${mode === 'csr' ? 'req_extensions = v3_ext' : 'x509_extensions = v3_ext'}

[dn]
C = ${country}
O = ${organization}
CN = ${domain}

[v3_ext]
subjectAltName = @alt_names
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = ${domain}
DNS.2 = www.${domain}
`;
      fs.writeFileSync(cnfPath, opensslConfig, 'utf-8');

      if (mode === 'csr') {
        await execFileAsync('openssl', [
          'req',
          '-new',
          '-newkey',
          'rsa:2048',
          '-nodes',
          '-keyout',
          keyPath,
          '-out',
          outPath,
          '-config',
          cnfPath,
        ]);
      } else {
        await execFileAsync('openssl', [
          'req',
          '-x509',
          '-newkey',
          'rsa:2048',
          '-nodes',
          '-sha256',
          '-days',
          String(validityDays),
          '-keyout',
          keyPath,
          '-out',
          outPath,
          '-config',
          cnfPath,
        ]);
      }

      const privateKeyPem = fs.readFileSync(keyPath, 'utf-8');
      const primaryPem = fs.readFileSync(outPath, 'utf-8');

      let fingerprint256 = '';
      let validTo = '';
      if (mode === 'self_signed') {
        const { stdout: x509Info } = await execFileAsync('openssl', [
          'x509',
          '-in',
          outPath,
          '-noout',
          '-fingerprint',
          '-sha256',
          '-enddate',
        ]);
        const fpMatch = /Fingerprint=([^\r\n]+)/i.exec(x509Info);
        const endMatch = /notAfter=([^\r\n]+)/i.exec(x509Info);
        fingerprint256 = fpMatch?.[1]?.trim() ?? '';
        validTo = endMatch?.[1]?.trim() ?? '';
      }

      res.json({
        ok: true,
        mode,
        domain,
        san: [domain, `www.${domain}`],
        validityDays: mode === 'self_signed' ? validityDays : null,
        fingerprint256,
        validTo,
        primaryPem,
        privateKeyPem,
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? `SSL anahtar/sertifika üretimi başarısız: ${error.message}`
            : 'SSL üretimi sırasında beklenmeyen bir hata oluştu.',
      });
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore temp dir cleanup errors
      }
    }
  });

  app.get('/api/system/health', (req, res) => {
    const mem = process.memoryUsage();
    const forwardedProto = String(req.headers['x-forwarded-proto'] ?? '')
      .split(',')[0]
      ?.trim()
      .toLowerCase();
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      environment: isProduction ? 'production' : 'development',
      canonicalCustomDomain,
      requestProtocol:
        req.secure || forwardedProto === 'https' || nativeTlsEnabled
          ? 'https'
          : 'http',
      nativeTlsEnabled,
      memoryMb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      },
      activeSupportThreads: supportThreads.size,
      activePaymentSessions: paymentSessions.size,
      activeWsClients: supportWss.clients.size,
    });
  });

  app.post('/api/system/reset', (_req, res) => {
    const clearedPaymentSessions = paymentSessions.size;
    const clearedSupportThreads = supportThreads.size;

    paymentSessions.clear();
    supportThreads.clear();
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    try {
      if (fs.existsSync(SUPPORT_STORE_PATH)) {
        fs.unlinkSync(SUPPORT_STORE_PATH);
      }
    } catch {
      // Ignore unlink errors
    }

    for (const client of inboxClients) {
      sendWsJson(client, { type: 'inbox:snapshot', threads: [] });
    }

    res.json({
      ok: true,
      clearedAt: new Date().toISOString(),
      clearedPaymentSessions,
      clearedSupportThreads,
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
          .replace(/<link rel="canonical"[^>]*>\s*/gi, '')
          .replace(/<meta property="og:url"[^>]*>\s*/gi, '')
          .replace(/content="\/og-cover\.jpg"/g, `content="${escapeHtmlAttr(origin)}/og-cover.jpg"`)
          .replace('</head>', `    ${extraTags}\n  </head>`);
        res.type('text/html; charset=utf-8').send(html);
      } catch {
        res.sendFile(indexPath);
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`atlassofra server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
